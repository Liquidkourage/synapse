import { createEvent, updateEvent } from "@/actions/events";
import type { Event } from "@/generated/prisma";
import { CoverImageInput } from "@/components/cover-image-input";
import { SynapseVideoRoomButton } from "@/components/synapse-video-room-button";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function EventCreateForm({
  hostOptions,
  nativeVideoAvailable,
  autoRoomOnCreate,
}: {
  hostOptions?: { id: string; label: string }[];
  nativeVideoAvailable: boolean;
  autoRoomOnCreate: boolean;
}) {
  return (
    <form action={createEvent} className="max-w-2xl space-y-4">
      <FormFields
        hostOptions={hostOptions}
        nativeVideoAvailable={nativeVideoAvailable}
        autoRoomOnCreate={autoRoomOnCreate}
      />
      <button
        type="submit"
        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
      >
        Create event
      </button>
    </form>
  );
}

export function EventEditForm({
  event,
  hostOptions,
  nativeVideoAvailable,
  autoRoomOnCreate,
}: {
  event: Event;
  hostOptions?: { id: string; label: string }[];
  nativeVideoAvailable: boolean;
  autoRoomOnCreate: boolean;
}) {
  const action = updateEvent.bind(null, event.id);
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <FormFields
        eventId={event.id}
        hostOptions={hostOptions}
        nativeVideoAvailable={nativeVideoAvailable}
        autoRoomOnCreate={autoRoomOnCreate}
        defaults={{
          title: event.title,
          shortDescription: event.shortDescription,
          longDescription: event.longDescription ?? "",
          startAt: toLocalInput(new Date(event.startAt)),
          endAt: toLocalInput(new Date(event.endAt)),
          timezone: event.timezone,
          status: event.status,
          statusOverride: event.statusOverride ?? "",
          platformName: event.platformName ?? "",
          externalUrl: event.externalUrl ?? "",
          broadcastEmbedUrl: event.broadcastEmbedUrl ?? "",
          broadcastHostOnlyJoin: event.broadcastHostOnlyJoin ? "on" : "",
          videoRoomMode: event.broadcastStreamingMode ? "streaming" : "open",
          embedUrl: event.embedUrl ?? "",
          integrationType: event.integrationType ?? "",
          instructions: event.instructions ?? "",
          coverImageUrl: event.coverImageUrl ?? "",
          bannerImageUrl: event.bannerImageUrl ?? "",
          replayUrl: event.replayUrl ?? "",
          resultsSummary: event.resultsSummary ?? "",
          recurrenceNote: event.recurrenceNote ?? "",
        }}
      />
      <button
        type="submit"
        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
      >
        Save changes
      </button>
    </form>
  );
}

function FormFields({
  eventId,
  hostOptions,
  nativeVideoAvailable,
  autoRoomOnCreate,
  defaults,
}: {
  eventId?: string;
  hostOptions?: { id: string; label: string }[];
  nativeVideoAvailable: boolean;
  autoRoomOnCreate: boolean;
  defaults?: Record<string, string>;
}) {
  const d = defaults ?? {};
  return (
    <>
      {hostOptions && hostOptions.length > 0 && (
        <div>
          <label className="block text-sm text-zinc-400">Host</label>
          <select
            name="hostId"
            defaultValue={hostOptions[0]?.id}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          >
            {hostOptions.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm text-zinc-400">Title</label>
        <input
          name="title"
          required
          defaultValue={d.title}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Short description</label>
        <input
          name="shortDescription"
          required
          defaultValue={d.shortDescription}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Long description</label>
        <textarea
          name="longDescription"
          rows={4}
          defaultValue={d.longDescription}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-zinc-400">Start (local)</label>
          <input
            type="datetime-local"
            name="startAt"
            required
            defaultValue={d.startAt}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400">End (local)</label>
          <input
            type="datetime-local"
            name="endAt"
            required
            defaultValue={d.endAt}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Timezone label (display)</label>
        <input
          name="timezone"
          defaultValue={d.timezone ?? "America/New_York"}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-zinc-400">Stored status</label>
          <select
            name="status"
            defaultValue={d.status ?? "SCHEDULED"}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          >
            {["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "ARCHIVED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-zinc-400">Status override (optional)</label>
          <select
            name="statusOverride"
            defaultValue={d.statusOverride ?? ""}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
          >
            <option value="">— none —</option>
            {["DRAFT", "SCHEDULED", "LIVE", "COMPLETED", "ARCHIVED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Recurrence note (e.g. &quot;Every Wed 8pm&quot;)</label>
        <input
          name="recurrenceNote"
          defaultValue={d.recurrenceNote}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Platform name</label>
        <input
          name="platformName"
          placeholder="TrivNow, GameShow.host, Google Forms…"
          defaultValue={d.platformName}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">External URL</label>
        <p className="mt-1 text-xs text-zinc-600">
          Full link to the game or tool (opens in a new tab). If you omit <code className="text-zinc-500">https://</code>,
          it is added when you save so the link is not treated as a path on Synapse.
        </p>
        <input
          name="externalUrl"
          defaultValue={d.externalUrl}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4">
        <label className="block text-sm font-medium text-emerald-200">Synapse video (host camera)</label>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Live video for viewers on Synapse — iframe embed, not a social streaming site. Hosts use camera/mic inside the
          embedded room.
        </p>

        {nativeVideoAvailable ? (
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-500">
            <p>
              <span className="font-medium text-emerald-200/90">Built-in (Daily.co):</span>{" "}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-zinc-400">DAILY_API_KEY</code> is set.{" "}
              {!eventId
                ? "This event can get a Daily room automatically when you save."
                : "Use the button below for a new room, or leave the URL as-is."}
            </p>
            {autoRoomOnCreate && !eventId && (
              <p className="rounded-lg bg-zinc-900/50 px-2 py-1.5 text-emerald-200/85">
                Saving this event will create a Daily room unless you paste a URL in the field first.
              </p>
            )}
            <p className="text-zinc-600">
              <span className="font-medium text-zinc-500">Override:</span> paste any other iframe-safe live URL (Mux
              Live, 100ms, etc.) to use that instead of Daily.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-500">
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-950/25 px-3 py-2 text-emerald-100/90">
              <span className="font-medium text-emerald-200">Want Synapse to create video rooms for you?</span> Get a
              free API key: log in to{" "}
              <a
                href="https://www.daily.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                Daily.co
              </a>
              , open{" "}
              <a
                href="https://dashboard.daily.co/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                Developers → API keys
              </a>
              , copy a key, add{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-emerald-200/95">DAILY_API_KEY=&quot;…&quot;</code>{" "}
              to <code className="rounded bg-black/30 px-1 py-0.5 text-emerald-200/95">.env</code>, restart the server,
              then refresh this page.
            </p>
            <p className="text-zinc-600">
              <span className="font-medium text-zinc-500">Or</span> paste an iframe-safe room URL below if you use
              another provider (Mux Live, 100ms, etc.).
            </p>
          </div>
        )}

        <label htmlFor={eventId ? `broadcast-${eventId}` : "broadcast-new"} className="mt-3 block text-xs text-zinc-500">
          Video embed URL
        </label>
        <input
          id={eventId ? `broadcast-${eventId}` : "broadcast-new"}
          name="broadcastEmbedUrl"
          placeholder={
            nativeVideoAvailable
              ? "Leave empty for Daily auto-room, or paste another embed URL"
              : "Paste a room URL — or add DAILY_API_KEY to .env and leave this empty"
          }
          defaultValue={d.broadcastEmbedUrl}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />

        {eventId && nativeVideoAvailable && <SynapseVideoRoomButton eventId={eventId} />}

        <fieldset className="mt-4 space-y-2 border-0 p-0">
          <legend className="text-sm font-medium text-zinc-300">Video room style (Daily)</legend>
          <p className="text-xs text-zinc-500">
            Streaming is the default: players see the host on video but are not prompted to join with camera/mic.
          </p>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
            <input
              type="radio"
              name="videoRoomMode"
              value="streaming"
              defaultChecked={d.videoRoomMode !== "open"}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-zinc-300">Streaming</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Only the event host can send video/audio; everyone else is watch-only in the embed.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
            <input
              type="radio"
              name="videoRoomMode"
              value="open"
              defaultChecked={d.videoRoomMode === "open"}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-zinc-300">Open room</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Anyone with the page can join the Daily room with camera/mic (classic video call).
              </span>
            </span>
          </label>
        </fieldset>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-zinc-400">
          <input
            type="checkbox"
            name="broadcastHostOnlyJoin"
            value="on"
            defaultChecked={d.broadcastHostOnlyJoin === "on"}
            className="mt-1 rounded border-zinc-600"
          />
          <span>
            <span className="font-medium text-zinc-300">Hide video from non-hosts</span>
            <span className="mt-1 block text-xs text-zinc-500">
              Do not show the video embed to players at all — only the host and staff see it (useful if you stream
              elsewhere).
            </span>
          </span>
        </label>
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Game / tool embed URL (optional)</label>
        <p className="mt-1 text-xs text-zinc-600">
          Separate from host video — trivia app, form, or other iframe. Include <code className="text-zinc-500">https://</code>{" "}
          or it will be added on save.
        </p>
        <input
          name="embedUrl"
          defaultValue={d.embedUrl}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Integration / content type</label>
        <input
          name="integrationType"
          placeholder="embed | external | form"
          defaultValue={d.integrationType}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Instructions</label>
        <textarea
          name="instructions"
          rows={3}
          defaultValue={d.instructions}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <CoverImageInput defaultValue={d.coverImageUrl} />
      <div>
        <label className="block text-sm text-zinc-400">Banner image URL</label>
        <input
          name="bannerImageUrl"
          defaultValue={d.bannerImageUrl}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Replay URL (post-event)</label>
        <input
          name="replayUrl"
          defaultValue={d.replayUrl}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400">Results / summary</label>
        <textarea
          name="resultsSummary"
          rows={3}
          defaultValue={d.resultsSummary}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        />
      </div>
    </>
  );
}
