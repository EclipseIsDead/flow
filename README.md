# Flow

A minimal task manager with list, day, week, and month views.

## Run locally

```sh
npm install
npm run dev
```

The app works without external services in development:

- Browser `localStorage` keeps tasks available across refreshes.
- The API falls back to in-memory storage when no Redis/KV environment variables are configured.

For production-quality persistence, configure one of these stores:

1. Vercel KV / Upstash REST env vars: `KV_REST_API_URL` and `KV_REST_API_TOKEN`
2. Redis connection URL: `REDIS_URL`

## Validate

```sh
npm run type-check
npm run build
```
