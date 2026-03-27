# Security Policy

## Scope

This repository is intended to be public. Treat all committed code, sample data, and documentation as publicly visible.

The project must not contain:

- real API keys, tokens, cookies, or refresh tokens
- hardcoded personal account identifiers or private handles
- raw production logs or exports
- hidden prompts or private strategy notes

## Supported secret handling

- secrets must come from local environment variables
- secret values must only be accessed server-side
- demo mode should remain the default for local setup

## Reporting

If you discover a vulnerability or accidental secret exposure, please report it privately to the repository maintainer before opening a public issue.

Include:

- what you found
- how it can be reproduced
- potential impact
- whether sensitive data may already be exposed

## Hardening expectations

When contributing, prefer:

- generic sample data over realistic account data
- explicit fallbacks to demo mode
- minimal secret surface area
- no client-rendered secrets
