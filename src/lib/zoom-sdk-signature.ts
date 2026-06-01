import { SignJWT } from "jose";
import { getZoomMeetingSdkConfig } from "@/lib/zoom-config";

/** Meeting SDK signature (role 0 = participant, 1 = host). */
export async function createZoomMeetingSdkSignature(
  meetingNumber: string,
  role: 0 | 1,
): Promise<string | null> {
  const { sdkKey, sdkSecret } = getZoomMeetingSdkConfig();
  if (!sdkKey || !sdkSecret) return null;

  const mn = meetingNumber.replace(/\D/g, "");
  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const secret = new TextEncoder().encode(sdkSecret);

  return new SignJWT({
    sdkKey,
    appKey: sdkKey,
    mn,
    role,
    tokenExp: exp,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secret);
}
