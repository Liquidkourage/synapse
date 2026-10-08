"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { SignOutButton } from "@/components/sign-out-button";
import { isStagePath } from "@/lib/stage-path";

const primaryNav = [
  { href: "/live", label: "Live" },
  { href: "/schedule", label: "Schedule" },
  { href: "/creators", label: "Creators" },
  { href: "/subscribe", label: "Membership" },
] as const;

export function SiteChrome({ session, children }: { session: Session | null; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith("/embed/")) {
    return <>{children}</>;
  }

  const stage = isStagePath(pathname);

  const headerInner =
    "mx-auto flex items-center justify-between gap-3 py-3 " +
    (stage ? "w-full max-w-none px-4 sm:px-5 lg:px-6" : "max-w-6xl px-4");

  const mainClass = stage
    ? "mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col px-0 pb-0 pt-3 sm:pt-4"
    : "mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-8";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800/90 bg-zinc-950/90 backdrop-blur-md">
        <div className={headerInner}>
          <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-violet-300">
            Synapse
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 text-sm">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                className={
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                }
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
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
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className={mainClass}>{children}</main>
      <footer
        className={`border-t border-zinc-800 py-8 text-sm text-zinc-500 ${stage ? "px-4 sm:px-6" : ""}`}
      >
        <div className={`mx-auto space-y-3 ${stage ? "max-w-none" : "max-w-6xl px-4"}`}>
          <p className="font-medium text-zinc-400">Synapse — live interactive entertainment, one network.</p>
          <p className="text-xs leading-relaxed text-zinc-600">
            Don&apos;t just watch. Be part of the show. One membership for eligible programming across independent
            creators.
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href="/schedule" className="hover:text-zinc-300">
              Schedule
            </Link>
            <Link href="/creators" className="hover:text-zinc-300">
              Creators
            </Link>
            <Link href="/subscribe" className="hover:text-zinc-300">
              Membership
            </Link>
            <Link href="/podcasts" className="hover:text-zinc-300">
              Podcasts
            </Link>
            <Link href="/archive" className="hover:text-zinc-300">
              Archive
            </Link>
            <Link href="/search" className="hover:text-zinc-300">
              Search
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
