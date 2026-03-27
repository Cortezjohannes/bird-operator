# Security Policy

## Public Repo Expectations

This repository is intended to be public. Treat every committed file, screenshot, mock dataset, and code comment as publicly visible.

The repository must never include:

- real API keys, app secrets, bearer tokens, refresh tokens, cookies, or session exports
- real account IDs, personal handles, private watchlists, or strategy notes
- raw production logs, browser storage exports, or approval payloads containing secrets
- hidden prompts or undocumented private operator instructions

## Secret Handling

All live credentials must come from local environment variables or other local-only ignored storage.

Required rules:

- keep secrets server-side only
- do not render raw credentials to the client
- do not log raw headers, cookies, tokens, or request bodies containing secrets
- prefer demo mode unless you are intentionally testing local live auth
- use `.env.local` or another ignored local file for real values

This repository ships `.env.example` with placeholders only. Replace placeholders locally and never commit real values back into the repo.

## Local Runtime Data

The app stores local runtime artifacts for demo and operator workflows. These files are expected to remain local-only and ignored by Git.

Examples:

- `data/`
- `logs/`
- `uploads/`
- `tmp/`
- `playwright/.auth/`
- local SQLite or `.db` files

Do not commit runtime snapshots from a real account, even if they appear sanitized.

## What Not To Commit

Never commit:

- `.env`, `.env.local`, or any real env file
- OAuth tokens, bearer tokens, client secrets, cookie jars, or browser auth state
- real exports from X or browser automation tools
- screenshots containing private account data
- uploaded assets tied to a real operator account
- raw API responses that may contain identifiers, scopes, or private metadata

## If Keys Are Compromised

If you believe any credential has been exposed:

1. Revoke or rotate the compromised key or token in the X developer/account console immediately.
2. Invalidate any related refresh tokens, sessions, cookies, or local browser auth state.
3. Remove the exposed value from local files, logs, screenshots, and shell history where possible.
4. Search the repository history and current working tree for the leaked value or nearby excerpts.
5. If the value was ever committed or pushed, treat it as fully compromised and rotate before doing anything else.
6. Replace the local credential with a newly issued value and re-run capability diagnostics.

## Reporting

If you discover a vulnerability or accidental secret exposure, report it privately to the repository maintainer before opening a public issue.

Include:

- what you found
- how it can be reproduced
- likely impact
- whether sensitive data may already have been exposed

## Contributor Checklist

Before opening a PR or publishing the repo:

- confirm the app still works in demo mode with no secrets present
- confirm all seeded data is generic and non-personal
- confirm `.gitignore` covers local runtime artifacts
- confirm any new logs or approvals are sanitized
- confirm screenshots and docs do not reveal real account details
