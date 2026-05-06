import { normalizeVenmoHandle, venmoProfileUrl } from "@/lib/venmo-url";

type Props = {
  handle: string | null | undefined;
  /** Tighter layout for /live event card */
  compact?: boolean;
};

/**
 * In-page “widget” card — opens Venmo in a new tab. Venmo does not provide consumer profile iframes.
 */
export function EventVenmoTipBlock({ handle, compact = false }: Props) {
  const h = normalizeVenmoHandle(handle ?? null);
  if (!h) return null;

  const href = venmoProfileUrl(h);

  return (
    <div
      className={`rounded-xl border border-[#008cff]/35 bg-[#008cff]/10 ${compact ? "p-3" : "p-4"}`}
    >
      <p className={`font-medium text-white ${compact ? "text-sm" : "text-base"}`}>Support the show</p>
      <p className={`mt-1 text-zinc-400 ${compact ? "text-xs" : "text-sm"}`}>
        Tip or pay on Venmo — you&apos;ll leave Synapse to complete payment in Venmo.
      </p>
      <div className={`mt-3 flex flex-wrap items-center gap-2 ${compact ? "" : "gap-3"}`}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full bg-[#008cff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0078e0]"
        >
          Open Venmo
        </a>
        <span className={`text-zinc-500 ${compact ? "text-xs" : "text-sm"}`}>@{h}</span>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-zinc-600">
        Synapse is not affiliated with Venmo. Links go to venmo.com; use only handles you trust.
      </p>
    </div>
  );
}

/** Inline link for footers / menus */
export function EventVenmoLink({ handle }: { handle: string | null | undefined }) {
  const h = normalizeVenmoHandle(handle ?? null);
  if (!h) return null;
  return (
    <a
      href={venmoProfileUrl(h)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#6ec5ff] hover:underline"
    >
      Venmo @{h}
    </a>
  );
}
