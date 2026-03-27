# X Operator Console

X Operator Console is a dark, dense operator workspace for running an X/Twitter account deliberately. It is built for a human operator and an AI assistant to work together on posting, triage, approvals, profile surface updates, and diagnostics without exposing secrets or drifting into account-security settings.

The repo is public-safe by design:

- demo mode is the default
- live mode only activates from local env vars
- secrets stay server-side
- seeded data is generic
- runtime data is ignored by Git

## What It Is

This is not a consumer scheduler or a social-media SaaS clone.

It is an operator console with a mission-control feel:

- dense feed and mentions review
- draft, queue, and approval workflows
- profile surface management
- auth and capability diagnostics
- action logs and basic analytics
- browser-fallback-ready execution architecture for future Playwright integration

## Features

- Demo-first Next.js app with dark operator UI
- Server-only auth abstraction for OAuth 1.0a, OAuth 2.0 user tokens, bearer token, and client credentials
- Capability diagnostics with real probe results and sanitized errors
- Internal X client abstraction for reads, posting, engagement actions, profile mutations, and capability checks
- Feed and mentions pages with triage labels, quick actions, and watchlist hooks
- Compose and queue flows for posts, replies, quotes, and threads
- Approval policies with presets, overrides, and review queue
- Profile surface editor with revision history and approval-aware apply flow
- Structured sanitized logs and starter analytics
- Browser fallback settings and execution architecture placeholder

## Screenshots

Static placeholders are included so the repo reads cleanly on GitHub before real demo captures are added.

- Console overview placeholder: [public/screenshots/console-overview.svg](./public/screenshots/console-overview.svg)
- Approval lane placeholder: [public/screenshots/approval-lane.svg](./public/screenshots/approval-lane.svg)
- GIF placeholder note: replace these with sanitized product captures or short recordings from demo mode only

## Quickstart

1. Install dependencies.

   ```bash
   npm install
   ```

2. Copy the environment template for local use.

   ```bash
   cp .env.example .env.local
   ```

3. Start the app.

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

5. Optional verification:

   ```bash
   npm run lint
   npm run build
   ```

## Demo Mode

Demo mode is the default and is intended to look polished in a public repo.

What you get in demo mode:

- seeded feed and mentions activity
- realistic queue, approval, profile, log, and analytics states
- working local draft and triage persistence
- no real outbound account mutations
- no credentials required

The app stays in demo mode when live configuration is missing or incomplete.

## Live Mode

Live mode is opt-in and local-only.

Requirements:

- set `X_OPERATOR_CONSOLE_MODE=live`
- provide a complete local credential set for at least one supported auth strategy

Notes:

- capabilities come from actual server-side tests, not token presence alone
- raw secrets never go to the client
- if env vars are incomplete, the runtime falls back safely to demo mode
- browser fallback is only an architectural placeholder in the current repo

## Internal Architecture

Key slices:

- `src/features/x-auth/`: auth detection and capability diagnostics
- `src/features/x-client/`: internal X API abstraction and sanitized error handling
- `src/features/execution/`: normalized execution layer with future fallback hooks
- `src/features/drafts/`: compose, queue, and post flows
- `src/features/approvals/`: policy gating and approval records
- `src/features/profile/`: profile surface revisions and apply logic
- `src/features/logs/`: public-safe action logs
- `src/features/analytics/`: starter analytics views
- `src/features/operator-store/`: local ignored runtime persistence

## Public Repo Safety

Never commit:

- real `.env` files
- tokens, refresh tokens, cookies, or browser auth state
- runtime `data/`, `logs/`, `uploads/`, or `tmp/` contents from real use
- personal handles, real watchlists, or private strategy notes
- screenshots containing real account data

See [SECURITY.md](./SECURITY.md) for the full policy.

## Roadmap

- richer watchlist management and targeting tools
- dedicated audit and execution timeline views
- scheduler/worker support for scheduled queue items
- media upload pipeline for profile and post attachments
- Playwright-backed browser fallback executor
- broader analytics and follower snapshot automation

## Current Limitations

- demo mode is intentionally stronger than live mode in a few areas because the live executor remains conservative
- browser fallback does not perform real automation yet
- local persistence is JSON-file based rather than a full database
- media upload is placeholder-only

## Development Notes

- build incrementally and keep demo mode working
- keep all secrets and live config local
- prefer generic seeded data over realistic personal account data
- treat any new logs, screenshots, and fixtures as public artifacts
