import { adminSetMembershipGrant, adminUpsertCreatorProfile } from "@/actions/membership";
import { isMembershipGatingEnabled } from "@/lib/membership-gating";
import { prisma } from "@/lib/prisma";

async function AllocationAggregates() {
  const lines = await prisma.supportAllocationLine.findMany({
    where: { preference: { confirmed: true } },
    include: { creator: { select: { creatorSlug: true, name: true } } },
  });
  const totals = new Map<string, { label: string; bps: number }>();
  for (const line of lines) {
    const key = line.creatorId ?? "__UNALLOCATED__";
    const label = line.creatorId
      ? line.creator?.creatorSlug || line.creator?.name || line.creatorId
      : "UNALLOCATED pool";
    const prev = totals.get(key) ?? { label, bps: 0 };
    prev.bps += line.weightBps;
    totals.set(key, prev);
  }
  const rows = [...totals.values()].sort((a, b) => b.bps - a.bps);
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No confirmed preferences yet.</p>;
  }
  return (
    <ul className="space-y-1 text-sm text-zinc-400">
      {rows.map((r) => (
        <li key={r.label}>
          {r.label}: {(r.bps / 100).toFixed(1)}% of confirmed preference weight-mass
        </li>
      ))}
    </ul>
  );
}

export default async function AdminMembershipsPage() {
  const [users, creators, gating] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { membership: true },
    }),
    prisma.user.findMany({
      where: { creatorSlug: { not: null } },
      orderBy: { creatorSlug: "asc" },
      include: { referralCodes: true },
    }),
    Promise.resolve(isMembershipGatingEnabled()),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Memberships & creators</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Pilot grants and creator referral setup. Participation gating is{" "}
          <strong className={gating ? "text-amber-300" : "text-emerald-300"}>{gating ? "ENABLED" : "DISABLED"}</strong>
          {" "}(env <code className="text-zinc-400">MEMBERSHIP_GATING_ENABLED</code>).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-200">Creator profiles</h2>
        <form action={adminUpsertCreatorProfile} className="grid gap-2 rounded-xl border border-zinc-800 p-4 sm:grid-cols-2">
          <label className="text-xs text-zinc-500 sm:col-span-2">
            User id
            <input name="userId" required className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white" />
          </label>
          <label className="text-xs text-zinc-500">
            Creator slug
            <input name="creatorSlug" required placeholder="trivia-jane" className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white" />
          </label>
          <label className="text-xs text-zinc-500">
            Referral code (optional; defaults to slug)
            <input name="referralCode" placeholder="jane" className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white" />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
            <input type="checkbox" name="creatorActive" defaultChecked /> Active creator (listed for allocations)
          </label>
          <button type="submit" className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white sm:col-span-2">
            Save creator
          </button>
        </form>
        <ul className="space-y-1 text-sm text-zinc-400">
          {creators.map((c) => (
            <li key={c.id}>
              <span className="text-zinc-200">{c.creatorSlug}</span>
              {c.creatorActive ? " · active" : " · inactive"} · /creators/{c.creatorSlug}
              {c.referralCodes[0] ? (
                <>
                  {" "}
                  · /r/{c.referralCodes[0].code}
                </>
              ) : null}
              <span className="text-zinc-600"> · {c.id}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-200">Allocation preference aggregates</h2>
        <p className="text-xs text-zinc-600">
          Sum of confirmed preference weights (basis points). This is <strong className="text-zinc-400">not</strong> a
          liability or payout ledger.
        </p>
        <AllocationAggregates />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-200">Admin membership grants</h2>
        <p className="text-xs text-zinc-600">
          Distinct from Stripe: source=<code className="text-zinc-400">ADMIN_GRANT</code>. Does not overwrite an active
          Stripe membership when granting.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-900/80 text-zinc-500">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Membership</th>
                <th className="px-3 py-2">Grant / revoke</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-300">
                    {u.email}
                    <div className="text-[11px] text-zinc-600">{u.id}</div>
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {u.membership ? (
                      <>
                        {u.membership.status} · {u.membership.source}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <form action={adminSetMembershipGrant} className="flex flex-wrap items-center gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        name="note"
                        placeholder="note"
                        className="w-28 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-xs text-white"
                      />
                      <button name="action" value="grant" className="text-xs text-emerald-400 hover:underline">
                        Grant
                      </button>
                      <button name="action" value="revoke" className="text-xs text-amber-400 hover:underline">
                        Revoke
                      </button>
                      <button name="action" value="expire" className="text-xs text-zinc-500 hover:underline">
                        Expire
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
