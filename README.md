# memonent

Smart, minimalist storage for your notes and memos. One calm place for everything, with
daily and weekly digests of what you have written, a "remind me of this later" flag,
automatic grouping of similar notes, and a one-tap expansion of terse bullets into a
thorough, clean explanation.

The interface is deliberately quiet: generous whitespace, one restrained sage accent,
light and dark themes, and nothing in the way of writing something down.

## Features

1. **My Memos.** Create, edit, and delete notes with an optional title, a body, and
   tags. A clean feed with search and a tag filter. This is the home screen, and it is
   the priority: uncluttered and fast.
2. **Digests.** Generate a daily or weekly digest that summarizes the notes written in
   that period. The digest surfaces the themes, a few highlights, and what you were
   thinking about. A day / week toggle switches the window.
3. **Remind me later.** Flag any memo with the bell to revisit it. The Reminders view
   lists everything flagged, and you can add an optional in-app due time for a
   best-effort browser notification while the app is open.
4. **Group similar notes.** Memos are clustered into labeled topics automatically. The
   clustering runs in pure code (keyword and tag overlap plus text similarity), with no
   embeddings API. The AI is used only to give each cluster a nicer label.
5. **Bullet to prose.** Any memo that reads like a bullet list gets an Expand action
   that rewrites the terse points into structured prose. You can copy the result, save
   it as a new memo, or replace the original bullets.

## Mock mode (no key needed)

Every AI feature works with no API key. When `ANTHROPIC_API_KEY` is unset the server
runs in **mock mode** and builds each result from your actual notes:

- Digests are synthesized from the real notes in range (themes, highlights, and topics),
  not filler text.
- Group labels are derived from each cluster's shared keywords.
- Bullet expansion produces a sensible, structured write-up of your points.

Set `ANTHROPIC_API_KEY` to switch every feature to the live Anthropic API
(model `claude-sonnet-5`). A small "mock AI" badge in the header tells you which mode you
are in. The key is read server-side only and is never shipped to the browser.

## Run it

```bash
npm install     # installs the server and, via postinstall, the client
npm run dev      # server on :3001, client on :5173 (Vite proxies /api)
```

Open http://localhost:5173. It works fully in mock mode with no keys.

```bash
npm run build    # type-checks and builds the client (zero TS errors)
npm start        # production: serves the built client and /api on :3001
npm test         # runs the unit tests (grouping, digest ranges, bullet parsing)
```

## Responsive and installable

memonent is mobile-first and responsive. On a phone the navigation moves to a bottom bar
and the composer and cards reflow to a single column; on a wider screen the tabs sit at
the top. A web app manifest and an SVG icon are included, so it can be installed to a home
screen as a lightweight PWA. Full offline support and real push notifications are out of
scope for this version (see below).

## Persistence and the Supabase upgrade path

All data lives in `localStorage`, behind a single data-access abstraction so nothing in
the UI touches storage directly. See `client/src/lib/repository.ts`: the entire app talks
to a `Repository` interface, and the current implementation is
`LocalStorageRepository`.

To move to a real backend later, implement the same `Repository` interface against
Supabase and swap the exported instance. No UI changes are required.

1. Create a Supabase project and a `notes` table with columns matching the `Note` type in
   `client/src/types.ts` (`id`, `title`, `body`, `tags`, `created_at`, `updated_at`,
   `remind`, `due_at`, `notified_at`), plus a `user_id` column.
2. Enable row-level security and add a policy so each user reads and writes only their own
   rows (`auth.uid() = user_id`).
3. Add Supabase Auth for sign-in, and write a `SupabaseRepository implements Repository`
   using `@supabase/supabase-js`. Map the async calls behind the same method names (the
   interface can be widened to return promises).
4. Swap the `export const repo` line in `repository.ts` to the Supabase implementation.

Because reminders, digests, and grouping all read through the repository, this single swap
carries the whole app. A backend also unlocks the pieces that need one: real push and
offline reminders, and cross-device sync.

## Deploy

- **Docker.** `docker build -t memonent . && docker run -p 3001:3001 memonent`. With no
  `ANTHROPIC_API_KEY` set, the container runs in mock mode and is fully demoable. Pass
  `-e ANTHROPIC_API_KEY=...` for live AI.
- **Render.** `render.yaml` is included. It builds with `npm install && npm run build`,
  starts with `npm start`, and declares `ANTHROPIC_API_KEY` as a `sync: false` secret you
  set in the dashboard. Render injects `PORT`, which the server honors.

The production server (`npm start`) serves the built client and the `/api` routes from the
same origin, so there is no separate frontend host to manage.

## Project layout

```
server/
  index.js         Express app: /api/health, /api/digest, /api/group-labels, /api/expand
  ai.js            Anthropic SDK calls with a grounded mock fallback for every feature
client/src/
  types.ts         Shared types (Note, Digest, Group)
  lib/
    repository.ts  localStorage data access behind a Repository interface
    api.ts         fetch wrappers for the server
    grouping.ts    pure similarity clustering (+ grouping.test.ts)
    digest.ts      pure daily/weekly range filtering (+ digest.test.ts)
    bullets.ts     pure bullet parsing and detection (+ bullets.test.ts)
    format.ts      small time and date helpers
  components/      Feed, Digests, Reminders, Groups, NoteCard, NoteEditor, ExpandModal
```
