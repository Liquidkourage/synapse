import Link from "next/link";
import { auth } from "@/auth";
import { getMembershipForUser } from "@/lib/membership";
import { isMembershipGatingEnabled } from "@/lib/membership-gating";

export default async function SubscribePage() {
  const session = await auth();
  const membership = session?.user?.id ? await getMembershipForUser(session.user.id) : null;
  const gating = isMembershipGatingEnabled();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-violet-300/80">Synapse membership</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">One membership. Every show.</h1>
        <p className="mt-3 text-zinc-400">
          <strong className="text-zinc-200">$9.99/month</strong> — all-access participation across the network: live
          interactive shows, watch-and-play stages, and chat. Creators bring the entertainment; Synapse is the front door.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <h2 className="font-medium text-zinc-200">What you get</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Join live video and participation tools on show night</li>
          <li>Event chat with your Synapse handle</li>
          <li>Direct a share of subscriber support toward favorite creators</li>
          <li>Discover the full schedule from one account</li>
        </ul>
      </section>

      {membership ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
          Your membership status: <strong>{membership.status}</strong> ({membership.source}).
          {membership.source === "ADMIN_GRANT" ? " (pilot / admin grant)" : null}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {session?.user ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-100">
            Card checkout arrives next — Stripe is designed but not live yet.
          </span>
        ) : (
          <Link href="/signup" className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500">
            Create account
          </Link>
        )}
        <Link href="/schedule" className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-400">
          Browse schedule
        </Link>
        <Link href="/account" className="rounded-full border border-zinc-600 px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-400">
          Account & support
        </Link>
      </div>

      <p className="text-xs text-zinc-600">
        Participation gating is currently <strong className="text-zinc-400">{gating ? "ON" : "OFF"}</strong>
        {!gating ? " — existing users keep access until the owner enables MEMBERSHIP_GATING_ENABLED." : "."}
      </p>
    </div>
  );
}
