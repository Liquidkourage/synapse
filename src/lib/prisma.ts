import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma";
import { resolveDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const url = resolveDatabaseUrl();
  if (!url.startsWith("file:")) {
    throw new Error(
      'DATABASE_URL must be a SQLite file URL (e.g. file:./prisma/dev.db). This PoC uses SQLite for local "no DB server" dev.',
    );
  }
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

globalForPrisma.prisma = prisma;
