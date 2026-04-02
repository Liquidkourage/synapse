import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, notificationPref: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Your account</h1>
        <p className="mt-2 text-zinc-400">
          Role: <span className="text-violet-300">{session.user.role}</span> · {session.user.email}
        </p>
      </div>
      <ProfileForm
        initialDisplayName={user?.profile?.displayName ?? ""}
        initialBio={user?.profile?.bio ?? ""}
        emailReminders={user?.notificationPref?.emailReminders ?? true}
      />
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">
        <h2 className="font-medium text-zinc-300">Notifications (placeholder)</h2>
        <p className="mt-2">
          Reminder emails are scaffolded in the data model. Wire to Resend/SendGrid when you are ready — no messages are
          sent in this PoC.
        </p>
      </section>
      <section className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 text-sm text-amber-200/90">
        <h2 className="font-medium text-amber-100">Billing (demo)</h2>
        <p className="mt-2 text-amber-200/80">
          Payments and tickets are placeholder-only. Any “subscribe” UI is labeled demo and does not charge cards.
        </p>
      </section>
    </div>
  );
}
