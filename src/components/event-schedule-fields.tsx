"use client";

import { addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { useEffect, useMemo, useRef, useState } from "react";

const CUSTOM_TZ = "__custom__";
/** Remember host's last-used IANA zone on this device (new events + updates when you change the dropdown). */
const HOST_PREFERRED_TIMEZONE_KEY = "synapse-host-preferred-timezone";

/** Stable prefix so labels/ids stay unique if the form is ever duplicated. */
const P = "esch";

const ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (US & Canada)" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris / Central Europe" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "UTC", label: "UTC" },
];

function localTodayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function splitStart(startAt: string): { date: string; time: string } {
  const t = startAt.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) {
    const [date, time] = t.split("T");
    return { date, time };
  }
  return { date: "", time: "20:00" };
}

function splitDuration(dur: string): { h: number; m: number } {
  const m = /^(\d{1,3}):(\d{2})$/.exec(dur.trim());
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (Number.isFinite(h) && Number.isFinite(min)) return { h, m: min };
  }
  return { h: 2, m: 0 };
}

const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const HOURS = Array.from({ length: 169 }, (_, i) => i);

function normalizeDurationInit(dur: string): { h: number; m: number } {
  const { h: rawH, m: rawM } = splitDuration(dur);
  const h = Math.min(168, Math.max(0, rawH));
  const m = Math.min(59, Math.max(0, rawM));
  if (h === 0 && m === 0) return { h: 0, m: 15 };
  return { h, m };
}

function loadPreferredTimezone(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(HOST_PREFERRED_TIMEZONE_KEY)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

function persistPreferredTimezone(tz: string) {
  try {
    const t = tz.trim();
    if (t) localStorage.setItem(HOST_PREFERRED_TIMEZONE_KEY, t);
  } catch {
    /* */
  }
}

function buildAccessibleSummary(date: string, timeHm: string, tz: string, durH: number, durM: number): string {
  if (!date || !timeHm?.trim() || !tz.trim()) {
    return "Select a date, time, and timezone to see a full summary.";
  }
  const wall = `${date}T${timeHm.slice(0, 5)}:00`;
  try {
    assertValidIanaForDisplay(tz);
    const startInst = fromZonedTime(wall, tz);
    const startLine = formatInTimeZone(startInst, tz, "EEEE, MMMM d, yyyy 'at' h:mm a (zzzz)");
    const endInst = addMinutes(startInst, durH * 60 + durM);
    const endLine = formatInTimeZone(endInst, tz, "h:mm a (zzzz)");
    const durParts: string[] = [];
    if (durH > 0) durParts.push(`${durH} ${durH === 1 ? "hour" : "hours"}`);
    if (durM > 0) durParts.push(`${durM} ${durM === 1 ? "minute" : "minutes"}`);
    const durText = durParts.length > 0 ? durParts.join(" and ") : "";
    return `Event starts: ${startLine}. Duration: ${durText}. Approximate end in the same timezone: ${endLine}.`;
  } catch {
    return "Could not read this combination. Check that the custom timezone is a valid IANA name, e.g. America/Chicago.";
  }
}

function assertValidIanaForDisplay(tz: string): void {
  Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
}

/**
 * Tap-friendly schedule with accessibility patterns used on booking and calendar products:
 * explicit label/htmlFor wiring, aria-describedby for shared hints, grouped controls, and a polite live summary.
 */
export function EventScheduleFields({
  defaultStartAt = "",
  defaultDuration = "02:00",
  defaultTimezone = "America/New_York",
  preferStoredTimezone = false,
}: {
  defaultStartAt?: string;
  defaultDuration?: string;
  defaultTimezone?: string;
  preferStoredTimezone?: boolean;
}) {
  const knownZones = useMemo(() => new Set(ZONE_OPTIONS.map((z) => z.value)), []);
  const storedTzApplied = useRef(false);

  const initialOther = !knownZones.has(defaultTimezone);
  const [tzChoice, setTzChoice] = useState<string>(initialOther ? CUSTOM_TZ : defaultTimezone);
  const [tzCustom, setTzCustom] = useState(initialOther ? defaultTimezone : "");

  useEffect(() => {
    if (!preferStoredTimezone || storedTzApplied.current) return;
    const saved = loadPreferredTimezone();
    if (!saved) return;
    storedTzApplied.current = true;
    if (knownZones.has(saved)) {
      setTzChoice(saved);
      setTzCustom("");
    } else {
      setTzChoice(CUSTOM_TZ);
      setTzCustom(saved);
    }
  }, [preferStoredTimezone, knownZones]);

  const resolvedTz = tzChoice === CUSTOM_TZ ? tzCustom.trim() : tzChoice;

  const { date: parsedDate, time: parsedTime } = splitStart(defaultStartAt);
  const [date, setDate] = useState(() => parsedDate || localTodayYmd());
  const [time, setTime] = useState(() => parsedTime || "20:00");

  const normDur = normalizeDurationInit(defaultDuration);
  const [durH, setDurH] = useState(normDur.h);
  const [durM, setDurM] = useState(normDur.m);

  const startAtValue = `${date}T${time.slice(0, 5)}`;
  const durationValue = `${durH}:${String(durM).padStart(2, "0")}`;

  const describedByOverview = `${P}-overview ${P}-start-group-hint`;
  const summaryAnnouncement = useMemo(
    () => buildAccessibleSummary(date, time, resolvedTz, durH, durM),
    [date, time, resolvedTz, durH, durM],
  );

  return (
    <fieldset className="space-y-4 rounded-xl border border-zinc-700/60 bg-zinc-900/25 p-4">
      <legend className="px-1 text-sm font-medium text-zinc-300">When</legend>

      <p id={`${P}-overview`} className="text-xs leading-snug text-zinc-500">
        Date and time use your device&apos;s calendar and clock. Times are wall-clock in the timezone you choose below
        (not UTC). Your last timezone on this device is remembered for new events.
      </p>

      <div
        id={`${P}-live-summary`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="rounded-lg border border-violet-500/25 bg-violet-950/20 px-3 py-2 text-sm leading-snug text-zinc-200"
      >
        <span className="sr-only">Schedule summary. Updates when you change these fields.</span>
        {summaryAnnouncement}
      </div>

      <input type="hidden" name="startAt" value={startAtValue} />
      <input type="hidden" name="duration" value={durationValue} />
      <input type="hidden" name="timezone" value={resolvedTz} />

      <div>
        <label htmlFor={`${P}-timezone-select`} className="block text-sm font-medium text-zinc-300">
          Timezone for start time
        </label>
        <p id={`${P}-timezone-hint`} className="mt-1 text-xs text-zinc-500">
          All start fields are interpreted in this zone.
        </p>
        <select
          id={`${P}-timezone-select`}
          value={tzChoice}
          onChange={(e) => {
            const v = e.target.value;
            setTzChoice(v);
            if (v !== CUSTOM_TZ) persistPreferredTimezone(v);
          }}
          aria-describedby={`${P}-overview ${P}-timezone-hint`}
          className="mt-1 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
        >
          {ZONE_OPTIONS.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
          <option value={CUSTOM_TZ}>Other… (IANA name)</option>
        </select>
        {tzChoice === CUSTOM_TZ ? (
          <>
            <label htmlFor={`${P}-timezone-custom`} className="mt-3 block text-sm font-medium text-zinc-300">
              Custom IANA timezone
            </label>
            <p id={`${P}-tz-custom-help`} className="mt-1 text-xs text-zinc-500">
              Paste a name from the{" "}
              <a
                href="https://en.wikipedia.org/wiki/List_of_tz_database_time_zones"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 underline hover:text-violet-300"
              >
                tz database
              </a>
              , e.g. <code className="text-zinc-400">Europe/Madrid</code>.
            </p>
            <input
              id={`${P}-timezone-custom`}
              type="text"
              value={tzCustom}
              onChange={(e) => setTzCustom(e.target.value)}
              onBlur={() => {
                const t = tzCustom.trim();
                if (t) persistPreferredTimezone(t);
              }}
              placeholder="e.g. America/Boise"
              required
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`${P}-overview ${P}-tz-custom-help`}
              className="mt-1 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
            />
          </>
        ) : null}
      </div>

      <div role="group" aria-labelledby={`${P}-start-heading`}>
        <p id={`${P}-start-heading`} className="text-sm font-medium text-zinc-300">
          Start
        </p>
        <p id={`${P}-start-group-hint`} className="mt-1 text-xs text-zinc-500">
          Required: choose a calendar date and a clock time (you can use 12- or 24-hour format depending on your device).
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${P}-start-date`} className="block text-sm font-medium text-zinc-300">
              Start date
            </label>
            <input
              id={`${P}-start-date`}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              autoComplete="off"
              aria-describedby={describedByOverview}
              className="mt-1 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor={`${P}-start-time`} className="block text-sm font-medium text-zinc-300">
              Start time
            </label>
            <input
              id={`${P}-start-time`}
              type="time"
              required
              step={60}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              autoComplete="off"
              aria-describedby={describedByOverview}
              className="mt-1 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
            />
          </div>
        </div>
      </div>

      <fieldset className="space-y-2 border-0 p-0">
        <legend className="text-sm font-medium text-zinc-300">Duration</legend>
        <p id={`${P}-duration-hint`} className="text-xs text-zinc-500">
          How long the event runs after the start time. Choose hours and minutes from the lists — no typing.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div>
            <label htmlFor={`${P}-duration-hours`} className="sr-only">
              Duration (hours)
            </label>
            <select
              id={`${P}-duration-hours`}
              value={durH}
              onChange={(e) => {
                const h = Number(e.target.value);
                setDurH(h);
                if (h === 0 && durM === 0) setDurM(1);
              }}
              aria-describedby={`${P}-overview ${P}-duration-hint`}
              className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? "hour" : "hours"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${P}-duration-minutes`} className="sr-only">
              Duration (minutes)
            </label>
            <select
              id={`${P}-duration-minutes`}
              value={durM}
              onChange={(e) => {
                const m = Number(e.target.value);
                setDurM(m);
                if (durH === 0 && m === 0) setDurH(1);
              }}
              aria-describedby={`${P}-overview ${P}-duration-hint`}
              className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
            >
              {(durH === 0 ? MINUTES.slice(1) : MINUTES).map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>
    </fieldset>
  );
}
