import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma";
import { resolveDatabaseUrl } from "../../prisma/database-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const url = resolveDatabaseUrl();
  if (!url.startsWith("postgres")) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string (e.g. postgres://user:password@host:5432/db)"
    );
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg({ pool });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

globalForPrisma.prisma = prisma;
