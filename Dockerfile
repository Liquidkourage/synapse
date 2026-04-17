# Official Node image tracks latest 20.x / 22.x patch releases (Prisma 7 needs 20.19+, 22.12+, or 24+).
# Nixpacks' Node 22 channel can resolve to 22.11, which fails Prisma's preinstall check.
FROM node:20-bookworm-slim AS base

WORKDIR /app

# Native deps: better-sqlite3 (node-gyp), Prisma engines
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# postinstall runs `prisma generate` — schema must exist before npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

ENV NEXT_TELEMETRY_DISABLED=1

# Install all deps (incl. dev) so `next build` has TypeScript, eslint, etc.
RUN npm ci

COPY . .

RUN chmod +x docker-entrypoint.sh

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Do not use `npm start` as container PID: npm reports failure on SIGTERM when Railway
# replaces the deployment. `exec next` receives the signal and exits cleanly.
CMD ["./docker-entrypoint.sh"]
