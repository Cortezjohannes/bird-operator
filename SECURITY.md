# Security Policy

## Scope

This repository is public product code. Assume every committed file, fixture, screenshot, and code comment is visible to the public.

The app is designed so that:
- owners authenticate to the app first
- X tokens remain server-side
- remote operators receive app-level session leases, not raw X credentials
- risky actions remain scoped, logged, and revocable

## Secret Handling

Never commit or expose:
- `APP_SESSION_SECRET`
- `X_TOKEN_ENCRYPTION_KEY`
- `X_CLIENT_SECRET`
- access tokens
- refresh tokens
- bearer tokens
- cookies
- browser auth exports

Rules:
- secrets must come from local env or deployment secret storage only
- secrets must never be rendered into client HTML or JSON responses
- logs must never include raw authorization headers or token material
- any new error or log path must pass through sanitization

## Owner and Operator Permissions

The permission model is intentionally asymmetric.

Owner:
- signs into the app with the owner account
- connects or disconnects the X account
- approves or rejects operator pairing requests
- grants or edits operator capabilities
- revokes or downgrades operator sessions
- changes app-level settings

Operator:
- requests pairing
- receives a short-lived approval link or one-time backup code
- gets an app-level lease only after explicit approval
- can execute only the capabilities granted to the active operator session

Operators do not receive raw X credentials.

## Trusted Operator Mode

Trusted Operator Mode is not a hidden global bypass.

It must always remain:
- per-session
- explicitly granted by the owner
- capability-scoped
- revocable
- audited
- enforced server-side

If a future change weakens any of those properties, treat it as a security regression.

## Token Safety Expectations

Hosted X OAuth tokens are expected to be:
- stored server-side only
- encrypted at rest
- absent from client responses
- absent from logs
- invalidated locally when the connected account is disconnected

If encryption is not configured, live OAuth connect should not be considered production-ready.

## Runtime and Local Data

The app currently stores runtime state locally in ignored files such as:
- `data/`
- `logs/`
- `uploads/`
- `tmp/`
- `playwright/.auth/`

Those artifacts may contain sensitive operational data even when they do not contain raw tokens. Keep them local-only or replace them with a secured production data store.

## What Not To Commit

Do not commit:
- `.env`, `.env.local`, or real deployment env files
- real screenshots from production accounts
- local runtime DB files or JSON snapshots from real use
- copied API responses from a real connected X account
- browser storage exports, cookies, or Playwright auth state
- personal watchlists, target accounts, or private operator notes

## Revocation Expectations

Revocation must take effect immediately for:
- active operator sessions
- pairing requests that have not been consumed
- approvals or grants that should no longer be trusted

If you discover a code path where a revoked or expired operator session can still act, treat it as a security bug.

## If Credentials Are Compromised

If any owner credential, session secret, token, or X app credential may be exposed:

1. Revoke or rotate the compromised X credential immediately.
2. Rotate `APP_SESSION_SECRET` if app sessions may be affected.
3. Rotate `X_TOKEN_ENCRYPTION_KEY` and reconnect accounts if encrypted token material may be compromised.
4. Revoke all active operator sessions from the app.
5. Remove the secret from local files, logs, screenshots, shell history, and any copied artifacts.
6. Search the git history and working tree for leaked values or recognizable excerpts.
7. Re-run capability diagnostics and operator pairing only after rotation is complete.

## Reporting

If you find a vulnerability or accidental data exposure:
- report it privately to the maintainer first
- include impact, reproduction steps, and what data may be exposed
- avoid posting secrets or sensitive payloads in a public issue

## Contributor Checklist

Before pushing code or opening a PR:
- verify demo mode still works with no secrets configured
- verify sensitive routes require owner auth or a valid operator lease
- verify new logs and errors are sanitized
- verify no new env examples contain real values
- verify no screenshots or docs reveal real account data
