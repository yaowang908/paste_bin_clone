# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app

# All dependencies (dev + prod) — needed to build the Vite frontend.
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the frontend into ./dist.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production-only dependencies (just the runtime server deps).
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Final runtime image.
FROM base AS runner
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY src/db/index.js src/db/schema.sql ./src/db/

# SQLite state lives here and is expected to be a mounted volume in production.
# Owned by the image's built-in non-root user `bun` (uid 1000) so it's writable.
RUN mkdir -p /app/data && chown -R bun:bun /app/data

USER bun
EXPOSE 3000
CMD ["bun", "server.ts"]
