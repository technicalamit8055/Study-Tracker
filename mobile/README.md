# ExamRoadmap — Mobile Companion (React Native / Expo)

Starter scaffold for the native app. It talks to the **same backend** as the web
app, so nothing server-side needs to change: the API contract below is already
live and covered by the web client.

## Why this exists

The web app is an installable PWA and works offline today. This scaffold is for
when you want the extras a browser cannot give you:

- push notifications for due spaced-repetition reviews,
- a home-screen widget for today's progress,
- App Store / Play Store distribution.

If you do not need those yet, ship the PWA — it is already installable.

## Quick start

```bash
npx create-expo-app@latest examroadmap-mobile
cd examroadmap-mobile
npx expo install @react-native-async-storage/async-storage expo-secure-store
# point the app at your deployment (or your LAN IP during local dev)
echo "EXPO_PUBLIC_API_BASE=https://your-deployment.vercel.app" > .env
npx expo start
```

Copy `api.js` and `useProgress.js` from this folder into the new project.

## API contract (already implemented)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET`  | `/api/exams` | Catalog: categories + exam list |
| `GET`  | `/api/exams?examId=<id>` | One exam's full phased roadmap |
| `POST` | `/api/auth/register` | `{ name, username, password }` → `{ token, user }` |
| `POST` | `/api/auth/login` | `{ username, password }` → `{ token, user }` |
| `GET`  | `/api/auth/me` | Verify token → `{ user }` |
| `GET`  | `/api/progress?examId=<id>` | This user's progress for one exam |
| `GET`  | `/api/progress?all=1` | Progress across every exam |
| `POST` | `/api/progress` | `{ examId, userState, stats, timer }` |

All authenticated calls send `Authorization: Bearer <token>`.

Progress is stored per `(userId, examId)`, so exams never collide.

## Data shapes

A roadmap:

```jsonc
{
  "id": "bihar-stet-psychology",
  "title": "…", "totalMarks": 150, "passingMarks": 75,
  "sections": [{ "id": "part1", "name": "…", "marks": 100, "badgeColor": "#4f46e5" }],
  "phases": [{
    "id": "phase-1", "name": "…", "description": "…",
    "units": [{
      "id": "psy_u1", "unitNum": "यूनिट 1", "title": "…",
      "priority": "high|medium|standard", "estMarks": "8-10 अंक",
      "pyqFocus": "…", "sectionId": "part1", "sectionMarks": 100,
      "topics": [{ "id": "psy_u1_t0", "text": "…" }]
    }]
  }]
}
```

Per-topic progress (`userState[topicId]`):

```jsonc
{
  "status": "not_started|in_progress|notes_done|mcqs_done|mastered",
  "completed": false,
  "revisions": 0,
  "revisionTiers": { "r1": "2026-09-06T…", "r2": null, "r3": null },
  "stars": 0,
  "notes": "",
  "pyqDone": false
}
```

## Porting notes

- **Storage:** swap `localStorage` for `AsyncStorage` (same key shape:
  `examroadmap_progress_<examId>`). Keep the JWT in `expo-secure-store`, not
  AsyncStorage.
- **Merge logic:** reuse `mergeProgress` from [`../src/state.js`](../src/state.js)
  verbatim — it is plain JS with no DOM dependency, and it is what keeps two
  devices from clobbering each other.
- **Stats:** `computeStats` in the same file is also DOM-free; it is the single
  source of truth for the weighted marks estimate.
- **Offline:** cache roadmap JSON in AsyncStorage on first fetch. Roadmaps are
  static, so a cached copy stays valid until you publish a new one.
- **Notifications:** schedule a local notification from `revisionTiers` — tier 1
  at +24h, tier 2 at +7d, tier 3 at +30d from the previous tier's timestamp.
