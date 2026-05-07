/**
 * Lives under `prisma/` so Docker can COPY it before `npm ci` (postinstall runs `prisma generate`).
 * PostgreSQL connection string for Prisma CLI and the app.
 */
export function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error(
    "DATABASE_URL environment variable is required. Set it to a PostgreSQL connection string (e.g. postgres://user:password@host:5432/db)."
  );
}
