import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const r = session.user.role;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="mt-2 text-zinc-400">Pick your lane — desktop-first tools live here.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(r === "ADMIN" || r === "PRODUCER" || r === "HOST") && (
          <Link
            href="/host/events"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-violet-500/40"
          >
            <h2 className="font-semibold text-white">Host · Events</h2>
            <p className="mt-2 text-sm text-zinc-500">Create and edit your shows, links, and embeds.</p>
          </Link>
        )}
        {(r === "ADMIN" || r === "PRODUCER") && (
          <Link
            href="/producer"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-violet-500/40"
          >
            <h2 className="font-semibold text-white">Producer</h2>
            <p className="mt-2 text-sm text-zinc-500">Admin-lite: events, archive, statuses.</p>
          </Link>
        )}
        {r === "ADMIN" && (
          <Link
            href="/admin"
            className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-950/20 p-6 hover:border-fuchsia-400/40"
          >
            <h2 className="font-semibold text-fuchsia-200">Admin</h2>
            <p className="mt-2 text-sm text-fuchsia-200/70">Users, featured live, site settings, metrics.</p>
          </Link>
        )}
        <Link
          href="/account"
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-violet-500/40"
        >
          <h2 className="font-semibold text-white">Account</h2>
          <p className="mt-2 text-sm text-zinc-500">Profile and placeholder prefs.</p>
        </Link>
      </div>
    </div>
  );
}
