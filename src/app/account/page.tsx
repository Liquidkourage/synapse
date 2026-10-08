import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { SupportAllocationForm } from "@/components/support-allocation-form";
import { ensureDefaultAllocationPreference } from "@/lib/support-allocations";
import { membershipPriceHeadline } from "@/lib/membership-pricing";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;
  if (!userId) redirect("/login");

  await ensureDefaultAllocationPreference(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      notificationPref: true,
      membership: true,
      supportAllocationPreference: { include: { lines: true } },
      referralFirstTouchCreator: { select: { id: true, name: true, creatorSlug: true, profile: true } },
      referredByCreator: { select: { id: true, name: true, creatorSlug: true } },
    },
  });
  if (!user) redirect("/login");

  const creators = await prisma.user.findMany({
    where: { creatorActive: true, creatorSlug: { not: null } },
    select: { id: true, name: true, creatorSlug: true, profile: { select: { displayName: true } } },
    orderBy: { creatorSlug: "asc" },
  });

  const suggestedId = user.supportAllocationPreference?.suggestedCreatorId ?? null;
  const suggestedFromList = suggestedId ? creators.find((c) => c.id === suggestedId) : null;
  const suggestedLabel = suggestedFromList
    ? suggestedFromList.profile?.displayName?.trim() ||
      suggestedFromList.name?.trim() ||
      suggestedFromList.creatorSlug
    : user.referralFirstTouchCreator?.id === suggestedId
      ? user.referralFirstTouchCreator.profile?.displayName?.trim() ||
        user.referralFirstTouchCreator.name?.trim() ||
        user.referralFirstTouchCreator.creatorSlug
      : null;

  const price = membershipPriceHeadline();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Your account</h1>
        <p className="mt-2 text-zinc-400">
          Role: <span className="text-violet-300">{session.user.role}</span> · {session.user.email}
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <h2 className="font-medium text-zinc-200">Membership</h2>
        {user.membership ? (
          <p className="mt-2">
            Status: <strong className="text-zinc-100">{user.membership.status}</strong> · Source:{" "}
            <strong className="text-zinc-100">{user.membership.source}</strong>
            {user.membership.adminGrantNote ? (
              <span className="mt-1 block text-xs text-zinc-500">Note: {user.membership.adminGrantNote}</span>
            ) : null}
          </p>
        ) : (
          <p className="mt-2">No membership yet.</p>
        )}
        <p className="mt-2 text-xs text-zinc-600">
          Free account = identity. Paid membership ({price}) = network participation when billing is live.{" "}
          <Link href="/subscribe" className="text-violet-400 hover:underline">
            Membership info
          </Link>
        </p>
        {user.referralFirstTouchCreator ? (
          <p className="mt-2 text-xs text-zinc-500">
            First-touch referral: {user.referralFirstTouchCreator.creatorSlug ?? user.referralFirstTouchCreator.name}
            {user.referredByCreatorId
              ? " · Permanent attribution locked after paid conversion"
              : " · Permanent attribution pending first paid conversion"}
          </p>
        ) : null}
      </section>

      <SupportAllocationForm
        creators={creators.map((c) => ({
          id: c.id,
          label: c.profile?.displayName?.trim() || c.name?.trim() || c.creatorSlug || c.id,
        }))}
        initialLines={
          user.supportAllocationPreference?.lines.map((l) => ({
            creatorId: l.creatorId,
            weightBps: l.weightBps,
          })) ?? [{ creatorId: null, weightBps: 10_000 }]
        }
        suggestedCreatorId={suggestedId}
        suggestedCreatorLabel={suggestedLabel ?? null}
        confirmed={user.supportAllocationPreference?.confirmed ?? false}
      />

      <ProfileForm
        initialDisplayName={user.profile?.displayName ?? ""}
        initialBio={user.profile?.bio ?? ""}
        emailReminders={user.notificationPref?.emailReminders ?? true}
      />
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">
        <h2 className="font-medium text-zinc-300">Notifications (placeholder)</h2>
        <p className="mt-2">
          Reminder emails are scaffolded in the data model. Wire to Resend/SendGrid when you are ready — no messages are
          sent in this PoC.
        </p>
      </section>
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <h2 className="font-medium text-zinc-200">Billing</h2>
        <p className="mt-2">
          Self-serve card checkout for {price} is not live yet. If you have pilot access, it will appear as an active
          membership above. You can still set creator support preferences now — they are preferences, not payments.
        </p>
      </section>
    </div>
  );
}
