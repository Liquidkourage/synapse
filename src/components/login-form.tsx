"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

export function LoginForm({
  callbackUrl,
  initialEmail = "",
}: {
  callbackUrl: string;
  initialEmail?: string;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [strippedPasswordFromUrl, setStrippedPasswordFromUrl] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");

  /** Strip `?password=` from the URL once. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("password")) return;
    setStrippedPasswordFromUrl(true);
    params.delete("password");
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login", { scroll: false });
  }, [router]);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const res = await signIn("credentials", { email, password, redirect: false });
        setPending(false);
        if (res?.error) {
          setErr("Invalid credentials.");
          return;
        }
        const next = safeCallbackUrl(callbackUrl, window.location.origin);
        router.push(next);
        router.refresh();
      }}
    >
      {strippedPasswordFromUrl && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          Passwords can&apos;t be used from the address bar (it isn&apos;t secure). Enter your
          password below and sign in.
        </p>
      )}
      <div>
        <label className="block text-sm text-zinc-400">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
