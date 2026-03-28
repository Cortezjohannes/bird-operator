# Deployment Notes

## Minimum Production Shape

- one Next.js server process or one VPS-hosted instance
- HTTPS terminated at a reverse proxy
- `APP_BASE_URL` set to the public HTTPS origin
- `APP_TRUSTED_HOSTS` set to the allowed public hostnames
- persistent writable storage for `data/`

## Required Environment Variables

- `APP_BASE_URL`
- `APP_SESSION_SECRET`
- `APP_OWNER_EMAIL`
- `APP_OWNER_PASSWORD_HASH`
- `X_TOKEN_ENCRYPTION_KEY`

For live X connectivity:
- `X_OPERATOR_CONSOLE_MODE=live`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`

## Build and Start

```bash
npm install
npm run build
npm run start
```

## Reverse Proxy Assumptions

The app expects:
- a stable public hostname
- forwarded requests to preserve the canonical host
- HTTPS in front of the app for production cookies and OAuth callbacks

## Storage Caveat

The current repo stores runtime state in local JSON files under `data/`.

That means production deployments should:
- mount persistent storage
- back up the directory if the data matters
- avoid running multiple writers against the same file-backed store

For larger or multi-user deployment, move runtime state to a real database.
