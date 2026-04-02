import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LocalDateTime } from "@/components/local-datetime";
import { getStreamEmbedUrl } from "@/lib/video-embed";

export default async function ArchivePage() {
  const entries = await prisma.archiveEntry.findMany({
    orderBy: { publishedAt: "desc" },
    include: { event: { include: { host: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Archive & on-demand</h1>
        <p className="mt-2 text-zinc-400">
          Replays, highlights, and oddities. Playback is embedded or external — we are not a CDN in V1.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {entries.map((a) => (
          <article
            key={a.id}
            id={a.slug}
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40"
          >
            {a.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.thumbnailUrl} alt="" className="h-48 w-full object-cover" />
            )}
            <div className="p-5">
              <h2 className="text-xl font-semibold text-white">{a.title}</h2>
              {a.description && <p className="mt-2 text-sm text-zinc-400">{a.description}</p>}
              <p className="mt-2 text-xs text-zinc-600">
                Published <LocalDateTime iso={a.publishedAt.toISOString()} />
                {a.event && (
                  <>
                    {" "}
                    · From event:{" "}
                    <Link href={`/events/${a.event.slug}`} className="text-violet-400 hover:underline">
                      {a.event.title}
                    </Link>
                  </>
                )}
              </p>
              {a.videoUrl && (
                <ArchiveVideoSection title={a.title} videoUrl={a.videoUrl} />
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {a.externalUrl && (
                  <a
                    href={a.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-zinc-600 px-4 py-1.5 text-sm text-zinc-200"
                  >
                    External link
                  </a>
                )}
              </div>
              {a.embedHtml && (
                <p className="mt-4 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 p-3 text-xs text-zinc-500">
                  Custom embed HTML is stored for this entry (sanitized rendering can be added in a later pass).
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      {entries.length === 0 && <p className="text-zinc-500">The archive is empty — producers are hoarding tapes.</p>}
    </div>
  );
}

function ArchiveVideoSection({ title, videoUrl }: { title: string; videoUrl: string }) {
  const embed = getStreamEmbedUrl(videoUrl);
  return (
    <div className="mt-4 space-y-3">
      {embed && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <iframe title={title} src={embed} className="h-full w-full border-0" allowFullScreen />
        </div>
      )}
      <a
        href={videoUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-full bg-violet-600 px-4 py-1.5 text-sm text-white hover:bg-violet-500"
      >
        {embed ? "Open in new tab" : "Watch replay"}
      </a>
    </div>
  );
}
