# Final Delivery Checklist

Use this checklist for the final GitHub submission, PDF report, and demo recording. It points reviewers to first-party evidence and keeps the project framed as a local-first memory runtime rather than an OpenCode plugin.

## Current Implementation Claim

The repository now contains a working local-first persistent memory runtime for coding agents. The runtime stores memory in local SQLite, consolidates exact duplicate observations, supports explicit supersession of stale memories, reports governance stats, exports/imports portable snapshots, plans pruning as dry-run evidence, recalls bounded context with explainable scoring, prepares OpenCode-readable prompt documents through a thin adapter, and records retrieval/supersession audit evidence in `recall-log.json` plus `recall-metrics.json`.

## Required Verification

Run these commands from the repository root before packaging the submission:

```bash
npm test
npm run prepare:opencode-scenario -- project-rule
npm run prepare:opencode-scenario -- interrupted-task
npm run prepare:opencode-scenario -- architecture-rationale
npm run prepare:opencode-scenario -- decision-update
```

Expected result:

- `npm test` passes all runtime and evaluation tests.
- Each scenario preparation writes `prompt.md`, `recall-log.json`, `memory.sqlite`, and a handoff markdown artifact under `.runtime-data/opencode-validation/<scenario-id>/<run-id>/`.
- Each scenario preparation also writes `recall-metrics.json`, `memory-snapshot.json`, `prune-plan.json`, and updates `latest-summary.json` so report evidence can include retrieval metrics, portable memory state, and dry-run cleanup plans without adding debug material to the prompt.
- `architecture-rationale` recall evidence includes a `decision-memory` candidate and an `fts:bm25=...` reason when FTS5 is available.

Real OpenCode validation is optional for final refresh because it requires a configured local OpenCode provider. When available, use:

```bash
npm run validate:opencode-project-rule
npm run validate:opencode-interrupted-task
npm run validate:opencode-architecture-rationale
npm run validate:opencode-decision-update
```

## Latest Validated Evidence

Fresh real OpenCode validation artifacts from the final delivery pass:

| Scenario | Prepared evidence directory | Report highlight |
|---|---|---|
| `project-rule` | `.runtime-data/opencode-validation/project-rule/2026-04-24T06-36-13-475Z/` | Recalls the repository guardrail against editing `tmp/` reference repos and shows duplicate reinforcement evidence |
| `interrupted-task` | `.runtime-data/opencode-validation/interrupted-task/2026-04-24T06-22-51-641Z/` | Recalls task continuity and next-step state after interruption |
| `architecture-rationale` | `.runtime-data/opencode-validation/architecture-rationale/2026-04-24T06-22-51-642Z/` | Recalls runtime-first boundary plus `decision-memory` thin-adapter rationale |
| `decision-update` | `.runtime-data/opencode-validation/decision-update/2026-04-24T07-11-13-595Z/` | Demonstrates explicit supersession of stale adapter-owned memory decision |

## Report Evidence To Cite

- `README.md` for setup, architecture, scripts, and validation evidence.
- `implementation-brief.md` for fixed MVP scope and non-goals.
- `docs/evidence-matrix.md` for course requirement-to-artifact mapping.
- `docs/final-report-outline.md` for the final PDF structure.
- `docs/demo-runbook.md` for the 10-minute demo plan.
- `packages/runtime/src/storage.ts` for local SQLite persistence, FTS5 indexing, consolidation, supersession, fallback behavior, and legacy schema migration.
- `packages/runtime/src/text.ts` and `packages/runtime/src/retrieval.ts` for shared token cleanup and explainable keyword/tag/kind/FTS/reinforcement recall scoring.
- `packages/runtime/test/runtime.test.ts` for regression coverage of recall logs, `decision-memory`, token cleanup, FTS fallback, duplicate consolidation, supersession, governance stats, export/import, dry-run pruning, and legacy DB migration.
- `.runtime-data/opencode-validation/**/recall-log.json` for concrete RAG retrieval evidence.

## Demo Flow

1. Introduce the project as a local-first persistent memory runtime for coding agents.
2. Show `packages/runtime/src/models.ts`, `packages/runtime/src/storage.ts`, and `packages/runtime/src/retrieval.ts` to explain memory items, SQLite persistence, and recall scoring.
3. Run `npm test` and highlight the FTS fallback and legacy migration tests.
4. Open the latest `architecture-rationale/recall-log.json` and point to `kind:decision-memory`, `fts:bm25=...`, and keyword reasons.
5. Open the generated `prompt.md` to show the thin OpenCode adapter output.
6. Close with limitations: local-first single-user runtime, no graph memory, no remote team memory, no dashboard-first product, and no vector-heavy dependency.

## Submission Guardrails

- Treat `tmp/` as reference material only; do not present it as first-party implementation.
- Present OpenCode as the demo/integration surface, not the system core.
- Use `recall-log.json` for retrieval audit evidence instead of overloading prompt screenshots.
- Prefer the latest passing/prepared artifacts listed above when taking screenshots.
- Prefer the latest validated artifacts listed above when taking screenshots.
- Mention that SQLite FTS5 is an optional enhancement with deterministic fallback, not a hard dependency.
