# Progress Tracker

## Purpose

This file tracks actual implementation progress for the final project.

Use `implementation-brief.md` as the stable internal guide.
Use this file as the living execution log.

## Current Status

### Phase

Phase 1 implementation started. First-party runtime scaffolding now exists outside `tmp/`.

### Current direction

- Core product: local-first persistent memory runtime for coding agents
- Primary demo surface: OpenCode
- Course core components: Prompt Engineering + RAG
- Scope strategy: hybrid MVP first, stretch features later
- Current implementation path: minimal TypeScript workspace using direct Node `.ts` execution and built-in `node:sqlite`

## Completed So Far

- Read and analyzed `assignment.txt`
- Reviewed and rewrote `proposal.md`
- Evaluated external inspiration sources at a direction level
- Analyzed local reference projects:
  - `local prototype repository`
  - `local VCP research repository`
- Pulled local reference copies into `tmp/`:
  - `tmp/opencode-upstream`
  - `tmp/memkraft`
- Wrote `implementation-brief.md`
- Settled on a runtime-first testing strategy: runtime tests first, OpenCode integration tests second, demo/manual QA third
- Settled on benchmark policy: MemKraft/LongMemEval may be used as reference or adapted baseline, but not as the sole project score
- Created first-party phase-1 scaffold:
  - root `package.json` and `tsconfig.json`
  - `packages/runtime/src/` for storage, retrieval, context assembly, and runtime facade
  - `packages/opencode-adapter/src/` for a thin OpenCode-facing bridge
  - `packages/runtime/test/runtime.test.ts` for the local persistence/retrieval/context loop
  - `evaluation/scenarios/project-rule.json` for the first evaluation seed

## Next Milestones

### Milestone 1: repository scaffolding

Status: started and minimally scaffolded.

Target outcomes:

- decided folder structure
- created initial packages/modules
- defined runtime/adapter boundary in code

### Milestone 2: minimal runtime

Status: runtime skeleton plus session-summary/handoff generation are implemented, and the non-hook OpenCode path has already produced real validations across the project-specific scenarios.

Target outcomes:

- define storage schema
- implement memory write path
- implement memory read/recall path
- generate runtime-owned session summary and handoff artifacts

### Milestone 3: OpenCode demo integration

Status: three real non-hook OpenCode validations are complete, and the current non-hook path is reusable and scriptable across all three project scenarios.

Target outcomes:

- connect runtime to an OpenCode-facing workflow
- demonstrate bounded context injection
- preserve at least one cross-session memory scenario
- avoid conflicts with existing plugin hook ownership by using non-hook server/client surfaces

### Milestone 4: evaluation and presentation assets

Status: three real non-hook OpenCode validations exist across the project-specific scenarios; the remaining work is to curate those artifacts for README/PDF/video/web delivery.

Target outcomes:

- produce baseline vs memory-assisted scenarios
- capture outputs for README/PDF/video/web page

## Current TODO Queue

- [x] Decide exact repository/module layout for implementation
- [x] Define first-pass runtime schema and storage plan
- [x] Choose initial retrieval method for MVP
- [x] Define the smallest OpenCode demo path
- [x] Define 2-3 evaluation scenarios
- [ ] Decide whether to adapt any MemKraft benchmark assets as an external reference layer

## Optimization Backlog

Current optimization focus is polish, evidence, and explainability, not scope expansion.

Candidate directions:

- Retrieval tuning: refine deterministic scoring with inspectable contributions from keyword, tag, kind, recency, and task scope.
- Recall logging: persist query, candidates, score reasons, included items, omitted items, and bundle budget for debugging and final-report evidence.
- Context assembly tuning: test smaller and larger item/character limits against the existing `project-rule`, `interrupted-task`, and `architecture-rationale` scenarios.
- Artifact clarity: make prompt, handoff, session-summary, and validation outputs easier to explain as a reviewer-facing evidence trail.
- Lifecycle hygiene: consider lightweight consolidation, decay, pruning, tombstone/recovery, and health checks before any vector-heavy or graph-based memory work.
- Checkpoint inspection: improve checkpoint/restore evidence and restore-window explanation before adding branching or time-travel semantics.
- Multi-agent hygiene: preserve the separation between shared task state and agent-local trace state; require explicit promotion before subagent results become durable shared memory.

Not in scope for required completion:

- graph-based memory
- vector-heavy retrieval as a dependency
- dashboard-first inspection
- plugin/hook-first OpenCode ownership
- remote sync or team memory
- broad benchmark claims against unrelated memory systems

## Reference Review Notes

- `local prototype repository` was inspected as the closest prior prototype. Useful ideas include runtime/adapter separation, bounded context preview, explicit `memory_promote`, task-scoped checkpoint tools, episodic decay, deduplication, and SQLite FTS5 recall. For this project, those remain scoped optimization candidates rather than required parity targets.
- `tmp/memkraft` was inspected as a local-first memory toolkit reference. Useful ideas include tiered memory, reversible tombstone/recovery behavior, compact/digest/health lifecycle operations, decision records that preserve what/why/how rationale, evidence-first recall, and source-attributed human-readable artifacts. Graph links, time travel, broad CLI surface, and benchmark claims remain outside the critical path.
- `local VCP research repository` was inspected for RAG and context-management patterns. Useful ideas include read-only `ContextBridge` style boundaries, cached context signals, defensive context folding, dynamic strategy selection, and clear failure fallbacks. Its vector-heavy TagMemo/EPA/residual-pyramid stack is not a dependency for this MVP.
- Knox memory docs were reviewed as conceptual guidance for layered memory, context-aware loading, consolidation, selective forgetting, and multi-strategy retrieval. The unlimited-context and graph/platform framing should be cited as inspiration only, not as a claim implemented here.

## Phase 1 Design Decisions

- Layout: keep first-party code in `packages/runtime`, `packages/opencode-adapter`, and `evaluation`; leave `tmp/` as read-only reference material.
- Runtime boundary: `packages/runtime` owns models, SQLite storage, deterministic retrieval, and bounded context assembly.
- Adapter boundary: `packages/opencode-adapter` only prepares an injection bundle request and contains no storage or ranking logic.
- Storage: use repo/local SQLite database paths supplied by callers; tests create temporary SQLite files during the test flow.
- Retrieval: use project/task/kind filters plus explainable keyword/tag scoring before any graph, vector, or remote memory work.
- Context assembly: keep durable project facts separate from working memory and enforce item/character limits.
- Blockers: none known for the phase-1 skeleton; future work must confirm Node `node:sqlite` availability in every demo environment.
- Demo-path status: real non-hook OpenCode workflow validation now exists for the three project-specific scenarios, and the next work is delivery/polish rather than proving the integration path itself.

## Scope Guardrails

Do not expand into these areas unless MVP is already stable:

- graph memory
- team/shared remote memory
- broad multi-host support
- dashboard-first development
- self-bootstrapping as a hard dependency
- advanced checkpoint branching and restore UX

## Risks To Watch During Build

- host integration details taking over runtime design
- retrieval becoming too noisy too early
- overbuilding memory taxonomy before demo path exists
- spending too much time on inspiration-source fusion
- building stretch features before evaluation is ready
- letting OpenCode integration complexity block core runtime verification
- treating borrowed benchmark numbers as if they directly measure this project's thesis

## Update Rule

Update this file whenever one of these happens:

- a milestone starts or finishes
- scope changes
- a major blocker appears
- a design decision is finalized
- a demo path becomes working

## Log

### 2026-04-23

- Reframed project around runtime-first architecture instead of plugin-first framing.
- Confirmed that a separate internal execution document is needed.
- Added `implementation-brief.md` and this `progress.md` tracker.
- Recorded the agreed testing strategy: runtime-first verification, then OpenCode integration, then demo/manual QA.
- Recorded the agreed benchmark strategy: use MemKraft benchmark material only as reference/adaptable baseline, not as the sole evaluation method.
- Started phase-1 implementation with a minimal TypeScript runtime workspace.
- Added local SQLite memory storage, deterministic recall, bounded context assembly, and a host-agnostic runtime facade.
- Added a thin OpenCode adapter stub that delegates all memory behavior to the runtime.
- Added the first evaluation scenario seed for recalling repository guardrails.
- Expanded the evaluation layer to three project-specific scenarios: project rule recall, interrupted task resume, and architecture rationale recall.
- Added an executable `project-rule` evaluation runner that compares no-memory baseline output with the memory-assisted runtime path.
- Added runtime-generated session summary and handoff artifact support with local markdown output, positioning real OpenCode validation as the next natural step.
- Added a non-hook OpenCode input preparation path that emits runtime-backed prompt and handoff files for real `serve` + `run --attach` validation.
- Generalized non-hook OpenCode preparation across scenarios and confirmed the adapter prompt builder no longer depends on method-call context.
- Completed a second real non-hook OpenCode validation for the `interrupted-task` scenario, proving the same attach-file path supports resume-style task continuity as well as repository-rule recall.
- Added a scriptable non-hook OpenCode validation runner that starts `serve --pure`, runs `run --attach`, and writes local validation records for follow-up scenarios.
- Completed a third real non-hook OpenCode validation for `architecture-rationale`, confirming that the scriptable attach-file path also works for architecture-boundary recall.
- Added runtime recall logs to context bundles so final-report evidence can show the query, candidate memories, score reasons, included items, omitted items, and budget usage without changing the deterministic retrieval boundary.
- Added recall-log artifact output to OpenCode scenario preparation and validation records so prompt files stay focused on agent input while JSON evidence captures retrieval behavior for the final report.
- Added reviewer-kit documentation under `docs/` for evidence mapping, demo planning, final report structure, and artifact selection; also added a `validate:opencode-project-rule` script so all three scenarios have validation aliases.
- Tightened deterministic retrieval tokenization by filtering common English stopwords and de-duplicating query tokens, while giving durable project facts a small explicit base reason so important project context does not depend on noisy filler-word matches.
- Added SQLite FTS5-backed text search as a lightweight retrieval enhancement with graceful fallback to deterministic keyword/tag/kind scoring when FTS is unavailable.
- Added `decision-memory` as a first-class memory kind and moved the architecture-rationale scenario's adapter rationale into that type so architecture decisions are distinguishable from ordinary task state.
- Added runtime coverage for legacy SQLite kind-constraint migration and FTS-unavailable fallback, and tightened `decision-memory` scoring so unrelated decisions do not get recalled from kind alone.
- Regenerated fresh final-delivery scenario preparation artifacts for `project-rule`, `interrupted-task`, and `architecture-rationale`, then added a reviewer-facing final delivery checklist under `docs/`.
- Re-ran real non-hook OpenCode validation for all three scenarios, fixed Windows server cleanup in the validation runner, and confirmed validation ports close after successful runs.
- Added bounded memory consolidation for exact duplicate observations, including tag merging, reinforcement metadata, `reinforced:N` recall reasons, and runtime regression coverage.
- Added explicit memory supersession so newer memories can replace stale memory IDs, default recall excludes superseded items, recall logs record `supersededMemoryIds`, and audit queries can include `supersededBy` / `supersededAt` metadata.
- Unified deterministic and FTS token cleanup through a shared runtime tokenizer and added `getMemoryStats()` for active, superseded, reinforced, reinforcement-event, and per-kind governance metrics.
- Added portable memory export/import snapshots, dry-run memory pruning plans, and scenario-level `recall-metrics.json` / `memory-snapshot.json` artifacts for stronger final-report RAG evidence.
- Added strict snapshot import validation, `prune-plan.json`, `latest-summary.json`, and a `decision-update` scenario that demonstrates explicit supersession of a stale architecture decision.
