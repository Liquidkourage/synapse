import { getSiteSettings } from "@/lib/queries";
import { adminUpdateSiteSettings } from "@/actions/admin";

export default async function AdminSettingsPage() {
  const s = await getSiteSettings();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Site settings</h1>
      <form action={adminUpdateSiteSettings} className="max-w-xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <label className="block text-sm text-zinc-400">Site name</label>
          <input
            name="siteName"
            defaultValue={s.siteName}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400">Tagline</label>
          <input
            name="tagline"
            defaultValue={s.tagline ?? ""}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400">Hero title</label>
          <input
            name="heroTitle"
            defaultValue={s.heroTitle ?? ""}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400">Hero subtitle</label>
          <textarea
            name="heroSubtitle"
            rows={3}
            defaultValue={s.heroSubtitle ?? ""}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </div>
        <p className="text-xs text-zinc-500">
          Billing mode (read-only in PoC): <code className="text-zinc-400">{s.billingMode}</code>
        </p>
        <button
          type="submit"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
