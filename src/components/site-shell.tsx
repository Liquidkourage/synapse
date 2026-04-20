import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const liveFullWidth = pathname === "/live" || pathname.startsWith("/live/");

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-violet-500/20 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight text-violet-300">
            Synapse
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link className="text-zinc-400 hover:text-white" href="/live">
              Live
            </Link>
            <Link className="text-zinc-400 hover:text-white" href="/schedule">
              Schedule
            </Link>
            <Link className="text-zinc-400 hover:text-white" href="/archive">
              Archive
            </Link>
            <Link className="text-zinc-400 hover:text-white" href="/search">
              Search
            </Link>
            {session?.user ? (
              <>
                {(session.user.role === "ADMIN" ||
                  session.user.role === "PRODUCER" ||
                  session.user.role === "HOST") && (
                  <Link className="text-amber-300/90 hover:text-amber-200" href="/dashboard">
                    Dashboard
                  </Link>
                )}
                {session.user.role === "ADMIN" && (
                  <Link className="text-fuchsia-300/90 hover:text-fuchsia-200" href="/admin">
                    Admin
                  </Link>
                )}
                <Link className="text-zinc-400 hover:text-white" href="/account">
                  Account
                </Link>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link className="text-zinc-400 hover:text-white" href="/login">
                  Sign in
                </Link>
                <Link
                  className="rounded-full bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
                  href="/signup"
                >
                  Join
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main
        className={
          liveFullWidth
            ? "mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col px-3 py-8 sm:px-5 lg:px-6 xl:px-8"
            : "mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-8"
        }
      >
        {children}
      </main>
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
        Synapse — network-style trivia discovery. Third-party games, one live moment at a time.
      </footer>
    </div>
  );
}
