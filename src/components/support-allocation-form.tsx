"use client";

import { useMemo, useState } from "react";
import {
  confirmReferralCreatorAllocation,
  keepUnallocatedSupport,
  saveMySupportAllocations,
} from "@/actions/allocations";
import { ALLOCATION_TOTAL_BPS } from "@/lib/support-allocations";

type CreatorOpt = { id: string; label: string };
type Line = { creatorId: string | null; weightBps: number };

export function SupportAllocationForm({
  creators,
  initialLines,
  suggestedCreatorId,
  suggestedCreatorLabel,
  confirmed,
}: {
  creators: CreatorOpt[];
  initialLines: Line[];
  suggestedCreatorId: string | null;
  suggestedCreatorLabel: string | null;
  confirmed: boolean;
}) {
  const [lines, setLines] = useState<Line[]>(
    initialLines.length ? initialLines : [{ creatorId: null, weightBps: ALLOCATION_TOTAL_BPS }],
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sum = useMemo(() => lines.reduce((a, l) => a + l.weightBps, 0), [lines]);
  const sumOk = sum === ALLOCATION_TOTAL_BPS;

  const setPct = (index: number, pct: number) => {
    const bps = Math.round(Math.min(100, Math.max(0, pct)) * 100);
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, weightBps: bps } : l)));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div>
        <h2 className="font-medium text-zinc-100">Creator support preferences</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Direct your share of the <strong className="text-zinc-400">subscriber-directed pool</strong> (conceptually 30%
          of distributable revenue). This is a <strong className="text-zinc-400">preference</strong>, not a wallet,
          payment, or amount owed. Automated payouts are not part of v0.1.
        </p>
      </div>

      {suggestedCreatorId && !confirmed ? (
        <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-3 text-sm text-violet-100">
          <p>
            You arrived via <strong>{suggestedCreatorLabel ?? "a creator"}</strong>. We can preselect them for your
            support preference — confirm to apply, or keep the unallocated pool.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              onClick={async () => {
                setBusy(true);
                const r = await confirmReferralCreatorAllocation();
                setStatus(r.ok ? "Confirmed — 100% to that creator (you can change anytime)." : r.error ?? "Failed");
                setBusy(false);
                if (r.ok) window.location.reload();
              }}
            >
              Confirm {suggestedCreatorLabel ?? "creator"} (100%)
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
              onClick={async () => {
                setBusy(true);
                await keepUnallocatedSupport();
                setBusy(false);
                window.location.reload();
              }}
            >
              Keep unallocated pool
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <select
              className="min-w-[10rem] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white"
              value={line.creatorId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setLines((prev) =>
                  prev.map((l, idx) => (idx === i ? { ...l, creatorId: v === "" ? null : v } : l)),
                );
              }}
            >
              <option value="">Unallocated pool</option>
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-zinc-400">
              <input
                type="number"
                min={0}
                max={100}
                className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white"
                value={Math.round(line.weightBps / 100)}
                onChange={(e) => setPct(i, Number(e.target.value))}
              />
              %
            </label>
            <button
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-300"
              onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
          onClick={() => setLines((prev) => [...prev, { creatorId: null, weightBps: 0 }])}
        >
          Add line
        </button>
        <span className={`text-xs ${sumOk ? "text-zinc-500" : "text-amber-300"}`}>
          Total: {(sum / 100).toFixed(0)}% {sumOk ? "" : "(must be 100%)"}
        </span>
      </div>

      <button
        type="button"
        disabled={busy || !sumOk}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          const fd = new FormData();
          fd.set("linesJson", JSON.stringify(lines));
          const r = await saveMySupportAllocations(fd);
          setStatus(r.ok ? "Saved preferences." : r.error ?? "Save failed");
          setBusy(false);
        }}
      >
        Save preferences
      </button>
      {status ? <p className="text-xs text-zinc-400">{status}</p> : null}
    </section>
  );
}
