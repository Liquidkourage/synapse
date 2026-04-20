# Synapse

Proof-of-concept web app: a **network-style front door** for live and on-demand trivia entertainment. Synapse does **not** implement a trivia engine in V1 — it stores links, embeds, schedule, roles, and a single sitewide “live” focus alongside third-party tools (TrivNow, GameShow.host, Google Forms, etc.).

**Stack:** Next.js 16 (App Router), Tailwind CSS 4, **SQLite** (file DB, no server) by default, Prisma ORM 7 (`@prisma/adapter-better-sqlite3`), Auth.js (NextAuth v5) with credentials.

---

## 1. Architecture summary

| Layer | Responsibility |
|--------|----------------|
| **Next.js App Router** | Server components for public pages; server actions for mutations; minimal client for auth, dates, image upload |
| **Auth.js** | JWT sessions; credentials provider; `session.user.role` for RBAC |
| **Middleware** | Route gating for `/admin`, `/producer`, `/host`, `/account`, `/dashboard` |
| **Prisma + SQLite** | Prisma 7 uses **`@prisma/adapter-better-sqlite3`**. `DATABASE_URL` defaults to `file:./prisma/dev.db` (see `prisma.config.ts`) |
| **Database file** | `prisma/dev.db` is created on first `db push`; no Postgres install required for local dev |
| **Uploads** | PoC: files written under `public/uploads` via `POST /api/upload` |

---

## 2. Assumptions

- **One featured live event** is enforced by `SiteSettings.featuredLiveEventId`, with fallback to the first event whose **effective** status is `LIVE` (time-based + optional override).
- **Effective status** = `CANCELLED` / `ARCHIVED` locked, else `statusOverride` if set, else `DRAFT` stays draft, else time window maps to `SCHEDULED` / `LIVE` / `COMPLETED`.
- **Recurring programming** is modeled with `RecurrenceSeries.ruleJson` plus human `recurrenceNote` on events; full instance generation is not automated in V1.
- **Chat** is request/response + `revalidatePath` — not realtime; schema supports future WebSockets.
- **Email / payments** are stubs or placeholder rows (`NotificationOutbox`, `SubscriptionPlaceholder`, `TicketOrderPlaceholder`).
- **Image uploads** are local-disk only — on Railway, use persistent volume or switch to S3-compatible storage later.

---

## 3. Suggested folder structure

```
synapse/
├── prisma/
│   ├── schema.prisma      # Data model
│   └── seed.ts            # Demo data + demo users
├── prisma.config.ts       # Prisma 7 datasource URL for CLI
├── src/
│   ├── app/               # Routes (App Router)
│   ├── actions/           # Server actions (auth, events, admin, chat)
│   ├── auth.ts            # Auth.js config
│   ├── components/        # UI (shell, forms, event card, chat, …)
│   ├── lib/               # prisma, rbac, queries, event-status, email stub
│   ├── middleware.ts
│   └── types/             # next-auth module augmentation
├── public/uploads/        # Local upload target (gitignored contents)
└── .env.example
```

---

## 4. Prisma schema

See `prisma/schema.prisma` — includes:

- `User`, `Profile`, `Role`
- `Event`, `EventStatus`, `RecurrenceSeries`
- `ArchiveEntry`, `SiteSettings`, `HomepageBlock`
- `ChatMessage`, `NotificationPreference`, `NotificationOutbox`
- `SubscriptionPlaceholder`, `TicketOrderPlaceholder`, `Asset`

---

## 5. Auth and RBAC

- **Provider:** Credentials (email + password, bcrypt hash in `User.passwordHash`).
- **Session:** JWT; `callbacks` copy `id` and `role` into token and session.
- **Helpers:** `src/lib/rbac.ts` — `hasRole`, `isAdmin`, `isProducerOrAbove`, `isHostOrAbove`.
- **Middleware:** `/admin` → `ADMIN`; `/producer` → `PRODUCER` or `ADMIN`; `/host` → `HOST`, `PRODUCER`, or `ADMIN`; `/account` & `/dashboard` → signed-in.

---

## 6. Page map / routes

| Route | Purpose |
|--------|---------|
| `/` | Homepage — hero, featured live, upcoming, archive preview |
| `/live` | Single live / featured experience + embed |
| `/schedule` | Chronological list + recurring series |
| `/events/[slug]` | Event detail — integrations, chat |
| `/archive` | On-demand / replay entries |
| `/search?q=` | Basic search over events + archive |
| `/login`, `/signup` | Auth |
| `/account` | Player profile (no public profiles) |
| `/dashboard` | Role-based shortcuts |
| `/host/events`, `/host/events/new`, `/host/events/[id]/edit` | Host (and up) event CRUD |
| `/producer` | Producer tools + archive entry form |
| `/admin/*` | Users, metrics, featured live, settings, homepage blocks, all events |

---

## 7. Core components (non-exhaustive)

- `SiteShell` — nav, auth-aware links
- `EventCard`, `LocalDateTime` — schedule/home
- `EventCreateForm` / `EventEditForm` — host/producer event fields + cover image + Synapse video (Daily.co)
- `CoverImageInput` — paste URL or upload to `/api/upload`
- `EventChat` — scoped lobby messages
- `LoginForm`, `SignupForm`, `ProfileForm`

---

## 8. Implementation plan (completed for PoC)

1. Scaffold Next.js + Tailwind + Prisma + Auth.js  
2. Define schema + Prisma 7 SQLite adapter + seed  
3. Public pages + queries + effective status  
4. Auth, middleware, dashboards  
5. Admin/producer/host forms + upload API  
6. Stubs: email, notifications row, subscriptions/tickets  
7. Document env + Railway  

---

## 9. Seed script

```bash
npx prisma db push
npm run db:seed
```

Script: `prisma/seed.ts` (configured in `prisma.config.ts` → `migrations.seed`).

---

## 10. Demo credentials

After seeding, all accounts use password **`demo1234`**:

| Role | Email |
|------|--------|
| Admin | `admin@synapse.demo` |
| Producer | `producer@synapse.demo` |
| Host | `host@synapse.demo` |
| Player | `player@synapse.demo` |

---

## 11. Local development

No database server is required — Prisma uses a **SQLite file** (`prisma/dev.db` by default).

1. Copy env: `cp .env.example .env` (defaults: `DATABASE_URL="file:./prisma/dev.db"`).
2. Set `AUTH_SECRET` (≥32 random bytes) if you change the dev default.
3. Install: `npm install`
4. Schema: `npm run db:push`
5. Seed: `npm run db:seed`
6. Dev: `npm run dev` → [http://localhost:3000](http://localhost:3000)

### Synapse video (native)

Live host video is **built in** via [Daily.co](https://www.daily.co/) (free tier for development and modest traffic; see [their pricing](https://www.daily.co/pricing)). Synapse stores the room URL on each event as `broadcastEmbedUrl` and embeds it on `/live` and the event page.

**Get a Daily API key (once):**

1. Sign up or log in at [daily.co](https://www.daily.co/).
2. Open the [Developer dashboard](https://dashboard.daily.co/developers) (or **Developers** in the sidebar).
3. Under **API keys**, create a key and copy it (treat it like a password).
4. In your Synapse project root, edit `.env` and set:  
   `DAILY_API_KEY="paste_your_key_here"`
5. Restart `npm run dev` (or your production process) so Next.js picks up the env var.

**After the key is set:**

- Saving a **new** event auto-creates a Daily room (unless you already pasted a custom video URL, or you set `SYNAPSE_VIDEO_AUTO_ROOM=false`).
- **Edit event:** use **Create new Synapse video room** if you need a fresh room.
- **Override:** paste any other iframe-safe live URL in the same field if you use a different provider.
- **Streaming vs open room (default: streaming):** radio on the event form. **Streaming** mints Daily **meeting tokens** so only the **event host** can publish video/audio; **players get watch-only** (no camera/mic join). **Open room** uses the plain room URL for everyone (classic video call).
- **Hide video from players (optional):** checkbox — iframe only for host / assigned producer / admin; others see a notice. UI gating only; combine with Daily private rooms for stronger control.

Implementation: `src/lib/synapse-video.ts`, `src/lib/daily-broadcast-url.ts`, `src/lib/broadcast-access.ts`, `POST /api/host/events/[eventId]/synapse-video`.

**Cloud recording → VOD:** New Daily rooms created by Synapse set `enable_recording: "cloud"` unless `SYNAPSE_DAILY_CLOUD_RECORDING=false`. That lets the host **start a cloud recording** from Daily Prebuilt (or via API); when the recording finishes, Daily stores an MP4 and exposes it through their [recordings API](https://docs.daily.co/reference/rest-api/recordings). **Synapse does not yet auto-import** those files into `replayUrl` or the archive — you would add a **webhook** (e.g. `recording.ready-to-download`) or a manual step to paste the playback URL into the event’s replay / archive entry. Disable cloud recording on new rooms if you do not want recording features or Daily recording charges.

---

## 12. Railway deployment

This repo is **SQLite-first** (file DB). For Railway you can:

- **Option A — SQLite + volume:** Mount a volume at the project root (or set `DATABASE_URL` to `file:/path/on/volume/dev.db`) so `prisma/dev.db` survives restarts. Single-instance only.
- **Option B — PostgreSQL:** Change `schema.prisma` back to `provider = "postgresql"`, restore the **`pg`** adapter in `src/lib/prisma.ts`, set Railway’s `DATABASE_URL` to the Postgres URL, then `db push` / migrate.

Common steps:

1. Set **`AUTH_SECRET`** and **`AUTH_URL`** to your public Railway URL (no trailing slash; must match the browser origin).
2. Mount a **volume** (e.g. at `/data`) and set **`DATABASE_URL`** to e.g. `file:/data/synapse.db`.
3. **Build:** `npm run build` · **Start:** `npm start` (start runs **`prisma db push`** first so the schema is applied without a manual shell step).
4. **Seed** (optional): run `npx prisma db seed` once from a Railway shell or one-off command if you want demo users.

**Note:** Uploaded files under `public/uploads` are **ephemeral** on default Railway disks unless you add storage.

**Dockerfile deploy:** The image `CMD` runs `./docker-entrypoint.sh` (Prisma sync + `next start`). `railway.toml` does **not** set `startCommand` so Railway’s per-service **Custom Start Command** stays editable.

**Twitch chat bridge** (separate Railway service, same repo): set **Start Command** to `npm run twitch-bridge` and the bridge env vars — do not use `./docker-entrypoint.sh` on that service. The **web** service needs the same `TWITCH_BOT_OAUTH` with **`user:write:chat`** (in addition to `chat:read`) so Synapse chat lines can be sent to Twitch via Helix. Access tokens expire in a few hours; add **`TWITCH_BOT_REFRESH_TOKEN`**, **`TWITCH_CLIENT_ID`**, and **`TWITCH_CLIENT_SECRET`** (same Twitch app) on **web and bridge** so tokens refresh automatically. Copy `refresh_token` from the OAuth token exchange response alongside `access_token`.

---

## 13. Known limitations / future work

- Chat updates via polling (not WebSocket)  
- No email provider wired (console stub)  
- Payments/tickets are placeholder rows only  
- No public user profile URLs  
- Prisma 7 + **better-sqlite3** adapter — see `src/lib/prisma.ts`  
- Next.js 16 may deprecate `middleware` in favor of “proxy” — revisit when upgrading  
- Search uses simple `contains` (case behavior depends on SQLite vs future Postgres)  
- `CoverImageInput` is client-only; URL + upload share one field  

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite file URL, e.g. `file:./prisma/dev.db` |
| `AUTH_SECRET` | Yes | Session encryption |
| `AUTH_URL` | Prod | Public origin (Auth.js) |
| `RESEND_API_KEY` | No | If set, you can wire real welcome emails in `src/lib/email.ts` |
| `DAILY_API_KEY` | No | Enables Synapse native video (Daily.co rooms); see “Synapse video” above |
| `SYNAPSE_VIDEO_AUTO_ROOM` | No | If `false`, skip auto Daily room on **new** event create (default: auto when `DAILY_API_KEY` is set) |
| `SYNAPSE_DAILY_CLOUD_RECORDING` | No | If `false`, new Daily rooms are created **without** `enable_recording: cloud` (default: cloud recording allowed on new rooms) |

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Prisma Client |
| `npm run db:push` | Push schema (dev) |
| `npm run db:migrate` | Create migration (dev) |
| `npm run db:seed` | Seed demo data |

---

## License

Private / PoC — adjust as needed.
