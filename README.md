# ExamRoadmap

A multi-exam **roadmap and study guidance platform** for students preparing for
competitive exams (STET, CTET, SSC) and school board exams — not a flat syllabus
checklist, but a guided path through the syllabus in the order that actually
scores marks.

Grown out of the single-exam Bihar STET Psychology Tracker; existing users keep
their progress (see [Migration](#migration)).

## What it does

**Phased learning journey.** Every exam is split into three ordered phases:

1. **Foundations** — the conceptual baseline everything else rests on.
2. **High-Yield Scoring Units (80/20)** — the units carrying most of the marks.
3. **Pedagogy / General Skills** — the compulsory, comparatively easy sections.

**Weightage intelligence.** Each unit carries its estimated mark range, a
priority tag (🔥 High-Yield / ⚡ Medium / 📌 Standard) and the PYQ themes it is
usually tested on. The estimated-score readout weights each section by its own
mark value, so finishing a 100-mark section moves the needle far more than a
20-mark one — and it tells you how far you are from the pass mark.

**Study tracker.** Per topic: a 3-tier spaced-repetition tracker (24h → 7d →
30d, with the next review flagged when it comes due), a 1–5 confidence rating, a
PYQ checkbox, free-text notes, and a one-click YouTube lecture search seeded from
the exam's own search prefix.

**Focus tools.** Pomodoro timer (25/50/5-minute presets plus a stopwatch) that
can be pinned to the topic you are studying, with a daily session count.

**Works offline.** Installable PWA. The roadmap and your progress stay available
with no connection; edits made offline sync up when you reconnect.

## Run it

```bash
npm install
npm run dev          # http://localhost:3005
```

Accounts and cloud sync are optional. Supabase credentials ship in
`src/supabase-config.js`, so sign-in works out of the box; with none configured
the app runs entirely on `localStorage` and says so in the auth modal.

```bash
cp .env.example .env   # optional: point at a different Supabase project
npm run validate:exams # schema-check every roadmap
```

Deploy to Vercel as-is; `vercel.json` maps the serverless routes.

## Authentication (Supabase)

Auth is handled entirely by [Supabase Auth](https://supabase.com): Google
1-click sign-in, email + password, password recovery, and silent token refresh.
Sessions persist across reloads, so students stay signed in.

**First-time project setup**

1. Run `scripts/supabase_schema.sql` in the Supabase dashboard
   (**SQL Editor → New query → paste → Run**). It creates `user_progress` with
   Row Level Security, so the browser's public anon key can only ever read and
   write the signed-in student's own rows.
2. **Authentication → URL Configuration** — set the Site URL and add every
   redirect URL you use (`http://localhost:3005` and your production domain).
3. Email/password needs nothing further. While testing, turn off
   **Authentication → Providers → Email → Confirm email** to skip the
   confirmation step.

**Enabling Google sign-in**

1. Google Cloud Console → **Credentials → Create OAuth client ID → Web
   application**.
2. Add the authorised redirect URI from your Supabase dashboard:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Paste the Client ID and Secret into **Supabase → Authentication → Providers →
   Google**, and enable it.

Until Google is enabled in the dashboard, the button renders but Supabase
rejects the request with a clear message in the modal — email sign-in still
works.

**Pointing at a different project**

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env` (or in the Vercel
dashboard). `/api/config` serves them to the browser at boot and they override
the bundled defaults, so no rebuild is needed. `SUPABASE_URL` must be the bare
project URL — a pasted `/rest/v1` suffix is trimmed automatically.

Both values are public by design. What protects student data is RLS on the
table, not secrecy of the anon key; never ship the service-role key.

## Layout

```
data/
  exams-catalog.json           # registry: categories + exam entries
  exams/*.json                 # one phased roadmap per exam
api/
  exams.js                     # GET catalog / GET one roadmap
  progress.js                  # per-(user, exam) progress
  auth/                        # register, login, me
lib/
  db.js                        # MongoDB + local-file fallback
  auth.js                      # bcrypt + JWT
src/
  supabase-config.js           # public project URL + anon key (env-overridable)
  supabase-client.js           # auth helpers: Google, email, reset, session
  state.js                     # active exam, progress, stats, cloud sync
  roadmap-renderer.js          # phase / unit / topic rendering + filters
  study-drawer.js              # per-topic panel, spaced repetition
  catalog-modal.js             # exam browser and switcher
  timer.js                     # Pomodoro
  app.js                       # theme, auth, import/export, bootstrap
scripts/
  supabase_schema.sql          # user_progress table + RLS policies
  styles-*.css
public/
  manifest.json  sw.js  icons/ # PWA
mobile/                        # React Native / Expo scaffold (same API)
scripts/validate-exams.js
```

## Adding an exam

1. Write `data/exams/<id>.json` following the schema of an existing roadmap
   (three phases; every unit needs `sectionId`, `priority`, `estMarks`, `topics`).
2. Register it in `data/exams-catalog.json` with `"available": true`.
3. `npm run validate:exams`.

The validator enforces the invariants that matter: section marks must sum to the
exam total, topic IDs must follow `<unitId>_t<index>`, every `sectionId` must
resolve, and IDs must be unique.

Bundled: Bihar STET Psychology (76 topics), CTET Paper 2 CDP (37), SSC CGL Tier 1
(47), CBSE Class 12 Physics (40). UPSC Prelims GS1 and NEET Biology are listed as
coming soon.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET`  | `/api/exams` | Catalog: categories + exams |
| `GET`  | `/api/exams?examId=<id>` | One exam's full roadmap |
| `GET`  | `/api/progress?examId=<id>` | Progress for one exam |
| `GET`  | `/api/progress?all=1` | Progress across all exams |
| `POST` | `/api/progress` | `{ examId, userState, stats, timer }` |
| `GET`  | `/api/config` | Public Supabase URL + anon key for the browser |
| `GET`  | `/api/health` | Status + which datastore is live |

The browser no longer calls `/api/auth/*` or `/api/progress`: it talks to
Supabase directly, upserting `user_progress` rows keyed by
`(user_id, exam_id)` under RLS. The legacy JWT/MongoDB endpoints remain in
`api/` for the old mobile client and are safe to delete once it migrates.

### Sync conflicts

When local and cloud state disagree, the merge runs per topic and the richer
record wins (completion, then revisions, stars, notes). Notes present on only one
side are never dropped. This is what stops a phone that was offline from erasing
work done on a laptop.

## Migration

Progress from the original single-exam tracker is picked up automatically:

- **Browser** — the old `bihar_stet_2026_psychology_tracker_v2` key is adopted
  the first time the Bihar STET roadmap loads.
- **Server** — progress documents written before `examId` existed are claimed as
  Bihar STET progress on first read, and are not visible to any other exam.

## Notes

- Static roadmap JSON is cached in the serverless container and served with
  `Cache-Control`; private progress is never cached by the service worker.
- `examId` is resolved through the catalog's registered filename, so it cannot be
  used to read files outside `data/exams/`.
- The service worker keeps `/api/progress` and `/api/auth` network-only.
