import { prisma } from "@/lib/prisma";

export type PublicCreator = {
  id: string;
  creatorSlug: string;
  name: string;
  bio: string | null;
  image: string | null;
  upcomingCount: number;
  referralCode: string | null;
};

/** Active creators with public slugs — for directory and homepage. */
export async function getPublicCreators(limit = 24): Promise<PublicCreator[]> {
  const now = new Date();
  const creators = await prisma.user.findMany({
    where: { creatorActive: true, creatorSlug: { not: null } },
    include: {
      profile: true,
      referralCodes: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 },
      hostedEvents: {
        where: {
          status: { notIn: ["DRAFT", "CANCELLED"] },
          eventKind: "LIVE_INTERACTIVE",
          endAt: { gte: now },
        },
        select: { id: true },
      },
    },
    orderBy: { creatorSlug: "asc" },
    take: limit,
  });

  return creators.map((c) => ({
    id: c.id,
    creatorSlug: c.creatorSlug!,
    name: c.profile?.displayName?.trim() || c.name?.trim() || c.creatorSlug!,
    bio: c.profile?.bio?.trim() || null,
    image: c.image,
    upcomingCount: c.hostedEvents.length,
    referralCode: c.referralCodes[0]?.code ?? c.creatorSlug,
  }));
}

export function creatorDisplayName(user: {
  creatorSlug?: string | null;
  name?: string | null;
  email?: string | null;
  profile?: { displayName?: string | null } | null;
}): string {
  return (
    user.profile?.displayName?.trim() ||
    user.name?.trim() ||
    user.creatorSlug?.trim() ||
    user.email?.split("@")[0] ||
    "Host"
  );
}
