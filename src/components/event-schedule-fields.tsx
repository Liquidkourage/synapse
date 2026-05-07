"use client";

import { useMemo, useState } from "react";

const CUSTOM_TZ = "__custom__";

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
/** Match server max (168h). */
const HOURS = Array.from({ length: 169 }, (_, i) => i);

function normalizeDurationInit(dur: string): { h: number; m: number } {
  const { h: rawH, m: rawM } = splitDuration(dur);
  const h = Math.min(168, Math.max(0, rawH));
  const m = Math.min(59, Math.max(0, rawM));
  if (h === 0 && m === 0) return { h: 0, m: 15 };
  return { h, m };
}

/**
 * Tap-friendly schedule: native date & time pickers, timezone menu, duration hours/minutes selects.
 * Submits the same `startAt`, `duration`, `timezone` fields the server already expects.
 */
export function EventScheduleFields({
  defaultStartAt = "",
  defaultDuration = "02:00",
  defaultTimezone = "America/New_York",
}: {
  defaultStartAt?: string;
  defaultDuration?: string;
  defaultTimezone?: string;
}) {
  const knownZones = useMemo(() => new Set(ZONE_OPTIONS.map((z) => z.value)), []);

  const initialOther = !knownZones.has(defaultTimezone);
  const [tzChoice, setTzChoice] = useState<string>(initialOther ? CUSTOM_TZ : defaultTimezone);
  const [tzCustom, setTzCustom] = useState(initialOther ? defaultTimezone : "");

  const resolvedTz = tzChoice === CUSTOM_TZ ? tzCustom.trim() : tzChoice;

  const { date: parsedDate, time: parsedTime } = splitStart(defaultStartAt);
  const [date, setDate] = useState(() => parsedDate || localTodayYmd());
  const [time, setTime] = useState(() => parsedTime || "20:00");

  const normDur = normalizeDurationInit(defaultDuration);
  const [durH, setDurH] = useState(normDur.h);
  const [durM, setDurM] = useState(normDur.m);

  const startAtValue = `${date}T${time.slice(0, 5)}`;
  const durationValue = `${durH}:${String(durM).padStart(2, "0")}`;

  return (
    <fieldset className="space-y-4 rounded-xl border border-zinc-700/60 bg-zinc-900/25 p-4">
      <legend className="px-1 text-sm font-medium text-zinc-300">When</legend>
      <p className="text-xs leading-snug text-zinc-500">
        Use the date and time pickers (calendar / clock on phones). Everything is interpreted in the timezone you pick
        below — no typing unless you need a custom zone.
      </p>

      <input type="hidden" name="startAt" value={startAtValue} />
      <input type="hidden" name="duration" value={durationValue} />
      <input type="hidden" name="timezone" value={resolvedTz} />

      <div>
        <label className="block text-sm text-zinc-400">Timezone</label>
        <select
          value={tzChoice}
          onChange={(e) => setTzChoice(e.target.value)}
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
          <input
            type="text"
            value={tzCustom}
            onChange={(e) => setTzCustom(e.target.value)}
            placeholder="e.g. America/Boise"
            required
            autoComplete="off"
            className="mt-2 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
          />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-zinc-400">Start date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400">Start time</label>
          <input
            type="time"
            required
            step={60}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-400">How long</label>
        <p className="mt-1 text-xs text-zinc-600">Tap hours and minutes — no typing.</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:max-w-md">
          <div>
            <span className="sr-only">Hours</span>
            <select
              value={durH}
              onChange={(e) => {
                const h = Number(e.target.value);
                setDurH(h);
                if (h === 0 && durM === 0) setDurM(1);
              }}
              aria-label="Duration hours"
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
            <span className="sr-only">Minutes</span>
            <select
              value={durM}
              onChange={(e) => {
                const m = Number(e.target.value);
                setDurM(m);
                if (durH === 0 && m === 0) setDurH(1);
              }}
              aria-label="Duration minutes"
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
      </div>
    </fieldset>
  );
}
