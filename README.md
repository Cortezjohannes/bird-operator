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
- live account execution with explicit failures when connectivity is unavailable

## Safety Defaults

- app login is required before the dashboard or protected APIs can be used
- new pairings default to Approval Mode, not Trusted Operator Mode
- default grants are minimal and safe
- Trusted Operator Mode must be explicitly chosen by the owner
- revoke controls stay visible on active operator sessions
- pairing links and codes are short-lived and one-time use
- connected X tokens stay server-side and encrypted at rest

## Screenshots

Sanitized live captures are intentionally not committed yet. Add them later once you have scrubbed account data, operator fingerprints, and approval artifacts.

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
- `APP_BASE_URL` or `APP_URL`
- `DATABASE_URL` if you want to exercise the Railway-style Postgres path locally

4. Start the app.

```bash
npm run dev
```

5. Open `http://localhost:3000` and sign in as the owner.

## Live X OAuth Setup

To use live X connectivity, set:

- `X_OPERATOR_CONSOLE_MODE=live`
- `APP_BASE_URL` or `APP_URL`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_TOKEN_ENCRYPTION_KEY`
- `DATABASE_URL` for production-safe persistence

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

## VPS Operator Helper

For a remote operator instance such as OpenClaw on a VPS, the repo includes a thin pairing helper. It requests pairing from the hosted app, prints the approval link and backup code, polls for approval, and stores only the resulting app-level lease locally.

It does not copy:
- Railway secrets
- X client secrets
- X access tokens
- X refresh tokens

### VPS Setup

```bash
git clone https://github.com/Cortezjohannes/bird-operator.git
cd bird-operator
npm install
cp .env.operator.example .env.operator
```

Edit `.env.operator` with at least:
- `APP_BASE_URL`
- `OPERATOR_LABEL`
- `OPERATOR_INSTANCE_ID`

Then start pairing:

```bash
npm run operator:pair
```

The helper will:
1. call the app pairing endpoint
2. print the one-time approval link
3. print the backup pairing code
4. poll until the owner approves or rejects the request
5. store the resulting app-level lease in `.operator-session.json`

Check the local operator lease status any time:

```bash
npm run operator:status
```

### VPS Security Notes

- Do not copy `.env.local`, Railway env vars, or X OAuth secrets onto the VPS.
- Do not put `APP_SESSION_SECRET`, `APP_OWNER_PASSWORD_HASH`, `X_CLIENT_SECRET`, or `X_TOKEN_ENCRYPTION_KEY` on the remote operator machine.
- The VPS only needs the hosted app URL and its own operator identity metadata.
- `.operator-session.json` contains the app-level operator lease, so keep it local and treat it like a revocable operator credential.

## Railway Deployment

The simplest reliable hosted deployment for this app is:
- one Railway web service for Next.js
- one Railway Postgres service for persistence

The app will automatically use Postgres when `DATABASE_URL` is present. Without `DATABASE_URL`, the app only uses local file persistence for local development and reports production persistence as unhealthy.

Recommended Railway env vars:
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

Railway deploy flow:
1. Create a Railway project.
2. Add a Postgres service.
3. Deploy this repo as a web service.
4. Set the web service env vars listed above.
5. Run `npm run db:migrate`.
6. Set the X OAuth callback URL to `https://your-app.up.railway.app/api/x/callback` or your custom domain equivalent.
7. Open `/api/health` and `/settings/auth` to confirm the app is healthy.

Build and run:

```bash
npm run build
npm run start
```

Post-deploy sanity checklist:
- app loads from the Railway public URL
- owner login works
- `/api/health` returns healthy
- `/settings/auth` shows the correct public callback URL
- X connect completes and redirects back to the hosted app
- capability retest works
- pairing requests can be created and approved
- revoke and downgrade still take effect immediately
- Trusted Operator Mode still respects granted capabilities server-side

More deployment notes:
- [docs/deployment.md](./docs/deployment.md)

## Important Limits

- account-security settings are intentionally out of scope
- browser fallback remains an internal future integration point, not an operator-facing automation feature
- media upload still expects existing uploaded media ids
- the owner auth model is currently single-owner-first

## Repo Safety

Never commit:
- real `.env` files
- tokens, refresh tokens, cookies, or browser auth exports
- real account data in screenshots or logs
- runtime `data/`, `logs/`, `uploads/`, or `tmp/` contents from a real deployment

See [SECURITY.md](./SECURITY.md) for operating assumptions and incident response guidance.
