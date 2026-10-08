"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  ALLOCATION_TOTAL_BPS,
  confirmSuggestedCreatorAllocation,
  normalizeAllocationLines,
  saveAllocationPreference,
  type AllocationLineInput,
} from "@/lib/support-allocations";
import { z } from "zod";

export async function saveMySupportAllocations(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in required" };

  const raw = String(formData.get("linesJson") || "[]");
  let parsed: AllocationLineInput[];
  try {
    parsed = z
      .array(
        z.object({
          creatorId: z.string().nullable(),
          weightBps: z.number().int().min(0).max(ALLOCATION_TOTAL_BPS),
        }),
      )
      .parse(JSON.parse(raw));
  } catch {
    return { ok: false as const, error: "Invalid allocation payload" };
  }

  const lines = normalizeAllocationLines(parsed);
  try {
    await saveAllocationPreference({
      userId: session.user.id,
      lines,
      reason: "USER_EDIT",
      confirm: true,
      clearSuggestion: true,
    });
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Save failed" };
  }

  revalidatePath("/account");
  return { ok: true as const };
}

export async function confirmReferralCreatorAllocation() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in required" };
  const result = await confirmSuggestedCreatorAllocation(session.user.id);
  revalidatePath("/account");
  return result;
}

export async function keepUnallocatedSupport() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in required" };
  await saveAllocationPreference({
    userId: session.user.id,
    lines: [{ creatorId: null, weightBps: ALLOCATION_TOTAL_BPS }],
    reason: "USER_EDIT",
    confirm: true,
    clearSuggestion: true,
  });
  revalidatePath("/account");
  return { ok: true as const };
}
