import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { LoginForm } from "@/components/login-form";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; email?: string }>;
}) {
  const { callbackUrl: rawCallback = "/", error, email: emailParam } = await searchParams;
  const initialEmail = emailParam?.trim() ?? "";
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseOrigin = `${proto}://${host}`;
  const callbackUrl = safeCallbackUrl(rawCallback, baseOrigin);

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Welcome back</h1>
        <p className="mt-2 text-zinc-400">Sign in to join the network.</p>
      </div>
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          Could not sign you in. Check email and password.
        </p>
      )}
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <LoginForm callbackUrl={callbackUrl} initialEmail={initialEmail} />
      </Suspense>
      <p className="text-center text-sm text-zinc-500">
        New here?{" "}
        <Link href="/signup" className="text-violet-400 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
