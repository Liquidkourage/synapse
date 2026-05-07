import { auth } from "@/auth";
import { SiteChrome } from "@/components/site-chrome";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-0 min-h-dvh flex-1 flex-col bg-zinc-950 text-zinc-100">
      <SiteChrome session={session}>{children}</SiteChrome>
    </div>
  );
}
