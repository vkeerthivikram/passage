# Passage

An open-source, self-hosted alternative to Readwise Highlights, built around **capture → organize → review → remember → export**.

> **Development checkpoint.** Implementation is paused for a move to Linux. This is unfinished source code, not a tested release or a claim of feature parity. Start with [the handoff](docs/HANDOFF.md) before running or extending it.

## Direction

- React/Vite web client and React Native/Expo Android client.
- Fastify API, PostgreSQL private libraries, and background workers.
- Offline Android capture, shared text/images, local OCR, daily reviews, and Notion export.
- Browser clipping, portable exports, and gradual import/integration parity.
- Docker Compose self-hosting; managed SaaS after the self-hosted beta.
- Optional local AI or your own cloud API keys in a later milestone.

Reader functionality (RSS reading, EPUB reading, read-later inboxes, article parsing, podcast playback) is outside the initial scope.

## Repository

| Directory | Purpose |
| --- | --- |
| `apps/api` | API, authentication, database schema, import/export and review logic |
| `apps/web` | Browser application |
| `apps/android` | Expo app, SQLite outbox, native Android capture modules |
| `apps/extension` | Unpacked Chromium/Firefox selected-text clipper |
| `packages/domain` | Shared schemas, CSV helpers and date/review utilities |
| `docs` | Handoff, roadmap, implementation record and generated design concept |

## Resume on Linux

Use Node.js 22, Corepack/pnpm 10.28.2, Docker Engine with Compose, and JDK/Android SDK for native builds. Dependency installation and application validation were interrupted; follow [HANDOFF.md](docs/HANDOFF.md) to complete them. Do not deploy this checkpoint on the public internet.

## License

AGPL-3.0-only. See [LICENSE](LICENSE). Generated UI concept is a design reference, not real library data; its sample quotes and attributions must not be used as factual seeded content.
