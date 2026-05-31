# syntax=docker/dockerfile:1
#
# Multi-stage build for the NumNinjas Telegram bot.
# Builder installs every dep and compiles TS to JS; runtime is a slim
# image with only the compiled output and prod node_modules.
#
# Note: `tsx` stays in the runtime image because the start command is
# `node --import tsx dist/src/index.js`. tsx provides the ESM import hook
# that resolves the extension-less relative imports in dist/ (a
# consequence of tsconfig `moduleResolution: "bundler"` plus ESM Node).

# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

# --ignore-scripts skips every install-time script (e.g. esbuild's
# postinstall). pnpm refuses to run unapproved scripts and exits non-zero;
# --ignore-scripts sidesteps the gate. The build needs no dependency
# lifecycle script: tsc runs from the prebuilt JS in each package.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ---------- runtime ----------
FROM node:22-alpine
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
# --prod drops devDependencies (typescript, vitest, prettier, @types/*)
# but keeps `tsx`, which is a regular dependency because the start command
# needs its ESM loader.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/dist ./dist

# This bot is fully deterministic and writes nothing to disk: the daily
# question is picked from the day-of-year, so there is no state file, no
# ./data dir, and no volume to manage.

# Drop privileges. The official node image ships a `node` user (UID 1000).
USER node

# Long-polling bot: no inbound port needed (the /health server binds PORT).
CMD ["node", "--import", "tsx", "dist/src/index.js"]
