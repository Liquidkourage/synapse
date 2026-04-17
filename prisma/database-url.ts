/**
 * Lives under `prisma/` so Docker can COPY it before `npm ci` (postinstall runs `prisma generate`).
 * SQLite file URL for Prisma CLI and the app.
 */
export function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const vol = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (vol) {
    const base = vol.replace(/\/$/, "");
    return `file:${base}/synapse.db`;
  }
  return "file:./prisma/dev.db";
}
