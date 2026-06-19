# Flow

A minimal task manager with list, day, week, and month views.

## Run locally

```sh
npm install
npm run dev
```

The app works without external services in development:

- Browser `localStorage` keeps tasks available across refreshes.
- The API falls back to in-memory storage when Supabase env vars are not configured.

## Supabase persistence

Set these env vars in Vercel or `.env.local`:

```sh
POSTGRES_URL="postgres://..."
```

`POSTGRES_URL` is preferred because the app can auto-create its tiny `public.flow_state` table on first load.

If you do not want to expose a Postgres URL to the app server, you can use Supabase REST instead:

```sh
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVER_ONLY_SERVICE_ROLE_KEY"
# or SUPABASE_SECRET_KEY="YOUR_SERVER_ONLY_SECRET_KEY"
```

For the REST path, first run `supabase/schema.sql` in the Supabase SQL Editor.

Do not commit real env values. Real local env files such as `.env`, `.env.local`, and Vercel-specific `.env.*.local` files are ignored; `.env.example` is safe to commit because it contains placeholders only.

## Validate

```sh
npm run type-check
npm run build
```
