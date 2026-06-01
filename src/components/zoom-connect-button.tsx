"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ZoomConnectButton({
  connected,
  accountEmail,
}: {
  connected: boolean;
  accountEmail?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-emerald-200/90">
          Connected{accountEmail ? ` as ${accountEmail}` : ""}.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await fetch("/api/host/zoom/disconnect", { method: "POST" });
            router.refresh();
            setPending(false);
          }}
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <a
      href="/api/zoom/oauth/authorize"
      className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
    >
      Connect Zoom account
    </a>
  );
}
