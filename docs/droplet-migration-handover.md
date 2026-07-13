# Droplet Migration Handover — pull the GHCR image

**Scope:** droplet-side changes to move from the old pm2 / `git pull` deploy to running the published container image `ghcr.io/yaowang908/paste_bin_clone`. The repo-side work (bun:sqlite refactor, Dockerfile, GHCR workflow) is covered by the `containerize-and-ghcr` OpenSpec change and is a prerequisite — the image must exist and be public before starting here.

**Established facts (from the repo change):**
- Image: `ghcr.io/yaowang908/paste_bin_clone:latest` (+ `:<sha>` per build). **Public** — no pull credentials needed.
- Container listens on **port 3000**, binds `0.0.0.0`.
- State: SQLite at `${DATA_DIR}/pastes.db`; container sets `DATA_DIR=/app/data`.
- Container user: **`bun`, uid 1000, gid 1000**. Anything written into the volume must be owned by `1000:1000` or the app can't write it.
- WAL mode is on, so the volume will also hold `pastes.db-wal` and `pastes.db-shm`.

---

## Prerequisites

- Docker Engine + the `docker compose` plugin installed on the droplet.
- A `deploy` user in the `docker` group.
- Deploy dir `/opt/pastebin/` owned by `deploy` (holds `compose.yml` only — no source, no secrets).
- Confirm a swapfile exists (1 GB RAM box running app + watchtower + Caddy is tight).

---

## Step 1 — `compose.yml`

`/opt/pastebin/compose.yml`:

```yaml
services:
  app:
    image: ghcr.io/yaowang908/paste_bin_clone:latest
    restart: unless-stopped
    environment:
      DATA_DIR: /app/data
    volumes:
      - pastebin_data:/app/data      # SQLite lives here; survives every deploy
    ports:
      - "127.0.0.1:3000:3000"        # localhost only — Caddy fronts it, not the public net
    labels:
      - "com.centurylinklabs.watchtower.scope=pastebin"

  # Auto-pull + recreate on a new :latest. Omit this block if you prefer cron (see Step 4).
  watchtower:
    image: containrrr/watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --cleanup --scope pastebin

volumes:
  pastebin_data:
```

Notes:
- `127.0.0.1:3000:3000` keeps the container off the public internet; TLS/routing stays in Caddy (below).
- `--scope pastebin` + the matching label means Watchtower only touches this app, not any other container on the box.

---

## Step 2 — One-time data migration (do not skip)

The live SQLite from the old pm2 app must be copied into the `pastebin_data` volume at the new path `/app/data/pastes.db`, then chowned to uid 1000.

The old DB path on the droplet is (from the pre-container setup):
`~/paste_bin_clone/src/db/database.sqlite`  — **confirm this path before copying.**

```bash
# 1. Quiesce the old app so the DB isn't mid-write during the copy.
pm2 stop paste-bin-clone

# 2. Create the volume and seed it from the live DB (note the rename to pastes.db).
docker volume create pastebin_data
docker run --rm \
  -v pastebin_data:/data \
  -v ~/paste_bin_clone/src/db:/src:ro \
  alpine cp /src/database.sqlite /data/pastes.db

# 3. Ownership must match the container user (uid 1000), or writes fail with silent 500s.
docker run --rm -v pastebin_data:/data alpine chown -R 1000:1000 /data
```

> If the old DB had a `-wal` file, checkpoint it first (`sqlite3 database.sqlite 'PRAGMA wal_checkpoint(TRUNCATE);'`) so all data is in the main file before copying. With pm2 stopped this is usually already flushed.

---

## Step 3 — Cutover

```bash
cd /opt/pastebin
docker compose pull          # pull the public image (no login needed)
docker compose up -d
```

Verify **before** repointing traffic:
```bash
# old data present?
curl -s localhost:3000/api/pastes/<a-known-existing-id>
# NEW writes work (proves uid/ownership is correct)?
curl -s -X POST localhost:3000/api/pastes \
  -H 'content-type: application/json' \
  -d '{"id":"cutover-check","content":"hi","expirationDate":0,"token":"t"}'
curl -s localhost:3000/api/pastes/cutover-check
```

Then point Caddy at the container and finish:
```
# Caddyfile
your-domain.com {
    reverse_proxy 127.0.0.1:3000
}
```
```bash
# reload Caddy, confirm the site works over HTTPS, then retire the old app:
pm2 delete paste-bin-clone
```

---

## Step 4 — Deploy trigger: Watchtower vs cron

**Watchtower (in the compose above, recommended):** polls GHCR every 5 min, pulls a changed `:latest`, recreates the app container, prunes the old image. Set-and-forget.

**Cron alternative** (drop the watchtower service, add this instead):
```cron
*/5 * * * * cd /opt/pastebin && docker compose pull -q && docker compose up -d >> /var/log/pastebin-deploy.log 2>&1
```
`docker compose up -d` is a no-op when the digest hasn't changed, so this only restarts on a real new image.

**Trade-off either way:** every green build on `main` auto-deploys to prod within the poll interval, with no manual gate. Acceptable for this app. If you ever want an approval gate, switch to pinning a version tag in `compose.yml` and bumping it by hand.

---

## Rollback

The volume is never touched by a deploy, so data is safe regardless. To roll back a bad `:latest`:

```bash
cd /opt/pastebin
# pin to a known-good commit-SHA tag from the GHCR package's version list
sed -i 's#:latest#:<good-sha>#' compose.yml   # or edit by hand
docker compose up -d
```
Re-point to `:latest` once a fixed image ships.

---

## Checklist

- [ ] Docker + compose installed; `deploy` user in `docker` group; swap present.
- [ ] `compose.yml` in `/opt/pastebin/` (app on `127.0.0.1:3000`, `pastebin_data` volume, trigger chosen).
- [ ] Old DB copied into `pastebin_data:/…/pastes.db` and `chown -R 1000:1000`.
- [ ] `docker compose up -d`; old data reads AND a new write both succeed.
- [ ] Caddy reverse-proxies `127.0.0.1:3000`; HTTPS works.
- [ ] Old pm2 app deleted; old SSH deploy key removed from `authorized_keys`.
