import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@synapse.demo" },
    update: {},
    create: {
      email: "admin@synapse.demo",
      passwordHash,
      name: "Alex Admin",
      role: "ADMIN",
      profile: { create: {} },
      notificationPref: { create: {} },
    },
  });

  const producer = await prisma.user.upsert({
    where: { email: "producer@synapse.demo" },
    update: {},
    create: {
      email: "producer@synapse.demo",
      passwordHash,
      name: "Pat Producer",
      role: "PRODUCER",
      profile: { create: {} },
      notificationPref: { create: {} },
    },
  });

  const host = await prisma.user.upsert({
    where: { email: "host@synapse.demo" },
    update: {},
    create: {
      email: "host@synapse.demo",
      passwordHash,
      name: "Harriet Host",
      role: "HOST",
      profile: { create: { displayName: "Harriet" } },
      notificationPref: { create: {} },
    },
  });

  const player = await prisma.user.upsert({
    where: { email: "player@synapse.demo" },
    update: {},
    create: {
      email: "player@synapse.demo",
      passwordHash,
      name: "Paul Player",
      role: "PLAYER",
      profile: { create: {} },
      notificationPref: { create: {} },
    },
  });

  const series = await prisma.recurrenceSeries.upsert({
    where: { slug: "wednesday-night-brain" },
    update: {},
    create: {
      slug: "wednesday-night-brain",
      title: "Wednesday Night Brain Trust",
      description: "Weekly pub-style trivia block.",
      ruleJson: JSON.stringify({
        frequency: "weekly",
        byWeekday: 3,
        label: "Every Wednesday · 8:00 PM local",
      }),
      hostId: host.id,
      producerId: producer.id,
    },
  });

  const now = new Date();
  const startLive = new Date(now.getTime() - 15 * 60 * 1000);
  const endLive = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const liveEvent = await prisma.event.upsert({
    where: { slug: "live-demo-spectacular" },
    update: {},
    create: {
      slug: "live-demo-spectacular",
      title: "Live Demo Spectacular",
      shortDescription: "A sample live event with embed + external link placeholders.",
      longDescription:
        "Synapse is the network; your trivia engine lives elsewhere. This event demonstrates cover art, embeds, and instructions.",
      startAt: startLive,
      endAt: endLive,
      timezone: "America/Los_Angeles",
      status: "SCHEDULED",
      statusOverride: "LIVE",
      hostId: host.id,
      producerId: producer.id,
      platformName: "GameShow.host",
      externalUrl: "https://example.com",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      integrationType: "embed",
      instructions: "Open the external link if the embed is blocked. Have fun.",
      coverImageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&auto=format&fit=crop",
      recurrenceSeriesId: series.id,
      recurrenceNote: "Also airs weekly — see series",
    },
  });

  const later = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const laterEnd = new Date(later.getTime() + 90 * 60 * 1000);

  await prisma.event.upsert({
    where: { slug: "future-google-forms-night" },
    update: {},
    create: {
      slug: "future-google-forms-night",
      title: "Google Forms Speed Round",
      shortDescription: "A scheduled event using an external form — no API in V1.",
      longDescription: "We only store links. Players open the form in a new tab.",
      startAt: later,
      endAt: laterEnd,
      timezone: "America/New_York",
      status: "SCHEDULED",
      hostId: host.id,
      producerId: producer.id,
      platformName: "Google Forms",
      externalUrl: "https://docs.google.com/forms/",
      integrationType: "external",
      instructions: "One tab for Synapse, one tab for the form. You know the drill.",
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      featuredLiveEventId: liveEvent.id,
      heroTitle: "One live channel. Infinite games.",
      heroSubtitle: "Synapse is the front door — plug in TrivNow, GameShow.host, Google Forms, or anything with a link.",
      tagline: "Network-style trivia discovery",
    },
    create: {
      id: "default",
      siteName: "Synapse",
      featuredLiveEventId: liveEvent.id,
      heroTitle: "One live channel. Infinite games.",
      heroSubtitle: "Synapse is the front door — plug in TrivNow, GameShow.host, Google Forms, or anything with a link.",
      tagline: "Network-style trivia discovery",
    },
  });

  await prisma.archiveEntry.upsert({
    where: { slug: "classic-mashup-replay" },
    update: {},
    create: {
      slug: "classic-mashup-replay",
      title: "Classic Mash-up Replay",
      description: "Sample on-demand entry with a replay link.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop",
      eventId: liveEvent.id,
      featured: true,
    },
  });

  await prisma.archiveEntry.upsert({
    where: { slug: "behind-the-scenes" },
    update: {},
    create: {
      slug: "behind-the-scenes",
      title: "Behind the Scenes: Building the Schedule",
      description: "Placeholder archive entry.",
      externalUrl: "https://example.com",
    },
  });

  await prisma.chatMessage.deleteMany({ where: { eventId: liveEvent.id } });
  await prisma.chatMessage.createMany({
    data: [
      { eventId: liveEvent.id, userId: player.id, body: "Let's go! 🎉" },
      { eventId: liveEvent.id, userId: host.id, body: "Welcome to the network — external game opens in a new tab." },
    ],
  });

  await prisma.homepageBlock.deleteMany({});
  await prisma.homepageBlock.createMany({
    data: [
      { title: "Tonight’s lineup", blockType: "upcoming", sortOrder: 0 },
      { title: "Catch up", blockType: "archive", sortOrder: 1 },
    ],
  });

  await prisma.subscriptionPlaceholder.deleteMany({ where: { userId: player.id } });
  await prisma.subscriptionPlaceholder.create({
    data: {
      userId: player.id,
      tier: "free",
      status: "demo_active",
      demoNote: "Placeholder: map to Stripe when ready.",
    },
  });

  await prisma.ticketOrderPlaceholder.deleteMany({ where: { userId: player.id } });
  await prisma.ticketOrderPlaceholder.create({
    data: {
      eventId: liveEvent.id,
      userId: player.id,
      amountCents: 0,
      status: "demo_complimentary",
    },
  });

  await prisma.notificationOutbox.deleteMany({ where: { userId: player.id } });
  await prisma.notificationOutbox.create({
    data: {
      userId: player.id,
      type: "event_reminder",
      payload: JSON.stringify({ eventId: liveEvent.id, minutesBefore: 30 }),
    },
  });

  console.log("Seed complete.");
  console.log("Demo logins (password for all):", DEMO_PASSWORD);
  console.log("  admin@synapse.demo");
  console.log("  producer@synapse.demo");
  console.log("  host@synapse.demo");
  console.log("  player@synapse.demo");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
