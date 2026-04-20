/**
 * Full-bleed horizontal layout: escape SiteShell main max-w-6xl so the live
 * canvas can use almost the full viewport width on desktop (minus safe padding).
 */
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="live-stage-bleed flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip bg-zinc-950">
      {/* Flex column + flex-1 so /live inherits main height; 100vw breakout alone was auto-height and collapsed grid 1fr rows */}
      <div className="flex min-h-0 w-[100vw] max-w-[100vw] flex-1 flex-col [margin-inline:calc(50%-50vw)] px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="mx-auto flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
