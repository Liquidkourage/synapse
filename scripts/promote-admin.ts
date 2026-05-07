/**
 * Promote an existing user to ADMIN by email.
 *
 * Usage (repo root, DATABASE_URL set):
 *   npx tsx scripts/promote-admin.ts you@example.com
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma";
import { resolveDatabaseUrl } from "../prisma/database-url";

const emailArg = process.argv[2]?.trim();
if (!emailArg) {
  console.error("Usage: npx tsx scripts/promote-admin.ts <email>");
  process.exit(1);
}

const url = resolveDatabaseUrl();
const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: emailArg, mode: "insensitive" } },
  });
  if (!user) {
    console.error(`No user with email: ${emailArg}`);
    console.error("Sign up first, or run: npm run db:seed (creates admin@synapse.demo / demo1234)");
    process.exit(1);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
  console.log(`OK: ${user.email} is now ADMIN`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
