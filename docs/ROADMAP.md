# Passage implementation roadmap

Accepted direction: self-hosted plus SaaS, shared TypeScript, web plus Android, open-source full product under AGPL-3.0-only. Docker on NAS/VPS. Paid SaaS follows self-hosted beta. AI optional via local providers or user cloud keys; core works without AI. Baseline Readwise Highlights capabilities as of 29 October 2026. iOS and Reader are outside initial scope.

Everything below is **planned or unverified** unless a test result explicitly establishes completion. This checkpoint does not meet any milestone gate yet.

## Stage 0 — Foundation

Private accounts/libraries, Better Auth email/password, initial administrator setup, invitations, revocable tokens, API/contracts, PostgreSQL schema/migrations with effective RLS, Android custom server connection, durable job processing, local file storage/S3 adapter, Docker, backups/restore. Gate: two-user isolation and fresh install/restore verified.

## Stage 1 — Core capture beta

Source metadata (title, author, category, cover, URL, page/location, timestamps), source/highlight tags and notes, favorites, discard/restore, bulk organization, manual/freeform capture, book lookup/manual entry, paper-book OCR with correction, Android shared text/images, SQLite outbox and conflict preservation. Search highlight text/notes plus source metadata and tags, filters/pagination. Stable persisted daily reviews across devices, configurable size/timezone/reminder/frequency, Keep/Discard versus Skip, card/list modes, streaks. Notion automatic/manual append-only export with selection/layout/location and explicit refresh. Accessible responsive UI, light/dark, keyboard shortcuts, sync status. Gate: offline capture → sync → web review → duplicate-free Notion export.

## Stage 2 — Priority sources

Chromium/Firefox selected-text clipper; ChatGPT selected passages plus user-exported conversations (select conversations, preserve roles); CSV mapping/preview; Readwise API/JSON migration preserving metadata/tags/notes/favorite/discard; PDF annotation extraction with page positions and correction; SMTP review mail and verified-sender IMAP imports; Instapaper current API; Voicenotes custom webhooks and backfill; Inoreader/Refind direct-access feasibility and explicit manual alternatives where needed. All imports use preview/report, provenance, conservative identity-based deduplication and idempotent commits. A manual route never counts as automatic parity.

## Stage 3 — Learning, AI, hosted launch

Themed reviews from manual sources/tags and AI topics, previews, schedules and email preferences. Mastery Q&A/cloze independent of original highlights, standalone sessions, Soon/Later/Someday half-life behavior and documented independent scheduler. Review history, quality-filter toggle, related highlights, audio speed/navigation. Action tags: inline tags, concatenation `.c1` onward, `.h1`–`.h3` headings while preserving raw originals. Semantic search and cited chat, quizzes/themes/history, separate chat/embedding adapters, consent before cloud use, model-change reindexing. OAuth/PKCE protected read-only MCP. Hosted subscriptions/quotas/support/monitoring and restore drills before paid launch.

## Stage 4 — Remaining parity

Dictation, marker detection, text/image sharing, Android widgets, optional Discord reviews; licensed supplemental highlight collections and recommendations. Independently track every import: Kindle, Apple Books, Kobo, BookFusion, Command Browser, Everand, Feedly, Goodreads, Google Play Books, Hypothes.is, library books, Moon+ Reader, O'Reilly, Raindrop, Reader highlights, Snipd, Twitter/X. Export: Apple Notes, Capacities, Craft, Evernote, Logseq, Markdown/CSV, NotebookLM, Obsidian, OneNote, RemNote, Roam, Tana, Workflowy. Kindle automatic sync requires an extension; API compatibility cannot redirect upstream services hardcoded to Readwise.

## Interfaces and acceptance

Versioned /api/v1 REST/OpenAPI and generated clients; Readwise /api/v2 compatibility matrix; OAuth MCP; complete versioned JSON+attachments archive plus Markdown/CSV. Preserve imported originals, local edits and conflicts. Sync operation IDs, revisions, tombstones and ownership on every code path. Remove a connector without removing its library. No silent deletion of local annotations on source deletion.

Required checks: import/sync retry and concurrency; process-death offline recovery; timezone/DST/empty/deleted review cases; Notion rate limits/ambiguous writes/user edits; malformed/unsafe uploads; OCR rotation/mixed scripts; PDF multiline/multicolumn; cross-account data/search/files/AI/MCP isolation; cited AI without fabricated evidence; migration/upgrade/backup restore. Performance targets (unmeasured): 100k highlights, 2 vCPU/4GB excluding AI, 10 concurrent users; search p95 <500ms, ordinary API p95 <300ms; Android cached startup <2s and smooth review scrolling on midrange physical device. Large jobs must not stall interactive operations.

## References

- [Readwise integrations](https://docs.readwise.io/highlights/docs/all-integrations)
- [Review behavior](https://docs.readwise.io/highlights/docs/faqs/reviewing-highlights)
- [Mastery](https://docs.readwise.io/highlights/guides/mastery)
- [Action tags](https://docs.readwise.io/highlights/guides/action-tags)
- [Notion append-only export](https://docs.readwise.io/highlights/docs/exporting-highlights/notion)
- [Readwise API](https://readwise.io/api_deets)
- [Voicenotes webhooks](https://help.voicenotes.com/en/articles/9895482-set-up-webhooks)
- [Instapaper API](https://www.instapaper.com/developers/v2)
