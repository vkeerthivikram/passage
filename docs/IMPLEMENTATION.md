# Implementation record

Baseline: Readwise Highlights, 29 October 2026. Reader functionality is excluded.

The repository began empty, without Git history or existing code. Work is split into domain/API, web, Android, and deployment/capture integration. Each component's actual validation is recorded in VALIDATION.md. Planned integrations are not represented as connected services.

## Decisions

- Use AGPL-3.0-only, as recommended in the accepted plan.
- Keep the web client and native client separate; share contracts and review logic.
- Core data requires PostgreSQL. No silent in-memory fallback in production.
- Keep external-service credentials installation-owned. No mandatory Passage cloud account.
- A self-hosted public instance must configure HTTPS and exact trusted origins.

## Review ledger

- Domain/API: partial implementation frozen; unverified, known gaps in HANDOFF.md.
- Web: partial implementation frozen; API contract alignment and validation pending.
- Android: partial implementation frozen; native build/device verification pending.
- Deployment/extensions: files saved; execution unverified.
- Final integration/security review: not performed; user requested checkpoint and pause.
