/**
 * Live route: horizontal space comes from SiteShell (max-w-none on /live via x-pathname).
 * This wrapper only participates in the flex height chain.
 */
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>;
}
