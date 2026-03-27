# X Operator Console

X Operator Console is a dark, dense operator workspace for deliberate X/Twitter account operations. It is designed for a human operator and an AI assistant to work together safely, with demo mode enabled by default and live mode gated behind server-side environment variables.

## Current scope

The repository currently includes:

- Next.js + TypeScript + Tailwind foundation
- dark mission-control dashboard shell
- server-only mode resolution for `demo` vs `live`
- seeded mock snapshot data for queue, watchlist, activity, profile, and analytics
- server-side auth abstraction for OAuth 1.0a, OAuth 2.0 user tokens, bearer token, and client credentials
- capability diagnostics page with sanitized probe results
- internal X client service for demo/live operations, structured logs, and normalized errors
- feed and mentions operator pages with persistent local triage labels
- compose and queue workflows with thread-capable draft storage
- policy-driven approval workflows with presets, overrides, and sanitized execution logs
- public-repo hygiene files and setup guidance

No real credentials, handles, watchlists, or logs are committed.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- single-account-first architecture
- demo-first runtime with server-side live capability detection

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example if you want to customize runtime behavior:

   ```bash
   cp .env.example .env.local
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

By default, the app runs in demo mode with seeded mock data.

## Auth diagnostics

Visit `/settings/auth` to inspect:

- current runtime mode
- detected auth methods
- capability probe matrix
- last tested timestamps
- sanitized error snippets

API routes:

- `GET /api/auth/status`
- `GET /api/capabilities`
- `POST /api/auth/retest`

## Demo mode

Demo mode is the default and is safe for a public repository:

- no credentials required
- seeded mock operator data
- no outbound account actions
- no secrets rendered client-side

## Live mode

Live mode is intentionally gated. It will only activate when:

- `X_OPERATOR_CONSOLE_MODE=live`
- at least one complete live auth method is available in local server env

Capability support is determined by server-side probe requests, not by token presence alone.

If live env vars are missing or incomplete, the app falls back to demo mode.

## Public repo safety

Never commit:

- `.env.local`
- tokens, refresh tokens, cookies, or exports
- runtime database files
- logs containing sensitive account activity
- personal watchlists or strategy notes

Use only generic seeded data in source control.

## Project structure

```text
app/
  layout.tsx
  page.tsx
src/
  features/console/
    components/
    data/
    server/
```

## Next phases

Planned follow-up slices include:

- deeper auth/capability diagnostics expansion
- persistent operational analytics and audit views
- profile mutation flows
- browser fallback architecture

## Security

See [SECURITY.md](./SECURITY.md) for reporting guidance and repository safety expectations.
