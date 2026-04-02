import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl = "/", error } = await searchParams;

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
      <LoginForm callbackUrl={callbackUrl} />
      <p className="text-center text-sm text-zinc-500">
        New here?{" "}
        <Link href="/signup" className="text-violet-400 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
