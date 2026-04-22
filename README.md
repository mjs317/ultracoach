# Ultracoach

An AI endurance coach for runners, cyclists, triathletes, and ultra-endurance athletes. Add every
event on your season calendar, scale training to your available hours, and let a multi-agent AI
pipeline periodize, generate, review (with live web-search citations), and revise a full training
plan that exports as TrainingPeaks-compatible workout files, PDF, or a subscribable iCal feed.

## Features

- **Season planning** - add as many events as you want (runs, rides, tris, ultras, or fully custom
  events with your own distance or duration). Priorities A/B/C drive peaks and tapers.
- **Multi-agent AI pipeline** (per plan generation):
  1. Plan Architect - periodization outline (base/build/peak/taper/recovery).
  2. Workout Generator - structured daily workouts with intervals, targets, and durations.
  3. Science Reviewer - live web search (Tavily/Exa) against current training literature, with
     citations stored in the DB and shown in the UI.
  4. Revisor - applies reviewer feedback to the plan.
- **Provider-agnostic LLM** layer (Anthropic Claude or OpenAI GPT) via the Vercel AI SDK.
- **Structured workout exports** a single click away:
  - `.zwo` (Zwift / TrainingPeaks workout)
  - `.erg` / `.mrc` (power-based trainer files)
  - `.fit` (Garmin / TrainingPeaks structured workout, custom encoder)
  - `.pdf` (printable weekly plan via react-pdf)
  - `.ics` (downloadable) + a per-user **subscribable iCal feed**
  - `bundle.zip` with everything for an entire plan.
- **Chat coach sidebar** - ask for tweaks, read plan context, streaming responses.
- **Adaptive re-plan** - per-workout feedback (RPE, completed, sleep, soreness) and optional Strava
  or `.fit`/`.tcx`/`.gpx` upload actuals feed into an "Adapt upcoming" agent that revises only
  future workouts.
- **Plan version history** - every regeneration is preserved; restore any previous version.
- **Rate limiting** via Upstash Redis (or in-process fallback) on AI endpoints.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma + Postgres · Auth.js (email
magic-link via Resend-compatible SMTP) · Vercel AI SDK · Tavily/Exa search · Strava OAuth.

## Getting started

```bash
cp .env.example .env.local
# fill in DATABASE_URL, AUTH_SECRET, EMAIL_* (Resend SMTP works great),
# ANTHROPIC_API_KEY or OPENAI_API_KEY, TAVILY_API_KEY (recommended).

pnpm install
pnpm prisma db push          # create tables in your Postgres
pnpm dev                     # start http://localhost:3000
```

Optional:

- `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` + `APP_URL` to enable the Strava sync button on the
  profile page.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` to share rate limits across instances.

## Key routes

- `/` landing page.
- `/auth/signin` magic-link sign-in.
- `/dashboard` season overview + next A event.
- `/events` CRUD events.
- `/profile` athlete profile + Strava + activity upload.
- `/settings` adapt mode, unit system, AI provider.
- `/plan` week-by-week plan view with chat sidebar, citations, adapt, regenerate.
- `/plan/history` version history with restore.
- `/exports` calendar subscription URL, bundle export, custom filtered export.
- `/api/generate-plan`, `/api/adapt-plan`, `/api/chat`, `/api/export/[format]`,
  `/api/calendar/[token]`, `/api/strava/{connect,callback,sync,disconnect}`,
  `/api/activities/upload`.

## Architecture

```
app/                  Next.js app router pages & route handlers
  (app)/              Authenticated app routes (shared layout with top nav)
  api/                Route handlers (generate-plan, chat, export/, etc.)
components/           UI primitives and providers
lib/
  ai/
    providers.ts      Anthropic/OpenAI abstraction
    schemas.ts        Zod schemas for every agent's structured output
    agents/           architect, generator, reviewer, revisor, adapter
    orchestrator.ts   End-to-end plan generation with DB persistence
  db.ts               Prisma client singleton
  exports/            .zwo .erg/.mrc .fit .ics .pdf generators (+ types)
  science/search.ts   Tavily/Exa live web search wrapper
  strava.ts           Strava OAuth + activity sync + workout linking
  parsers/            .gpx/.tcx/.fit parsers for activity uploads
  rate-limit.ts       Upstash/in-process rate limit
  validation/         Zod form schemas
prisma/schema.prisma  Data model
auth.ts middleware.ts Auth.js setup and protected-route middleware
```

## What's deliberately minimal

- The `.fit` encoder is a small, dependency-free implementation of the FIT workout-file format.
  It produces files Garmin Connect and TrainingPeaks accept; it isn't a full FIT SDK.
- Activity-to-workout linking is same-day + same-sport. Fancier matching can be layered on.
- The chat coach proposes changes in prose; structural re-writes still go through "Regenerate" or
  "Adapt upcoming" so edits flow through the schema validation + persistence layer.

## License

MIT
