/**
 * Full-bleed horizontal layout: escape SiteShell main max-w-6xl so the live
 * canvas can use almost the full viewport width on desktop (minus safe padding).
 */
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="live-stage-bleed min-h-0 min-w-0 flex-1 overflow-x-clip bg-zinc-950">
      <div className="w-[100vw] max-w-[100vw] [margin-inline:calc(50%-50vw)] px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="mx-auto min-h-0 w-full">{children}</div>
      </div>
    </div>
  );
}
