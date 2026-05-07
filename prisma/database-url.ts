/**
 * Lives under `prisma/` so Docker can COPY it before `npm ci` (postinstall runs `prisma generate`).
 * Requires a PostgreSQL `DATABASE_URL` for the running app and for `db push` / migrate.
 *
 * When `DATABASE_URL` is unset, `prisma generate` alone uses a placeholder (no DB connection).
 */

const PRISMA_GENERATE_PLACEHOLDER = "postgresql://127.0.0.1:5432/__prisma_generate_only";

function isPrismaGenerateProcess(): boolean {
  /** `node …/prisma build/index.js generate` or `npx prisma generate` */
  return process.argv.includes("generate") && process.argv.some((arg) => arg.includes("prisma"));
}

export function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();

  if (raw) {
    if (raw.startsWith("postgresql:") || raw.startsWith("postgres:")) {
      return raw;
    }
    if (raw.startsWith("file:") && isPrismaGenerateProcess()) {
      console.warn(
        "[synapse] DATABASE_URL is SQLite; `prisma generate` is using a placeholder. Switch to postgresql:// for the app and `db push`.",
      );
      return PRISMA_GENERATE_PLACEHOLDER;
    }
    throw new Error(
      "DATABASE_URL must be a PostgreSQL URL (postgresql:// or postgres://). SQLite file URLs are not supported.",
    );
  }

  if (isPrismaGenerateProcess()) {
    return PRISMA_GENERATE_PLACEHOLDER;
  }

  throw new Error(
    "DATABASE_URL is required. Set a PostgreSQL connection string, e.g. postgresql://USER:PASSWORD@HOST:PORT/DATABASE",
  );
}
