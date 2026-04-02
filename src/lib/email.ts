import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const fromDefault = process.env.RESEND_FROM_EMAIL ?? "Synapse <onboarding@resend.dev>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendWelcomeEmail(to: string, displayName?: string | null) {
  const resend = getResend();
  const name = displayName?.trim() || "there";

  if (resend) {
    const { error } = await resend.emails.send({
      from: fromDefault,
      to,
      subject: "You’re in — welcome to Synapse",
      html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for joining. Jump into the <a href="${process.env.AUTH_URL ?? "http://localhost:3000"}/schedule">schedule</a> and catch the next live show.</p><p>— Synapse</p>`,
    });
    if (error) {
      console.error("[email] Resend welcome error", error);
      return { ok: false as const, mode: "resend_error" as const, detail: String(error) };
    }
    return { ok: true as const, mode: "resend" as const };
  }

  console.info(`[email] stub welcome → ${to}`);
  return { ok: true as const, mode: "stub" as const };
}

export async function sendEventReminderEmail(to: string, eventTitle: string, eventUrl: string) {
  const resend = getResend();
  if (resend) {
    const { error } = await resend.emails.send({
      from: fromDefault,
      to,
      subject: `Reminder: ${eventTitle}`,
      html: `<p>Heads up — <strong>${escapeHtml(eventTitle)}</strong> is coming up.</p><p><a href="${escapeHtml(eventUrl)}">Open event</a></p>`,
    });
    if (error) {
      console.error("[email] Resend reminder error", error);
      return { ok: false as const };
    }
    return { ok: true as const };
  }
  console.info(`[email] stub reminder → ${to} for ${eventTitle}`);
  return { ok: true as const };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Process unsent rows in NotificationOutbox (event_reminder). Call from admin or a cron job. */
export async function processNotificationOutbox(limit = 25) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const pending = await prisma.notificationOutbox.findMany({
    where: { sentAt: null },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;
  for (const row of pending) {
    if (row.type !== "event_reminder") {
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: { sentAt: new Date() },
      });
      continue;
    }
    let payload: { eventId?: string; minutesBefore?: number };
    try {
      payload = JSON.parse(row.payload) as { eventId?: string; minutesBefore?: number };
    } catch {
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: { sentAt: new Date() },
      });
      continue;
    }
    const eventId = payload.eventId;
    if (!eventId) continue;

    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!user || !event) {
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: { sentAt: new Date() },
      });
      continue;
    }

    const pref = await prisma.notificationPreference.findUnique({ where: { userId: user.id } });
    if (pref && !pref.emailReminders) {
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: { sentAt: new Date() },
      });
      continue;
    }

    const url = `${baseUrl}/events/${event.slug}`;
    const result = await sendEventReminderEmail(user.email, event.title, url);
    if (result.ok) {
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: { sentAt: new Date() },
      });
      sent += 1;
    }
  }

  return { processed: pending.length, sent };
}
