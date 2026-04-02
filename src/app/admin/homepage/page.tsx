import { prisma } from "@/lib/prisma";
import { adminAddHomepageBlock } from "@/actions/admin";

export default async function AdminHomepagePage() {
  const blocks = await prisma.homepageBlock.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Homepage blocks</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Lightweight rails metadata. The homepage still pulls live/upcoming/archive from events — blocks are for extra
          labeling and ordering.
        </p>
      </div>
      <ul className="space-y-2">
        {blocks.map((b) => (
          <li key={b.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300">
            <span className="font-medium text-white">{b.title}</span>{" "}
            <span className="text-zinc-600">({b.blockType})</span>
          </li>
        ))}
        {blocks.length === 0 && <li className="text-zinc-500">No custom blocks yet.</li>}
      </ul>
      <form action={adminAddHomepageBlock} className="max-w-xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <label className="block text-sm text-zinc-400">Title</label>
          <input name="title" required className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white" />
        </div>
        <div>
          <label className="block text-sm text-zinc-400">Block type</label>
          <select name="blockType" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
            <option value="upcoming">upcoming</option>
            <option value="archive">archive</option>
            <option value="custom_events">custom_events</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-zinc-400">Sort order</label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={0}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Add block
        </button>
      </form>
    </div>
  );
}
