import Link from "next/link";
import type { Session } from "next-auth";

export function BroadcastRestrictedNotice({ session }: { session: Session | null }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-4">
      <p className="text-sm font-medium text-amber-200">Video room — host only</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        This event limits the Synapse video embed to the host (and assigned producer / admins). Sign in as the host to
        join the call from this site. Everyone else can use the game links and chat on this page.
      </p>
      <p className="mt-2 text-xs text-zinc-600">
        Anyone with the raw room link could still open it in another tab — for stricter enforcement, use Daily private
        rooms and tokens.
      </p>
      {!session ? (
        <p className="mt-3">
          <Link href="/login" className="text-sm text-violet-400 hover:underline">
            Log in
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-xs text-zinc-600">
          You’re signed in, but not as the host — switch accounts or ask the host to open this page to join from Synapse.
        </p>
      )}
    </div>
  );
}
