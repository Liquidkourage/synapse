import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // ---------------------------------------------------------------------------
  // Admin user
  // ---------------------------------------------------------------------------
  const passwordHash = await bcrypt.hash("Topher8606", 12);

  const admin = await prisma.user.upsert({
    where: { email: "liquidkouragekaraoke@gmail.com" },
    update: {},
    create: {
      email: "liquidkouragekaraoke@gmail.com",
      passwordHash,
      name: "Admin",
      role: "ADMIN",
      profile: { create: {} },
      notificationPref: { create: {} },
    },
  });

  // ---------------------------------------------------------------------------
  // Lingo event
  // May 7 2026 9:00 PM – 11:00 PM Central Time → UTC: May 8 2026 02:00–04:00
  // ---------------------------------------------------------------------------
  const lingoEvent = await prisma.event.upsert({
    where: { slug: "lingo" },
    update: {},
    create: {
      slug: "lingo",
      title: "Lingo",
      shortDescription: "",
      startAt: new Date("2026-05-08T02:00:00.000Z"),
      endAt: new Date("2026-05-08T04:00:00.000Z"),
      timezone: "America/Chicago",
      status: "SCHEDULED",
      hostId: admin.id,
    },
  });

  // ---------------------------------------------------------------------------
  // SiteSettings singleton
  // ---------------------------------------------------------------------------
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      siteName: "Synapse",
    },
  });

  // ---------------------------------------------------------------------------
  // Homepage blocks
  // ---------------------------------------------------------------------------
  await prisma.homepageBlock.deleteMany({});
  await prisma.homepageBlock.createMany({
    data: [
      { title: "Tonight's lineup", blockType: "upcoming", sortOrder: 0 },
      { title: "Catch up", blockType: "archive", sortOrder: 1 },
    ],
  });

  console.log("Seed complete.");
  console.log(`  Admin: liquidkouragekaraoke@gmail.com`);
  console.log(`  Event: "${lingoEvent.title}" (slug: ${lingoEvent.slug})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
