"use client";

import { useState } from "react";

/** Single `coverImageUrl` field: paste a URL or upload (writes to same hidden input). */
export function CoverImageInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue);

  return (
    <div>
      <label className="block text-sm text-zinc-400">Cover image</label>
      <input type="hidden" name="coverImageUrl" value={url} />
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        />
        <label className="text-sm text-zinc-400">
          <span className="mr-2">or upload</span>
          <input
            type="file"
            accept="image/*"
            className="text-xs file:mr-2 file:rounded file:bg-zinc-800 file:px-2 file:py-1"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append("file", f);
              const res = await fetch("/api/upload", { method: "POST", body: fd });
              if (!res.ok) return;
              const data = (await res.json()) as { url?: string };
              if (data.url) setUrl(data.url);
            }}
          />
        </label>
      </div>
    </div>
  );
}
