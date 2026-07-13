## Why

The app currently deploys by SSH-ing into a droplet and running `git pull && npm install && npm run build && pm2 restart`. This is slow, unreproducible, mixes build with runtime on a 1 GB box, and stores its SQLite database inside the project directory where a bad deploy can clobber it. Moving to a Docker image published on GHCR makes deploys reproducible, keeps the build in CI, and lets persistent state live on a mounted volume that survives every deploy.

A blocking prerequisite surfaced during exploration: the app's SQLite layer uses the native node `sqlite3` package, which **panics the Bun runtime with a NAPI fatal error** (reproduced locally against the real DB). The Bun-native `bun:sqlite` module is already imported in `server.ts` but unused. Switching to it both fixes the crash and removes the native module that would otherwise force a heavy, compile-toolchain image.

## What Changes

- **Refactor the SQLite layer to `bun:sqlite`** (replacing native node `sqlite3`). Removes the callback wrappers in `server.ts`, replaces `src/db/index.js`, and folds `CREATE TABLE IF NOT EXISTS` into startup so a fresh volume self-initializes. **BREAKING** (internal): `src/db/index.js`/`init.js` interface changes; no API or data-format change.
- **Make state relocatable via `DATA_DIR`**: the SQLite file moves from the hardcoded `process.cwd()/src/db/database.sqlite` to `${DATA_DIR}/pastes.db`, defaulting to a local dir for dev and `/app/data` (a mounted volume) in the container.
- **Add a multi-stage `Dockerfile`** (`oven/bun` base) that installs deps, runs `bun run build` (Vite → `dist`), and runs `bun server.ts`; plus a `.dockerignore`.
- **Add a GHCR publish workflow**: build + push `ghcr.io/yaowang908/paste_bin_clone` tagged `:latest` and `:<sha>` on push to `main`, using the built-in `GITHUB_TOKEN` with `packages: write`. Actions pinned to commit SHAs.
- **Add a PR-triggered `docker build` job (`push: false`)** so image/server breakage is caught before merge, complementing the existing Cloudflare Pages frontend build check.
- **Remove the old SSH `git pull` workflow** (`nextDeploy.js.yml`) and its droplet SSH secrets.
- **Package visibility: public** — the droplet pulls with no credentials.
- **Droplet-side deploy is out of repo scope**: pull/restart is handled on the droplet (Watchtower or cron poll), documented in a companion handover doc.

## Capabilities

### New Capabilities
- `container-image`: Building the app into a reproducible Docker image (Bun base, multi-stage, non-root, `DATA_DIR` volume convention) and the CI that publishes it to GHCR.
- `persistent-storage`: SQLite state relocated behind `DATA_DIR`, initialized at startup, served by `bun:sqlite`, and durable across deploys via a mounted volume.

### Modified Capabilities
<!-- No existing openspec/specs/ capabilities; nothing to modify. -->

## Impact

- **Code**: `server.ts` (query layer), `src/db/index.js` + `src/db/init.js` (rewritten/removed), new `Dockerfile`, `.dockerignore`, `.github/workflows/` (new publish + PR-build workflow, delete `nextDeploy.js.yml`), `.gitignore` (ignore `data/`).
- **Dependencies**: removes runtime need for the native `sqlite3` package.
- **Infra**: new GHCR public package; droplet migrates from pm2/git-pull to a container + named volume (companion doc).
- **Data**: existing droplet SQLite file must be copied into the volume at `${DATA_DIR}/pastes.db` and chowned to the container user's uid during cutover.
- **CI checks**: Cloudflare Pages (frontend) unaffected — verified it never imports server/db code; GHCR workflow does not run on PRs (no duplicate check).
