# Railway Deployment

## Recommended Railway Setup

Use two Railway services:
- a web service for the Next.js app
- a Postgres service for durable persistence

Do not rely on the local file-backed store for Railway production. Railway deployments can restart or rebuild without preserving local runtime files the way this app expects.

## Required Environment Variables

Set these on the Railway web service:

- `APP_BASE_URL` or `APP_URL`
- `APP_TRUSTED_HOSTS`
- `DATABASE_URL`
- `APP_SESSION_SECRET`
- `APP_OWNER_EMAIL`
- `APP_OWNER_PASSWORD_HASH`
- `X_OPERATOR_CONSOLE_MODE=live`
- `X_TOKEN_ENCRYPTION_KEY`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`

Optional:
- `X_OAUTH_SCOPES`
- `OPERATOR_PAIRING_REQUEST_TTL_MINUTES`
- `OPERATOR_SESSION_TTL_HOURS`
- `DATABASE_SSL`

## Build and Start

Railway can use the native Node/Next.js flow.

Build command:

```bash
npm run build
```

Start command:

```bash
npm run start
```

Migration command:

```bash
npm run db:migrate
```

## X OAuth Callback

Your X app callback URL should point to:

```text
https://your-app.up.railway.app/api/x/callback
```

If you later attach a custom domain, update the callback URL accordingly.

The app derives the callback from `APP_BASE_URL` or `APP_URL`, so make sure one of those matches the public Railway URL exactly.

## Railway Deployment Steps

1. Create a Railway project.
2. Add a Postgres service.
3. Deploy this repo as a web service.
4. Copy the Postgres `DATABASE_URL` into the web service env vars.
5. Set the app URL and auth secrets.
6. Run `npm run db:migrate`.
7. Add the X OAuth callback URL in the X developer portal.
8. Open `/api/health` and confirm it returns healthy.
9. Sign in and complete X connect from `/settings/auth`.

## Persistence Notes

When `DATABASE_URL` is present, the app stores runtime state in Postgres.

That covers:
- app user metadata
- connected X accounts
- encrypted token envelopes and token health metadata
- operator pairing requests
- operator sessions
- approvals
- logs
- drafts
- watchlists

When `DATABASE_URL` is absent, the app only falls back to the local file store for development. In hosted production this is treated as an unhealthy configuration.

## Post-Deploy Checklist

- the Railway app URL loads
- owner login works
- `/api/health` reports healthy Postgres persistence
- `/settings/auth` shows the correct callback URL
- X connect succeeds and returns to the hosted app
- capability probes run
- a pairing request can be approved
- an active operator can be revoked immediately
- Trusted Operator Mode still respects server-side grants and owner-only boundaries
