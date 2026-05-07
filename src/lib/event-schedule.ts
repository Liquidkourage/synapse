import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const LOCAL_DT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DURATION = /^(\d{1,3}):(\d{2})$/;

/** Throws if `timeZone` is not a usable IANA name for Intl. */
export function assertValidIanaTimeZone(timeZone: string): void {
  const tz = timeZone.trim();
  if (!tz) throw new Error("Timezone is required");
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
  } catch {
    throw new Error(`Invalid IANA timezone: ${tz}`);
  }
}

/**
 * Parses `YYYY-MM-DDTHH:mm` as wall time in `timeZone` and returns the UTC instant.
 */
export function parseEventStartInTimeZone(localDateTime: string, timeZone: string): Date {
  const trimmed = localDateTime.trim();
  if (!LOCAL_DT.test(trimmed)) {
    throw new Error("Start must be YYYY-MM-DDTHH:mm");
  }
  return fromZonedTime(`${trimmed}:00`, timeZone.trim());
}

export function parseDurationHhMm(input: string): { hours: number; minutes: number } {
  const m = DURATION.exec(input.trim());
  if (!m) {
    throw new Error("Duration must be hours:minutes (e.g. 2:30 or 02:30)");
  }
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isInteger(hours) || hours < 0 || hours > 168) {
    throw new Error("Hours must be 0–168");
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    throw new Error("Minutes must be 00–59");
  }
  if (hours === 0 && minutes === 0) {
    throw new Error("Duration must be greater than zero");
  }
  return { hours, minutes };
}

export function addDurationToStart(startUtc: Date, duration: { hours: number; minutes: number }): Date {
  return new Date(startUtc.getTime() + (duration.hours * 3600 + duration.minutes * 60) * 1000);
}

/** Formats start instant as `YYYY-MM-DDTHH:mm` in the event timezone (for datetime-local). */
export function formatStartForDatetimeLocal(startUtc: Date, timeZone: string): string {
  return formatInTimeZone(startUtc, timeZone.trim(), "yyyy-MM-dd'T'HH:mm");
}

/** Derives a duration string from stored start/end (minimum 15 minutes if data is odd). */
export function formatDurationHhMm(start: Date, end: Date): string {
  let totalMin = Math.round((end.getTime() - start.getTime()) / 60000);
  if (!Number.isFinite(totalMin) || totalMin < 15) {
    totalMin = 120;
  }
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
