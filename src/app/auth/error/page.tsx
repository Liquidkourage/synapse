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
            Auth needs a signing secret and a public URL in production. In Railway (or any host),
            set:
          </p>
          <ul className="list-inside list-disc space-y-1 text-zinc-400">
            <li>
              <code className="text-zinc-200">AUTH_SECRET</code> — long random string (e.g.{" "}
              <code className="text-zinc-200">openssl rand -base64 32</code>)
            </li>
            <li>
              <code className="text-zinc-200">AUTH_URL</code> — your site origin only, e.g.{" "}
              <code className="text-zinc-200">https://your-app.up.railway.app</code> (no trailing
              slash)
            </li>
          </ul>
          <p className="text-zinc-400">
            Redeploy after saving variables. See the project README environment table.
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
