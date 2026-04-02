export function StreamingEmbedUnavailable() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-4">
      <p className="text-sm font-medium text-amber-200">Streaming video could not be loaded</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        In streaming mode, Synapse only shows a Daily link that blocks camera/mic for viewers. The viewer token
        could not be created — check <code className="text-zinc-400">DAILY_API_KEY</code> and server logs. The
        host may still see video if Daily returned a fallback URL.
      </p>
    </div>
  );
}
