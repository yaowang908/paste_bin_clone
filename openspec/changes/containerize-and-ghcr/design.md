## Context

The app is a Vite-built React SPA served by a Hono server on Bun (`bun run server.ts`, port 3000). Persistence is a single SQLite file. Today it deploys via SSH → `git pull` → `npm install && npm run build` → `pm2 restart` on a 1 GB DigitalOcean droplet, and the DB lives at `process.cwd()/src/db/database.sqlite` — inside the project tree.

Two facts established during exploration drive this design:

1. **The native node `sqlite3` driver panics Bun.** Running the current `src/db/index.js` under Bun 1.3.3 returns query results but then crashes with `NAPI FATAL ERROR: Error::New napi_create_error`. `bun:sqlite` (already imported but unused in `server.ts`) reads the same DB file cleanly.
2. **Nothing initializes the schema at startup.** `src/db/init.js` creates the `pastes` table but is a standalone script `server.ts` never calls, and the `.sqlite` file is gitignored — a fresh volume would have no table.

The frontend build graph (`index.html → src/main.tsx`) never imports `server.ts`/`src/db`, so server-side changes cannot break the Cloudflare Pages PR check.

## Goals / Non-Goals

**Goals:**
- Reproducible image published to GHCR, pulled by the droplet.
- SQLite state on a mounted volume, durable across deploys.
- Fix the `bun:sqlite` NAPI crash and the schema-init gap as part of enabling the above.
- No long-lived secrets between CI and the droplet.
- Catch image/server build breakage on PRs.

**Non-Goals:**
- Droplet provisioning, Caddy/TLS, and the actual cutover (companion handover doc).
- Making Cloudflare Pages previews functional end-to-end (previews have no backend; `/api/*` 404s there — pre-existing, out of scope).
- Reconciling the two frontend build paths (Cloudflare `npm run build` vs Docker `bun run build`).
- Any change to the paste data model or public API.

## Decisions

### Decision: Switch the SQLite driver to `bun:sqlite` (not keep node-sqlite3)
`bun:sqlite` is synchronous and Bun-native, so the promise/callback wrappers (`dbRun`/`dbGet`) collapse into direct calls, `src/db/index.js` becomes a small module that opens `new Database(path)` and runs the `CREATE TABLE` from `schema.sql`, and `src/db/init.js` is deleted.

**Alternatives considered:**
- *Keep node-sqlite3 on a glibc base (`oven/bun:1` debian):* ships a driver that already NAPI-panics under Bun and keeps a native module needing a compile toolchain on musl. Rejected — it containerizes a latent crash.
- *better-sqlite3:* still a native module, no advantage over `bun:sqlite` here.

### Decision: `DATA_DIR` env var, default local, `/app/data` in container
DB path becomes `${DATA_DIR}/pastes.db`. Default to a repo-local dir (e.g. `./data`) for dev so nothing breaks outside Docker; the container sets `DATA_DIR=/app/data` and mounts a named volume there. App creates `DATA_DIR` at startup if missing. `data/` added to `.gitignore`.

### Decision: `oven/bun` alpine multi-stage image
Because `bun:sqlite` removes the only native dependency, a small alpine image works with no build toolchain. Stages: (1) install deps from `bun.lock`; (2) `bun run build` → `dist`; (3) runner copying `dist`, `server.ts`, `src/db/schema.sql`, and production deps, running as a non-root user. The exact non-root uid must be read from the chosen `oven/bun` tag and reused in the droplet `chown` — a mismatch means the container can't write the DB (silent 500s). Bun binds `0.0.0.0` by default, so no `HOSTNAME` override is needed.

### Decision: Public GHCR package, `GITHUB_TOKEN` only
Publish with the built-in `GITHUB_TOKEN` + `packages: write`; set the package public after first push. Result: no pull credentials on the droplet and no SSH secret in CI — zero long-lived secrets either direction. Requires verifying no secret is baked into the image (`.dockerignore` excludes `.env*`; no sensitive `NEXT_PUBLIC_*`-style vars exist).

### Decision: Droplet pulls; repo does not push to droplet
Workflow is build+push only. Droplet-side pull/restart via **Watchtower** (recommended, polls + recreates + prunes) or a cron `docker compose pull && up -d` fallback. Trade-off: auto-deploy of every green `:latest` with poll latency and no manual gate — acceptable for this app; documented so it's a conscious choice.

### Decision: Add a PR docker-build job (`push: false`)
Cloudflare validates only the frontend; nothing else would validate the Dockerfile/server until post-merge. A PR-triggered build-only job closes that gap without registry writes or secrets.

## Risks / Trade-offs

- **Container-user uid mismatch on the migrated volume** → seeded DB owned by root, app can't write. Mitigation: `chown -R <uid>:<uid>` the volume after copying, using the uid confirmed from the image.
- **`bun:sqlite` behavioral differences** (synchronous, parameter binding, types) vs the old async driver → subtle query bugs. Mitigation: exercise all three endpoints against the real DB before cutover; specs pin read/create/update scenarios.
- **Auto-deploy of a bad `:latest`** → prod breakage with no gate. Mitigation: `:<sha>` rollback tag; pin image to last-good SHA and `up -d`; volume is untouched so data is safe.
- **npm-vs-bun frontend build drift** (no `package-lock.json`) → Cloudflare and Docker could theoretically build different bundles. Accepted; out of scope, flagged.
- **1 GB RAM** running app + watchtower + Caddy → tight. Mitigation: build happens in CI not on the droplet; confirm a swapfile exists.

## Migration Plan

Repo side (this change):
1. Refactor DB layer to `bun:sqlite` + `DATA_DIR` + startup schema init; verify all three endpoints locally with `DATA_DIR=/tmp/pb-test`.
2. Add `Dockerfile` + `.dockerignore`; verify a full local container run with a volume (create paste → restart → data persists → rebuild image → data persists).
3. Add GHCR publish workflow + PR build job; delete `nextDeploy.js.yml`.
4. Merge; confirm first image pushed, package set public, and pullable from the droplet.

Droplet side (companion doc — summary): install Docker + compose; write `compose.yml` (app on `127.0.0.1:3000`, `pastebin_data` volume at `DATA_DIR`, Watchtower or cron); `pm2 stop` old app; copy live `database.sqlite` → `pastebin_data:/…/pastes.db`; `chown` to the container uid; `docker compose up -d`; verify old data reads + new writes; point Caddy at `127.0.0.1:3000`; `pm2 delete` old app.

**Rollback:** pin `compose.yml` image to a known-good `:<sha>` and `docker compose up -d`; volume/data unaffected.

## Open Questions

- ~~Exact non-root uid of the chosen `oven/bun` image tag~~ **RESOLVED**: `oven/bun:1-alpine` ships user `bun` at **uid 1000, gid 1000**. Droplet `chown -R 1000:1000` (or `bun:bun`).
- ~~Read `src/db/schema.sql` at runtime vs inline the DDL~~ **RESOLVED**: read `schema.sql` at runtime, resolved via `import.meta.dir` (not cwd), so it works in the container where cwd differs. `schema.sql` is copied into the image alongside `index.js`.
- Watchtower vs cron for the droplet trigger (leaning Watchtower) — finalized in the companion doc.
