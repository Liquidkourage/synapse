#!/bin/sh
# Run Prisma sync, then exec Next as PID 1 — avoids npm exiting non-zero on SIGTERM during
# Railway deploy replacement (which was triggering "Deployment crashed" emails).
set -e
cd /app
# Non-interactive deploy: new nullable columns / unique constraints (e.g. podcast fields).
./node_modules/.bin/prisma db push --accept-data-loss
exec ./node_modules/.bin/next start
