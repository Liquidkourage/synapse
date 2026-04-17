"use server";

import { headers } from "next/headers";
import { CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

export type LoginState = { ok: true } | { ok: false; error: string };

export async function loginWithCredentials(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrlRaw = (formData.get("callbackUrl") as string) || "/";

  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false, error: "Invalid credentials." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseOrigin = `${proto}://${host}`;
  const callbackUrl = safeCallbackUrl(callbackUrlRaw, baseOrigin);

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: callbackUrl,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      return { ok: false, error: "Invalid credentials." };
    }
    throw e;
  }
}
