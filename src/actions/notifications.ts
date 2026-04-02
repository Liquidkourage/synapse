"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { processNotificationOutbox } from "@/lib/email";

export async function adminProcessNotificationOutbox() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return;
  }
  await processNotificationOutbox();
  revalidatePath("/admin");
}
