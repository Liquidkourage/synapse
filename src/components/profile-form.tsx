"use client";

import { useFormStatus } from "react-dom";
import { updateProfile } from "@/actions/profile";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function ProfileForm({
  initialDisplayName,
  initialBio,
  emailReminders,
}: {
  initialDisplayName: string;
  initialBio: string;
  emailReminders: boolean;
}) {
  return (
    <form action={updateProfile} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div>
        <label className="block text-sm text-zinc-400">Display name</label>
        <input
          name="displayName"
          defaultValue={initialDisplayName}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Bio</label>
        <textarea
          name="bio"
          defaultValue={initialBio}
          rows={4}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Email reminders preference (stored): {emailReminders ? "on" : "off"} — toggling can be wired later.
      </p>
      <SaveButton />
    </form>
  );
}
