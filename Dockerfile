# Node 22.x satisfies Prisma toolchain (e.g. @prisma/streams-local engines.node >=22).
# Prisma 7 supports ^20.19.0 || ^22.12.0 || >=24.0.0 — avoid 20.x if optional deps warn on install.
FROM node:22-bookworm-slim AS base

WORKDIR /app

# Optional native deps (node-gyp): Prisma engines; `pg` is pure JS
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

# Next.js build evaluates server modules (e.g. `src/lib/prisma.ts`) and `resolveDatabaseUrl()` runs.
# On Railway, service variables are only visible during `docker build` if declared as ARG — see:
# https://docs.railway.com/deploy/dockerfiles#using-variables-at-build-time
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Do not use `npm start` as container PID: npm reports failure on SIGTERM when Railway
# replaces the deployment. `exec next` receives the signal and exits cleanly.
CMD ["./docker-entrypoint.sh"]
