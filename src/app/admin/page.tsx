import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/queries";
import { adminProcessNotificationOutbox } from "@/actions/notifications";

export default async function AdminHomePage() {
  const settings = await getSiteSettings();
  const featured = settings.featuredLiveEventId
    ? await prisma.event.findUnique({ where: { id: settings.featuredLiveEventId } })
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Admin overview</h1>
      <p className="text-zinc-400">
        You control the single featured live pointer, users, and homepage copy. Keep the network feeling intentional.
      </p>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-medium text-zinc-200">Featured live pointer</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {featured ? (
            <>
              Currently: <strong className="text-white">{featured.title}</strong> ({featured.slug})
            </>
          ) : (
            "None set — fallback uses time-effective LIVE."
          )}
        </p>
        <Link href="/admin/featured" className="mt-3 inline-block text-sm text-violet-400 hover:underline">
          Change featured event →
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-medium text-zinc-200">Notification outbox</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Send pending reminder emails (uses <code className="text-zinc-400">RESEND_API_KEY</code> when set; otherwise
          rows are marked processed without delivery).
        </p>
        <form action={adminProcessNotificationOutbox} className="mt-4">
          <button
            type="submit"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Process pending reminders
          </button>
        </form>
      </div>
    </div>
  );
}
