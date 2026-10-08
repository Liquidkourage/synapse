import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Create your free account</h1>
        <p className="mt-2 text-zinc-400">
          A free Synapse account is your identity on the network — browse, follow creators, and manage preferences.
          Paid membership for full show participation is separate; card checkout is not required to register.
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:underline">
          Sign in
        </Link>
      </p>
      <p className="text-center text-sm text-zinc-600">
        Curious about all-access?{" "}
        <Link href="/subscribe" className="text-violet-400 hover:underline">
          Membership info
        </Link>
      </p>
    </div>
  );
}
