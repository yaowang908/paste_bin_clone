## 1. SQLite refactor (enabling change)

- [x] 1.1 Add a `DATA_DIR` env var: default to a repo-local dir (e.g. `./data`) for dev, resolve the DB path as `${DATA_DIR}/pastes.db`, and create the directory at startup if missing
- [x] 1.2 Rewrite `src/db/index.js` to open the database with `bun:sqlite` (`new Database(path)`) instead of the native `sqlite3` package
- [x] 1.3 Run `CREATE TABLE IF NOT EXISTS pastes ...` (from `src/db/schema.sql`) when the connection opens, so a fresh `DATA_DIR` self-initializes; delete the now-redundant `src/db/init.js`
- [x] 1.4 Update `server.ts`: use the `bun:sqlite` connection, replace `dbRun`/`dbGet` callback wrappers with direct synchronous `bun:sqlite` calls, and remove the dead unused import
- [x] 1.5 Add `data/` to `.gitignore`; remove the runtime dependency on the native `sqlite3` package
- [x] 1.6 Verify locally with `DATA_DIR=/tmp/pb-test`: create a paste, confirm `pastes.db` lands in `/tmp/pb-test`, restart, confirm the paste survives, and confirm no NAPI panic on GET/POST/PUT

## 2. Dockerfile and image

- [x] 2.1 Add a multi-stage `Dockerfile` (`oven/bun` alpine base): install deps from `bun.lock`, `bun run build` → `dist`, runner stage copying `dist`, `server.ts`, `src/db/schema.sql`, and production deps
- [x] 2.2 Run as a non-root user; set `DATA_DIR=/app/data`, create it, and chown it to that user; `EXPOSE 3000`; `CMD ["bun","server.ts"]`
- [x] 2.3 Record the image's non-root uid (needed for the droplet `chown`) in the design doc's Open Questions
- [x] 2.4 Add a `.dockerignore` excluding `node_modules`, `dist`, `.git`, `.github`, `data`, `.env*`, `*.md`, `Dockerfile` — while keeping `server.ts` and `src/db/schema.sql`
- [x] 2.5 Local end-to-end run: `docker build`, run with a named volume at `/app/data`; verify app loads on :3000, paste create writes to the volume, `stop`+`run` keeps data, and rebuilding the image keeps data; confirm `whoami` is non-root and image size is reasonable

## 3. GHCR publish workflow

- [x] 3.1 Add `.github/workflows/docker-publish.yml`: build+push on `push: [main]` + `workflow_dispatch`, `permissions: packages: write, contents: read`, login with `GITHUB_TOKEN` (named `docker-publish` rather than `deploy` since deployment is droplet-side)
- [x] 3.2 Tag `ghcr.io/yaowang908/paste_bin_clone:latest` and `:${{ github.sha }}`; enable gha layer cache
- [x] 3.3 Pin every third-party action to a commit SHA with a trailing version comment
- [x] 3.4 Add a PR-triggered job (`on: pull_request`) that runs `docker build` with `push: false` to validate the image without publishing (single job, `push:` conditioned on non-PR events)

## 4. Cutover of repo CI

- [x] 4.1 Delete `.github/workflows/nextDeploy.js.yml` and remove the droplet SSH secrets (`SSH_PRIVATE_KEY`, `DO_IP`, `DO_USER`) from the repo
- [x] 4.2 Confirm the Cloudflare Pages PR check still passes (frontend build is unaffected by the server refactor — verified `bun run build` succeeds and the frontend graph never imports server/db code)

## 5. First publish and verification

- [ ] 5.1 Trigger the workflow from `main` (or `workflow_dispatch`); confirm the package appears under the repo's Packages tab
- [ ] 5.2 Set the GHCR package visibility to **Public**; verify no secret/`.env` is baked into the image
- [ ] 5.3 Confirm `docker pull ghcr.io/yaowang908/paste_bin_clone:latest` succeeds with no credentials, and image size is sane (not >1 GB)

## 6. Companion handover (droplet)

- [x] 6.1 Write the droplet handover doc (`docs/droplet-migration-handover.md`): `compose.yml` (app bound to `127.0.0.1:3000`, `pastebin_data` volume at `DATA_DIR`, Watchtower or cron trigger), the one-time DB migration + `chown 1000:1000`, cutover sequence, and rollback via `:<sha>`
