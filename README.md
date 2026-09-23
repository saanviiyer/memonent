# memonent

memonent is a minimalist web app for notes and memos. It writes daily and weekly digests of your notes, groups similar notes by topic, and can turn terse bullets into clean prose.

The interface is quiet. It uses a lot of whitespace, one sage accent color, and light and dark themes.

## Features

1. My Memos. Create, edit and delete notes with an optional title, a body and tags. The feed has search and a tag filter. This is the home screen.
2. Digests. Make a daily or weekly digest of the notes from that period. The digest shows themes, some highlights and the topics you wrote about. A day/week toggle sets the period.
3. Remind me later. Flag a memo with the bell to come back to it. The Reminders view lists all flagged memos. You can add an optional due time. The app then shows a best-effort browser notification while it is open.
4. Group similar notes. The app puts memos into labeled topics. The clustering is pure code (keyword and tag overlap plus text similarity) and uses no embeddings API. The AI only writes a label for each cluster.
5. Bullet to prose. A memo that looks like a bullet list gets an Expand action. Expand rewrites the points as structured prose. You can copy the result, save it as a new memo, or replace the original bullets.

## Mock mode

All AI features work with no API key. When `ANTHROPIC_API_KEY` is not set, the server runs in mock mode and builds each result from your real notes. Digests come from the notes in the date range. Group labels come from the shared keywords of each cluster. Bullet expansion gives a structured write-up of your points.

When you set `ANTHROPIC_API_KEY`, all features use the live Anthropic API (model `claude-sonnet-5`). A "mock AI" badge in the header shows the current mode. Only the server reads the key. The key never goes to the browser.

## Run it

```bash
git clone https://github.com/saanviiyer/memonent
cd memonent
npm install      # installs the server, then the client through postinstall
npm run dev      # server on :3001, client on :5173 (Vite proxies /api)
```

Open http://localhost:5173.

```bash
npm run build    # type-checks and builds the client
npm start        # production: serves the built client and /api on :3001
npm test         # unit tests for grouping, digest ranges and bullet parsing
```

## Responsive and installable

The layout is mobile-first. On a phone, the navigation moves to a bottom bar and the composer and cards use one column. On a wide screen, the tabs are at the top. The app includes a web app manifest and an SVG icon, so you can install it to a home screen as a PWA. This version has no full offline support and no real push notifications.

## Persistence

All data is in `localStorage`. The UI does not touch storage directly. It uses the `Repository` interface in `client/src/lib/repository.ts`. The current implementation is `LocalStorageRepository`.

To move to Supabase, write a new implementation of the same interface and change the exported instance. The UI does not change.

1. Create a Supabase project with a `notes` table. Match the columns to the `Note` type in `client/src/types.ts` (`id`, `title`, `body`, `tags`, `created_at`, `updated_at`, `remind`, `due_at`, `notified_at`) and add a `user_id` column.
2. Turn on row-level security. Add a policy so each user reads and writes only their own rows (`auth.uid() = user_id`).
3. Add Supabase Auth for sign-in. Write `SupabaseRepository implements Repository` with `@supabase/supabase-js`. Keep the same method names. You can change the interface to return promises.
4. Change the `export const repo` line in `repository.ts` to the Supabase implementation.

Reminders, digests and grouping all read through the repository, so this one change moves the whole app. A backend also makes real push, offline reminders and cross-device sync possible.

## Deploy

- Docker: `docker build -t memonent . && docker run -p 3001:3001 memonent`. With no `ANTHROPIC_API_KEY`, the container runs in mock mode. Add `-e ANTHROPIC_API_KEY=...` for live AI.
- Render: the repo includes `render.yaml`. It builds with `npm install && npm run build` and starts with `npm start`. It declares `ANTHROPIC_API_KEY` as a `sync: false` secret that you set in the dashboard. The server uses the `PORT` that Render sets.

In production, one server gives the built client and the `/api` routes from the same origin. You do not need a separate frontend host.

## Environment variables

Copy `.env.example` to `.env`. The app runs with none of these set.

| Name | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Optional | Turns on live AI. Without it, the server runs in mock mode. |
| `PORT` | Optional | Server port. Default is 3001. |

## Layout

```
server/
  index.js         Express app: /api/health, /api/digest, /api/group-labels, /api/expand
  ai.js            Anthropic SDK calls, with a mock fallback for each feature
client/src/
  types.ts         Shared types (Note, Digest, Group)
  lib/
    repository.ts  localStorage data access behind a Repository interface
    api.ts         fetch wrappers for the server
    grouping.ts    similarity clustering (+ grouping.test.ts)
    digest.ts      daily/weekly range filtering (+ digest.test.ts)
    bullets.ts     bullet parsing and detection (+ bullets.test.ts)
    format.ts      time and date helpers
  components/      Feed, Digests, Reminders, Groups, NoteCard, NoteEditor, ExpandModal
Dockerfile, render.yaml   deploy files
```
