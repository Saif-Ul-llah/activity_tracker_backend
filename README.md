# Activity Tracker

Express + TypeScript + Mongoose backend for a Hubstaff-style desktop activity
tracker. It serves both the user-facing auth API and the **desktop-agent API**
(device registration, activity-segment ingestion, screenshot presign/confirm to
Cloudflare R2, and telemetry events). Designed to deploy on **Vercel** (serverless)
with **MongoDB Atlas** and **Cloudflare R2** for screenshot storage.

## ⬇️ Download the desktop agent

| Platform | Download |
| --- | --- |
| **Windows** | **[Download installer (.exe)](https://github.com/Saif-Ul-llah/activity_tracker_backend/releases/download/agent-v0.1.0/Tracker-Agent-Setup-0.1.0.exe)** |
| **Linux** | [Download AppImage](https://github.com/Saif-Ul-llah/activity_tracker_backend/releases/download/agent-v0.1.0/Tracker-Agent-0.1.0.AppImage) |

All releases: <https://github.com/Saif-Ul-llah/activity_tracker_backend/releases>

**How it works:** install and sign in **once** — the agent then auto-starts in the
background (system tray) on every boot and tracks silently. No repeated logins.

> **Windows note:** the installer is currently unsigned, so Windows SmartScreen shows
> a warning on first run. Click **More info → Run anyway**. (Production builds should
> be signed with an EV code-signing certificate.)
>
> **Linux note:** if double-clicking the AppImage does nothing, either
> `sudo apt install libfuse2`, or run it FUSE-free:
> `APPIMAGE_EXTRACT_AND_RUN=1 ./Tracker-Agent-0.1.0.AppImage --no-sandbox`.
>
> **Wayland (default Ubuntu/GNOME):** the agent bundles a small GNOME Shell extension
> that enables prompt-free screenshots and real app-name detection. It installs
> automatically on first run — **log out and back in once** to activate it (Wayland
> can't hot-reload extensions). Until then the agent tracks activity/idle only.
> Keystroke/click *counts* remain 0 on Wayland (that API is X11-only); everything else
> (app names, screenshots, idle) works. X11 and Windows work fully with no extra step.

## Architecture

- **Screenshots never pass through the backend.** The agent requests a presigned R2
  PUT URL, uploads the image bytes directly to R2, then confirms the object to the
  backend. This keeps large uploads off Vercel's 4.5 MB body limit.
- **Idempotent ingestion.** Activity segments and screenshot confirmations upsert on
  unique keys (`deviceId + clientSegmentId`, `deviceId + clientScreenshotId`), so the
  agent can safely retry any request without creating duplicates.
- **Two token types.** Users authenticate with a normal access token (login). Each
  device gets a long-lived, revocable **device token** (separate secret, `agent`
  scope) stored encrypted on the machine.
- **Browser tabs (optional).** A tiny browser extension (bundled at
  `resources/browser-extension` in the agent) reports open tabs to the agent over
  loopback `127.0.0.1`; the agent forwards a per-browser snapshot to
  `/api/agent/browser/tabs`. The admin panel then shows every tab as a clickable link,
  and activity segments carry the focused tab's real URL (`urlSource: browser-ext`) —
  works identically on Windows, X11 and Wayland.
- **Serverless-safe.** Mongoose uses a cached global connection; the app auto-detects
  Vercel (`process.env.VERCEL`) and skips the long-running `listen()`/Socket.IO path.

## Requirements

- Node.js 18+
- MongoDB (local or Atlas)
- A Cloudflare R2 bucket (for screenshots)

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # ts-node + nodemon on http://localhost:5000
```

Build and run compiled:

```bash
npm run build
npm start
```

## Environment variables

`.env` is git-ignored — never commit real secrets. See `.env.example` for the full
list. Required in production:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB Atlas connection string |
| `ACCESS_TOKEN_SECRET` | Signs user access tokens (authoritative). `JWT_SECRET` is a legacy alias. |
| `REFRESH_TOKEN_SECRET` | Signs user refresh tokens |
| `DEVICE_TOKEN_SECRET` | Signs long-lived device tokens (must differ from user secrets) |
| `R2_ACCOUNT_ID` | Cloudflare account id (derives the S3 endpoint) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 S3 API credentials |
| `R2_BUCKET` | Screenshot bucket name |
| `R2_ENDPOINT` | Optional explicit S3 endpoint (defaults to `https://<account>.r2.cloudflarestorage.com`) |
| `R2_PUBLIC_BASE` | Public base URL for reading screenshots (dashboard) |
| `CORS_ORIGINS` | Comma-separated allowed browser origins (empty = allow all, dev only) |
| `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_HOST` / `EMAIL_PORT` | Nodemailer (OTP emails) |

Generate strong secrets with `openssl rand -hex 32`.

## API

Base URL: `http://localhost:5000/api`

### Auth (user token)

```http
POST /api/login
POST /api/forgot-password
POST /api/verify-otp
POST /api/reset-password      # requires Authorization: Bearer <accessToken>
POST /api/change-password     # requires Authorization: Bearer <accessToken>
```

> **Public self-registration is disabled** (no `POST /api/register`) — accounts are
> created only by an admin (`POST /api/admin/users`) or, for the first admin on a
> fresh DB, the seed script:
> ```bash
> SEED_EMAIL=you@co.com SEED_PASSWORD='strongpass' SEED_NAME='You' npm run seed:admin
> ```

Roles: `ADMIN, SUB_ADMIN, DISTRIBUTOR, INSTALLER, CUSTOMER`.

### Admin API (ADMIN / SUB_ADMIN token)

Backs the Next.js admin panel — analytics, monitoring, and management.

```http
GET   /api/admin/overview            # KPIs, timeline, top apps, state breakdown, heatmap
GET   /api/admin/users               # list users (+ device counts)
POST  /api/admin/users               # create a user
PATCH /api/admin/users/:id           # update role / active / name
DELETE /api/admin/users/:id          # delete user + all their data (incl. R2 objects)
GET   /api/admin/devices             # fleet devices, session/degraded flags, last-seen
POST  /api/admin/devices/:id/revoke  # revoke / restore a device token
GET   /api/admin/activity            # segments (paginated) + by-app / by-state / by-hour
POST  /api/admin/activity/delete     # clear history by device / time range / app
GET   /api/admin/screenshots         # screenshots with short-lived presigned GET URLs
POST  /api/admin/screenshots/delete  # bulk delete from R2 + DB (ids / older-than / all)
GET   /api/admin/events              # agent telemetry
GET   /api/admin/browser-tabs        # latest open-tab snapshots per device/browser
GET   /api/admin/storage             # R2 usage vs limit, upload-paused state, capture interval
PATCH /api/admin/settings            # pause/resume R2 upload, storage limit, screenshot interval
```

### Desktop agent

```http
POST /api/agent/devices/register     # user token -> issues deviceId + device token
GET  /api/agent/settings             # device token; supports ETag / 304
HEAD /api/agent/ping                 # public, DB-free connectivity probe
POST /api/agent/activity/batch       # device token; idempotent segment upsert
POST /api/agent/screenshots/presign  # device token; returns presigned R2 PUT URLs
POST /api/agent/screenshots/confirm  # device token; verifies object then records it
POST /api/agent/browser/tabs         # device token; upserts current open-tab snapshot per browser
POST /api/agent/events               # device token; crash / clock_jump / quota telemetry
```

All `/api/agent/*` routes except `ping` and `devices/register` require:

```http
Authorization: Bearer <deviceToken>
```

`devices/register` requires a **user** access token. A device token is revoked by
rotating `tokenId` on the device document or setting `revoked: true`.

## Response envelope

Success: `{ "status": "success", "message": "...", "data": ... }`
Error:   `{ "success": false, "code": "...", "message": "..." }`

## Deployment (Vercel)

`vercel.json` routes all requests to the compiled Express app via `@vercel/node`.

1. Import this repo at <https://vercel.com/new> (or `npx vercel link`).
2. Set the environment variables above in **Project → Settings → Environment Variables**.
3. Every push to `main` auto-deploys.

Because screenshots upload directly to R2, keep activity batches small (the code caps
them at ≤200 segments / ~1 MB) to stay within serverless limits.

## Local with Docker

```bash
docker compose up --build   # mongo on 27017, backend on 5000
```

## Project structure

```text
src/
  app.ts                 # dual-mode entry (long-running + serverless)
  config/                # app_config, database (cached conn), firebase, email
  middlewares/           # async, error, check_token (user), check_device_token (agent)
  models/                # user, device, activity_segment, screenshot, agent_event
  modules/
    auth/                # route/controller/services/repo
    agent/               # route/controller/services/repo
  helpers/validations/   # Joi schemas (auth, agent)
  utils/                 # http_error, helpers (tokens), r2 (presign)
  routes/                # aggregates auth + /agent routers
```

## Notes

- Passwords are hashed (bcrypt); duplicate-key and Mongoose validation errors are
  normalized by the global error middleware.
- Firebase Admin uses `src/config/service_account_key.json` if present (optional).
