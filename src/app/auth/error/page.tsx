import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const isConfiguration = error === "Configuration";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-white">Authentication error</h1>
      {isConfiguration ? (
        <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-zinc-200">
          <p className="font-medium text-amber-100">Server configuration (code: Configuration)</p>
          <p className="text-zinc-300">
            Auth.js needs a signing secret and a canonical site URL. Set them in{" "}
            <code className="text-zinc-200">.env</code> (local) or your host&apos;s environment
            (e.g. Railway):
          </p>
          <ul className="list-inside list-disc space-y-1 text-zinc-400">
            <li>
              <code className="text-zinc-200">AUTH_SECRET</code> — long random string (e.g.{" "}
              <code className="text-zinc-200">openssl rand -base64 32</code>)
            </li>
            <li>
              <code className="text-zinc-200">AUTH_URL</code> — must match the address bar exactly:
              same <strong className="text-zinc-300">scheme</strong> (<code className="text-zinc-200">http</code> vs{" "}
              <code className="text-zinc-200">https</code>), <strong className="text-zinc-300">host</strong>, and{" "}
              <strong className="text-zinc-300">port</strong>. Examples:{" "}
              <code className="text-zinc-200">http://localhost:3000</code>,{" "}
              <code className="text-zinc-200">https://localhost:8080</code>, or{" "}
              <code className="text-zinc-200">https://your-app.up.railway.app</code> — no trailing
              slash.
            </li>
          </ul>
          <p className="text-zinc-400">
            If you use port 8080 locally, set <code className="text-zinc-200">AUTH_URL</code> to
            that origin (not <code className="text-zinc-200">:3000</code>). Restart the dev server
            after changing <code className="text-zinc-200">.env</code>.
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error
            ? `Something went wrong while signing in (code: ${error}).`
            : "Something went wrong while signing in."}
        </p>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-violet-400 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
