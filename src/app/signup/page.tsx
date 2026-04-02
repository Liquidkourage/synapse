import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Join Synapse</h1>
        <p className="mt-2 text-zinc-400">Player accounts are free in this proof of concept.</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
