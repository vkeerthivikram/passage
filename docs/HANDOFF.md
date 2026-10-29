# Linux handoff — 29 October 2026

## State at pause

Vicky requested implementation of the agreed Passage plan, then asked to stop and publish a public GitHub checkpoint so work can resume on a Linux laptop. Preserve this checkpoint as unfinished work. No production deployment or release has been performed.

The project started as an empty directory without Git history. Work was delegated across server/domain, web, and Android; controller added root configuration, Docker files, browser clipper and a generated design reference. No relevant memory-derived project facts were used.

## Checks actually completed

- Verified Node.js v22.22.2 and Git availability on Windows.
- Pinned pnpm 10.28.2; npm registry access works with network permission.
- Detected and corrected the backend workspace dependency from `*` to `workspace:*`.
- Downloaded official AGPL-3.0 license text.
- Generated and saved `docs/design-concept.png`; no browser screenshot/fidelity check completed.
- Dependency installation was deliberately interrupted at the user's pause request. Do not trust existing ignored node_modules; install fresh on Linux.
- No successful full build, typecheck, test suite, database integration check, browser test, native build, OCR test, backup/restore drill or benchmark has been recorded.
- Docker Desktop was started on Windows after its engine was initially unavailable. Compose stack was not validated.

## First steps on Linux

```sh
corepack enable
corepack prepare pnpm@10.28.2 --activate
pnpm install
cp .env.example .env
```

Generate strong secrets locally, replace all `.env` placeholders, and keep `.env` untracked. Generate AUTH_SECRET with `openssl rand -hex 32` and ENCRYPTION_KEY with `openssl rand -hex 32`. The code/config must be reconciled before Compose is considered deployable.

Then inspect package scripts and run:

```sh
pnpm --filter @passage/domain typecheck
pnpm --filter @passage/domain test
pnpm --filter @passage/api typecheck
pnpm --filter @passage/web build
pnpm --filter @passage/android typecheck
```

Fix actual errors before starting the service. Run migrations against a disposable PostgreSQL database, then test isolation with two accounts. Complete Expo dependency alignment (`pnpm --filter @passage/android exec expo install --fix`) and inspect generated changes. Android SDK/JDK setup, local native-module autolinking and a device build still need verification. The native OCR implementation starts with a bundled Latin model; broad mixed-script parity is not established.

## Known integration/review items

1. Check `apps/api/src/index.ts`, worker and static serving against root scripts and Dockerfile. Some files were still being completed when pause arrived.
2. Reconcile WEB_ORIGIN versus WEB_URL environment names in CORS/Better Auth and Docker.
3. Categories originally requested as plural names are implemented by the backend using singular values: `book`, `article`, `tweet`, `podcast`, `video`, `note`, `conversation`, `other`. Ensure clients/extension normalize these consistently (the clipper initially sends `articles`).
4. Backend collection search initially uses ILIKE and does not join all source metadata; full-text indexing and source/tag search require review.
5. Import commit originally deduplicates a repeated preview commit only. Cross-preview deduplication, provider identity, original-content preservation and complete archive roundtrip require review.
6. Review skip originally counted toward completion. Skip/processed behavior, deleted cards, recurrence suppression, category weights and stable offline replay need tests and corrections.
7. Revocable personal integration token APIs and Settings UI were requested but their completion is unverified. The clipper requires them. Do not treat Better Auth session tokens as durable public integration tokens.
8. Compose initially uses the PostgreSQL superuser as application user. Although tables declare RLS, superuser connections bypass it. Add a separate least-privilege runtime role and verify policies under that role before claiming database isolation. Workers must bind user context too.
9. Notion retry reconciliation, append-only preservation, selected export, refresh, and OAuth are incomplete/unverified. Never blindly retry ambiguous external writes.
10. Better Auth bootstrap/invite creation spans separate DB operations; transaction/race handling needs review. Validate origin protections on custom mutations, token authentication and cookie flows.
11. No full Readwise compatibility API, OAuth MCP server, AI layer, email ingestion, PDF importer, external provider connectors, hosted billing or remaining feature parity has been completed.
12. No dependency lockfile was validated at pause; regenerate and commit one after a successful clean installation. Do not describe the environment as reproducible until that check passes.
13. Web worker confirmed additional contract mismatches: plural category values, `reviewSize`/`reviewFrequency` settings instead of backend `dailyCount`/`reviewTime`, themes form fields, import format values, and bulk request `limit=10000`/`discarded=all` exceeding backend validation. Setup needs an explicit subsequent sign-in to obtain web cookies. Token management and Notion export trigger UI are absent. Check unused imports during the first typecheck. Web styles were saved before the freeze; no fake library was seeded.
14. Android worker confirmed source creation sends `type` instead of backend `category`, and `Review.completed` is typed as a number instead of boolean. Conflict retry cannot yet rebase; offline-create-then-edit revision handling is unverified.
15. Backend worker confirmed `apps/api/src/worker.ts` was not written. Root/package scripts reference it, so worker startup cannot succeed in this checkpoint. No worker-delivery claim should be made.

## Resume prompt

Read README.md, docs/HANDOFF.md, docs/ROADMAP.md and docs/IMPLEMENTATION.md. Inspect existing code before editing; this is a partial multi-agent checkpoint. Complete and test stages 0–1 first. Preserve private-library isolation, local/offline capture, idempotent sync, stable reviews and append-only exports. Record actual test results, then implement remaining parity in stages. Do not label placeholders, manual alternatives, or untested connectors as complete integrations.
