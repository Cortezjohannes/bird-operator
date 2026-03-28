# X Operator Console

X Operator Console is a public-safe operator workspace for running an X account with explicit human control and revocable remote-operator access.

It is built for:
- an owner signed into the app in a browser
- a connected X account managed through hosted OAuth
- a paired remote operator that acts through the app backend, never with raw X credentials

The product is intentionally dense, operational, and audit-friendly. It is not a consumer scheduler or a black-box automation toy.

## Core Model

There are three distinct actors:
- the human owner authenticated to the app
- the connected X account
- the paired operator session

Operator access works like this:
1. An operator instance requests pairing.
2. The app issues a short-lived approval link and a one-time backup code.
3. The owner reviews the operator fingerprint, requested capabilities, and expiry.
4. If approved, the app creates an app-level operator session lease.
5. The operator acts through app-controlled backend routes, subject to grants, approvals, logs, and revocation.

Raw X tokens are never handed to the operator.

## What the App Supports

- owner authentication with secure HTTP-only sessions
- hosted X OAuth connect with encrypted token storage
- truthful capability diagnostics against live endpoints
- feed and mentions review
- drafts, queue, replies, quotes, and thread composition
- approval workflows for risky actions
- secure operator pairing with approval links, backup codes, revocation, and expiry
- Trusted Operator Mode with per-session capability grants
- profile surface editing for public profile fields only
- structured sanitized logs and basic analytics
- demo mode by default and live mode only when configured

## Safety Defaults

- demo mode is the default
- app login is required before the dashboard or protected APIs can be used
- new pairings default to Approval Mode, not Trusted Operator Mode
- default grants are minimal and safe
- Trusted Operator Mode must be explicitly chosen by the owner
- revoke controls stay visible on active operator sessions
- pairing links and codes are short-lived and one-time use
- connected X tokens stay server-side and encrypted at rest

## Screenshots

Placeholder assets are included so the repo reads cleanly on GitHub before sanitized demo captures are added.

- [Console overview placeholder](./public/screenshots/console-overview.svg)
- [Approval lane placeholder](./public/screenshots/approval-lane.svg)

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Copy the environment template.

```bash
cp .env.example .env.local
```

3. Configure app authentication in `.env.local`.

Required:
- `APP_SESSION_SECRET`
- `APP_OWNER_EMAIL`
- `APP_OWNER_PASSWORD_HASH`

Recommended:
- `APP_BASE_URL`

4. Start the app.

```bash
npm run dev
```

5. Open `http://localhost:3000` and sign in as the owner.

## Live X OAuth Setup

To use live X connectivity instead of demo mode, set:

- `X_OPERATOR_CONSOLE_MODE=live`
- `APP_BASE_URL`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_TOKEN_ENCRYPTION_KEY`

Then:
1. Sign in as the owner.
2. Open `/settings/auth`.
3. Click `Connect X`.
4. Complete the hosted OAuth flow.
5. Retest capabilities.

Capabilities are based on actual tests, not on token presence alone.

## Trusted Operator Mode

Trusted Operator Mode is explicit, scoped, and revocable.

When approving or editing an operator session, the owner chooses:
- `Approval Mode`
- `Trusted Operator Mode`
- `Custom Mode`

Each session has its own granted capabilities. Trusted sessions can execute granted actions without per-action approval, but:
- execution still goes through the app backend
- owner-only actions remain blocked
- actions are fully logged
- the session can be downgraded or revoked immediately

## Production Deployment Basics

This app is designed for VPS-style deployment behind HTTPS.

Recommended production shape:
- `APP_BASE_URL` set to the public HTTPS origin
- reverse proxy terminates TLS and forwards the canonical host
- `APP_TRUSTED_HOSTS` set to the allowed public hostnames
- runtime `data/` persisted on disk or replaced with a real database
- environment variables injected server-side only

Build and run:

```bash
npm run build
npm run start
```

Production checklist:
- set a long random `APP_SESSION_SECRET`
- set a long random `X_TOKEN_ENCRYPTION_KEY`
- confirm `APP_BASE_URL` is HTTPS and not localhost
- confirm `APP_TRUSTED_HOSTS` matches the deployed hostname
- keep `data/`, `logs/`, `uploads/`, and `tmp/` out of Git and backed by persistent storage if needed
- verify `/settings/auth` shows no deployment warnings
- verify revocation and capability retest flows before trusting an operator session

More deployment notes: [docs/deployment.md](./docs/deployment.md)

## Storage Expectations

The current repo uses local JSON-backed runtime storage in `data/operator-store.json`.

That is good enough for demo mode and careful single-instance deployment, but future production work should move runtime state to a real database for:
- better durability
- safer concurrent writes
- easier backups
- multi-user growth

## Important Limits

- account-security settings are intentionally out of scope
- browser fallback is architecture-only right now, not a shipped automation path
- media upload is still placeholder-level
- the owner auth model is currently single-owner-first

## Repo Safety

Never commit:
- real `.env` files
- tokens, refresh tokens, cookies, or browser auth exports
- real account data in screenshots or logs
- runtime `data/`, `logs/`, `uploads/`, or `tmp/` contents from a real deployment

See [SECURITY.md](./SECURITY.md) for operating assumptions and incident response guidance.
