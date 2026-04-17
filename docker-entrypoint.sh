#!/bin/sh
# Run Prisma sync, then exec Next as PID 1 — avoids npm exiting non-zero on SIGTERM during
# Railway deploy replacement (which was triggering "Deployment crashed" emails).
set -e
cd /app
./node_modules/.bin/prisma db push
exec ./node_modules/.bin/next start
