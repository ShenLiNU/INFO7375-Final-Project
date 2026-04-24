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
  - `C:\C\OpenCodeProjects\OMO-memory`
  - `C:\C\OpenCodeProjects\VCPresearch`
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

Status: first skeleton implemented; needs further hardening after phase-1 verification.

Target outcomes:

- define storage schema
- implement memory write path
- implement memory read/recall path

### Milestone 3: OpenCode demo integration

Status: adapter stub exists; full OpenCode workflow integration is not started.

Target outcomes:

- connect runtime to an OpenCode-facing workflow
- demonstrate bounded context injection
- preserve at least one cross-session memory scenario

### Milestone 4: evaluation and presentation assets

Status: first scenario seed exists; baseline vs memory-assisted capture is not started.

Target outcomes:

- produce baseline vs memory-assisted scenarios
- capture outputs for README/PDF/video/web page

## Current TODO Queue

- [x] Decide exact repository/module layout for implementation
- [x] Define first-pass runtime schema and storage plan
- [x] Choose initial retrieval method for MVP
- [x] Define the smallest OpenCode demo path
- [ ] Define 2-3 evaluation scenarios
- [ ] Decide whether to adapt any MemKraft benchmark assets as an external reference layer

## Phase 1 Design Decisions

- Layout: keep first-party code in `packages/runtime`, `packages/opencode-adapter`, and `evaluation`; leave `tmp/` as read-only reference material.
- Runtime boundary: `packages/runtime` owns models, SQLite storage, deterministic retrieval, and bounded context assembly.
- Adapter boundary: `packages/opencode-adapter` only prepares an injection bundle request and contains no storage or ranking logic.
- Storage: use repo/local SQLite database paths supplied by callers; tests create temporary SQLite files during the test flow.
- Retrieval: use project/task/kind filters plus explainable keyword/tag scoring before any graph, vector, or remote memory work.
- Context assembly: keep durable project facts separate from working memory and enforce item/character limits.
- Blockers: none known for the phase-1 skeleton; future work must confirm Node `node:sqlite` availability in every demo environment.
- Demo-path status: first seed scenario covers recalling a project rule before implementation; full OpenCode workflow injection remains next milestone work.

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
