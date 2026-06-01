import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ZoomConnectButton } from "@/components/zoom-connect-button";
import { isHostOrAbove } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getZoomOAuthConfig } from "@/lib/zoom-config";

export default async function HostZoomSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isHostOrAbove(session.user.role)) {
    redirect("/login");
  }

  const { connected, error } = await searchParams;
  const zoomOAuth = getZoomOAuthConfig();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      zoomAccessToken: true,
      zoomAccountEmail: true,
      zoomConnectedAt: true,
    },
  });

  const isConnected = !!user?.zoomAccessToken;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <Link href="/host/events" className="text-sm text-violet-400 hover:underline">
          ← Host events
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-white">Zoom for hosts</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Connect your Zoom account so Synapse can schedule meetings on your behalf. Breakout rooms and{" "}
          <strong className="font-medium text-zinc-300">broadcast voice to breakout rooms</strong> use your Zoom plan and
          portal settings.
        </p>
      </div>

      {connected ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200/90">
          Zoom connected successfully.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-200/90">
          {decodeURIComponent(error)}
        </p>
      ) : null}

      {!zoomOAuth.configured ? (
        <p className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
          Zoom is not configured on this server. An admin must set{" "}
          <code className="text-zinc-300">ZOOM_CLIENT_ID</code> and <code className="text-zinc-300">ZOOM_CLIENT_SECRET</code>{" "}
          (see README).
        </p>
      ) : (
        <div className="rounded-xl border border-sky-500/30 bg-sky-950/15 p-4">
          <ZoomConnectButton connected={isConnected} accountEmail={user?.zoomAccountEmail} />
          {user?.zoomConnectedAt ? (
            <p className="mt-3 text-xs text-zinc-600">
              Connected {user.zoomConnectedAt.toLocaleString()}
            </p>
          ) : null}
        </div>
      )}

      <section className="space-y-2 text-sm text-zinc-500">
        <h2 className="font-medium text-zinc-300">Breakouts checklist</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>In Zoom web portal → Settings → Meeting, enable Breakout room.</li>
          <li>Enable &quot;Broadcast voice to breakout rooms&quot; (Zoom 5.12+).</li>
          <li>On events, choose <strong className="text-zinc-400">Zoom (your account)</strong> and Meeting with breakout rooms.</li>
        </ul>
      </section>
    </div>
  );
}
