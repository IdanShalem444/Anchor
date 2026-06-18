# Anchor

A premium, Apple-styled study + organisation web app — upload an assessment
notification and Anchor generates your summary, study notes, revision hub,
flashcards and practice tests, then keeps every subject, reminder, project and
plan organised and linked in one place.

Built with **Next.js 14 · TypeScript · Tailwind · Framer Motion · Zustand**,
**Supabase** (auth + database + cross-device sync) and **OpenRouter** (real AI).

## What you need

Anchor is a real product, not a demo — it needs two free services:

| Service | Purpose | Required? |
|---|---|---|
| **Supabase** | Accounts, database, cross-device sync | **Yes** (sign-in is disabled without it) |
| **OpenRouter** | Live AI generation & tutor | Recommended (a built-in generator is used as a silent fallback if a call fails) |

Set the keys below in `.env.local` (and in Vercel for production).

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3000
```

## Environment variables

See `.env.example`.

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=              # https://openrouter.ai/keys (server-only)
OPENROUTER_MODEL=openai/gpt-4o-mini   # any OpenRouter model id
OPENROUTER_SITE_URL=             # optional, your deployed URL
```

`NEXT_PUBLIC_*` vars are exposed to the browser by design (they decide cloud vs
on-device mode). `OPENROUTER_API_KEY` stays server-side — AI calls run only in
the `/api/ai/*` route handlers.

## Enable the AI backend (OpenRouter)

1. Create a key at <https://openrouter.ai/keys>.
2. Set `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`).
3. Done — generation and the AI tutor now use the live model, with automatic
   fallback to the offline generator if a request fails.

## Enable the cloud backend (Supabase)

1. Create a free project at <https://supabase.com>.
2. **Database:** open SQL Editor → New query → paste `supabase/schema.sql` → Run.
   This creates the `profiles` and `workspaces` tables, row-level security, and a
   trigger that provisions a profile + workspace on signup.
3. **API keys:** Project Settings → API → copy the Project URL and the `anon`
   public key into `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Auth redirect URLs:** Authentication → URL Configuration →
   - Site URL: your deployed URL (or `http://localhost:3000` for dev)
   - Redirect URLs: add `<base>/auth/callback` and `<base>/auth/reset`
5. **Google sign-in (optional):** Authentication → Providers → Google → add your
   Google OAuth client id/secret.
6. **Email confirmation (optional):** Authentication → Providers → Email. If you
   disable "Confirm email", signup logs straight in; if enabled, users confirm via
   the emailed link before signing in (Anchor handles both).

Data model: each user's entire Anchor workspace is stored as one JSONB document
in `workspaces.data`, loaded into the app on sign-in and saved back (debounced)
on every change — so everything syncs across devices.

## Connect Canvas (optional — auto-import assignments)

1. In Canvas: **Account → Settings → + New Access Token** → copy it.
2. Add to `.env.local` (and Vercel) — server-only, never exposed to the browser:
   ```
   CANVAS_BASE_URL=https://yourschool.instructure.com
   CANVAS_TOKEN=…
   ```
3. In Anchor → **Work → Subjects**, click **Sync with Canvas**. Your active
   courses import as subjects and their assignments as assessments (with due
   dates), de-duplicated by Canvas id — re-sync any time to pull new/updated work.

## Deploy to Vercel

**Dashboard (recommended)**
1. Push this project to a GitHub repo.
2. In Vercel → New Project → import the repo (framework auto-detects Next.js).
3. Add the env vars from `.env.example` under Settings → Environment Variables.
4. Deploy. Then add the deployment URL to Supabase's redirect URLs (step 4 above).

**CLI**
```bash
npm i -g vercel
vercel            # first run links/creates the project
vercel --prod     # production deploy
```
Add env vars with `vercel env add <NAME>` (or in the dashboard), then redeploy.

> Note: deploying requires *your* Vercel login — run the commands above yourself.

## Project layout

- `src/app` — routes (App Router). `(app)/` = authenticated area; `api/ai/*` = AI backend.
- `src/store` — `auth.ts` (auth, Supabase-aware) and `data.ts` (the workspace store).
- `src/lib/ai` — `index.ts` (active provider) → `client.ts` (calls `/api/ai/*`) →
  `server.ts` (OpenRouter ↔ offline `mock.ts`).
- `src/lib/supabase` — browser/server clients, gated on env presence.
- `src/components` — UI primitives, school/assessment/personal/chat features.
- `supabase/schema.sql` — database schema to run in Supabase.
