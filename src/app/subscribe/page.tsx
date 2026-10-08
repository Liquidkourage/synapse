import Link from "next/link";
import { auth } from "@/auth";
import { getMembershipForUser } from "@/lib/membership";
import { membershipPriceHeadline } from "@/lib/membership-pricing";

export default async function SubscribePage() {
  const session = await auth();
  const membership = session?.user?.id ? await getMembershipForUser(session.user.id) : null;
  const price = membershipPriceHeadline();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-[0.18em] text-violet-300/90">MEMBERSHIP</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">One membership. Every show.</h1>
        <p className="mt-3 text-lg text-zinc-300">
          <strong className="text-white">{price}</strong> — all-access participation across eligible Synapse
          programming from every host on the network.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="font-medium text-zinc-100">Free account</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Your Synapse identity — sign in, manage your profile, browse the schedule, and follow creators. Creating an
            account alone does not grant paid participation.
          </p>
          {!session?.user ? (
            <Link href="/signup" className="mt-4 inline-block text-sm text-violet-400 hover:underline">
              Create free account →
            </Link>
          ) : (
            <p className="mt-4 text-sm text-emerald-300/90">You&apos;re signed in.</p>
          )}
        </div>
        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/25 p-5">
          <h2 className="font-medium text-violet-100">Paid membership</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Entitlement to participate in subscriber-eligible live shows — video stage, interactive tools, and chat —
            across the network.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <h2 className="font-medium text-zinc-200">What members get</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Participate in eligible live interactive shows across Synapse</li>
          <li>Join the show night stage and chat with your Synapse handle</li>
          <li>Choose how your subscriber-directed support preferences favor creators</li>
          <li>One destination for discovery — not a new membership for every host</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <h2 className="font-medium text-zinc-200">How creators benefit</h2>
        <p className="mt-2">
          Synapse is designed so subscription revenue can support platform operations, a shared creator pool,
          subscriber-directed preferences for favorite hosts, and selected nonprofit causes. Illustrative shares (not
          final contracts): about 40% platform, 25% shared creator pool, 30% subscriber-directed, 5% nonprofit.
        </p>
        <p className="mt-2 text-zinc-500">
          Preference choices in your account are not wallets or guaranteed payouts. Automated creator payments are not
          part of this phase.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <h2 className="font-medium text-zinc-200">Billing & cancellation</h2>
        <p className="mt-2">
          Membership is intended as a recurring monthly subscription at {price}. Card checkout and self-serve cancel via
          customer portal are being prepared — they are not live on this site yet.
        </p>
        {membership ? (
          <p className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-emerald-100">
            Your current membership status: <strong>{membership.status}</strong>
            {membership.source === "ADMIN_GRANT" ? " (pilot access)" : ""}. Manage preferences anytime in{" "}
            <Link href="/account" className="text-violet-300 hover:underline">
              Account
            </Link>
            .
          </p>
        ) : (
          <p className="mt-3 text-zinc-500">
            You can create a free account now and explore programming. We&apos;ll enable paid checkout when ready — no
            card required to register.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        {session?.user ? (
          <Link
            href="/account"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Account & support preferences
          </Link>
        ) : (
          <Link
            href="/signup"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Create free account
          </Link>
        )}
        <Link
          href="/schedule"
          className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-400"
        >
          Browse schedule
        </Link>
        <Link
          href="/creators"
          className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-400"
        >
          Meet creators
        </Link>
      </div>
    </div>
  );
}
