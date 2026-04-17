/**
 * Single place for SQLite file URL so Prisma CLI (`prisma db push`) and the app agree.
 * Railway: set `DATABASE_URL=file:/data/synapse.db` **or** rely on `RAILWAY_VOLUME_MOUNT_PATH`.
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
