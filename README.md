# INFO7375 Final Project

**Author:** Shen Li & Yuxiao Lin  
**Tools used:** [OpenCode](https://github.com/anomalyco/opencode) & [OhMyOpenAgent](https://github.com/code-yeongyu/oh-my-openagent)

This repository implements a local-first persistent memory runtime for coding agents, with OpenCode as the primary integration and demo surface.

The project starts from a practical problem: coding agents can solve useful tasks inside one prompt, but they often lose the project rules, interrupted work, and architecture decisions that make the next session successful. Instead of making prompts larger, this project stores durable knowledge locally, retrieves a small relevant set for the current task, and shows why each memory was recalled.

The project is intentionally runtime-first rather than plugin-first. The memory runtime is the core product, and the OpenCode adapter remains a thin layer that prepares bounded context for a real coding workflow.

## Submission Overview

This submission focuses on two course components:

- **Prompt Engineering:** structured OpenCode prompt documents, bounded durable/working memory sections, scenario-specific instructions, and handoff artifacts.
- **Retrieval-Augmented Generation (RAG):** a local SQLite knowledge base, scoped lexical retrieval, explainable deterministic ranking, context assembly, and recall/validation artifacts.

Suggested reading order:

1. read this `README.md` for setup, scope, and architecture
2. open `docs/final-report.md` or `docs/final-report.pdf` for the formal report
3. inspect `docs/evidence-matrix.md` for requirement-to-artifact mapping
4. run `npm test` for deterministic runtime and evaluation verification
5. open `index.html` for the static project showcase page

## Current Status

The first-party implementation is in place. The repository now includes:

- a TypeScript runtime under `packages/runtime/`
- a thin OpenCode adapter under `packages/opencode-adapter/`
- project-specific evaluation scenarios and validation scripts under `evaluation/`
- generated validation outputs under `.runtime-data/opencode-validation/` after scenario preparation or validation runs

The runtime supports:

- storing project, task, and session-summary memory locally in SQLite
- recalling memory with deterministic project/task/kind/tag filtering plus SQLite FTS5-backed text matching when available
- using shared token cleanup for deterministic and FTS recall so stopwords and repeated terms do not skew results
- consolidating exact duplicate memories by reinforcing the existing item instead of storing noisy duplicates
- superseding stale memories explicitly so newer decisions can replace old facts without deleting audit history
- reporting memory governance stats for active, superseded, reinforced, and per-kind memory counts
- exporting/importing portable memory snapshots for local backup, migration, and audit
- producing dry-run pruning plans so storage cleanup can be reviewed before any deletion policy exists
- generating recall metrics artifacts for scenario-level RAG evaluation
- assembling a bounded context bundle that separates durable facts from working memory
- generating session-summary and handoff markdown artifacts
- preparing OpenCode-readable prompt documents without taking over hooks
- validating the flow through real `opencode serve --pure` + `opencode run --attach` executions

## Repository Structure

```text
INFO7375 Final Project/
├── README.md
├── assignment.txt
├── docs/
├── package.json
├── tsconfig.json
├── packages/
│   ├── runtime/
│   └── opencode-adapter/
├── evaluation/
├── index.html
├── site.js
└── tmp/
```

First-party implementation lives outside `tmp/`. The `tmp/` directory contains read-only reference material and upstream code used only for study.

## Architecture

### Runtime

`packages/runtime/` owns the actual memory system:

- `storage.ts` persists memory items in local SQLite
- `retrieval.ts` performs deterministic recall with explainable keyword, tag, kind, and FTS-backed scoring reasons
- `context-assembly.ts` creates bounded bundles for injection
- `runtime.ts` exposes `remember`, `recall`, `buildContextBundle`, `getMemoryStats`, `exportMemorySnapshot`, `importMemorySnapshot`, `planMemoryPruning`, `createSessionSummary`, and `createHandoff`
- `session-summary.ts` writes local markdown artifacts for summary and handoff flows
- context bundles include `recallLog` metadata for a retrieval audit trail

### OpenCode Adapter

`packages/opencode-adapter/` does not own memory logic. It takes runtime output and formats it into OpenCode-readable input:

- `buildInjection()` returns a bounded context bundle
- `buildPromptDocument()` creates a prompt document that can be attached to a real OpenCode run

### Evaluation

`evaluation/` contains both scenario definitions and executable validation flows.

The current project-specific scenarios are:

- `project-rule`
- `interrupted-task`
- `architecture-rationale`
- `decision-update`

## RAG in the Current Implementation

This project intentionally chooses **Prompt Engineering** and **Retrieval-Augmented Generation (RAG)** as the two implemented course components.

Prompt Engineering is implemented through structured OpenCode prompt documents, bounded memory sections, scenario-specific output instructions, and session handoff templates. RAG is implemented through a local SQLite knowledge base, scoped retrieval, explainable ranking, context assembly, and generated validation outputs.

The current implementation includes a real RAG loop.

It is a lightweight, explainable RAG pipeline rather than a vector-heavy one:

1. store memory items locally in SQLite
2. retrieve memory using project/task scope plus keyword, tag, kind, and SQLite FTS5 matching
3. rank results deterministically
4. assemble a bounded context bundle
5. inject that bundle into an OpenCode-readable prompt document

The assignment lists vector storage as a common RAG implementation path, but this project deliberately uses SQLite FTS5 plus deterministic ranking because the target domain is coding-agent memory: reviewers need to inspect exactly why a memory was recalled, which candidates were omitted, and how stale decisions were superseded. This keeps the RAG layer local-first, reproducible, and inspectable without depending on a hosted vector database.

This matches the project brief's preference for deterministic or explainable retrieval before heavier semantic systems.

The current memory model includes `project-fact`, `task-memory`, `decision-memory`, and `session-summary` items. `decision-memory` is used for architecture rationale and similar what/why decisions that should survive beyond a single task update.

The runtime also performs bounded consolidation for exact duplicate memories. Repeated observations reinforce the existing memory item, merge tags, update its freshness metadata, and expose `reinforcementCount` plus `reinforced:N` recall reasons instead of adding duplicate noise to future context bundles.

For memory lifecycle governance, new memories can explicitly supersede older memory IDs. Superseded memories are excluded from normal recall by default, while `recall-log.json` records `supersededMemoryIds`; `includeSuperseded` can expose the old candidates for audit views with `supersededBy` and `supersededAt` metadata.

`getMemoryStats()` exposes local governance metrics such as active memories, superseded memories, reinforced items, reinforcement events, and per-kind counts without adding those metrics to the agent-facing prompt.

For delivery and migration, `exportMemorySnapshot()` and `importMemorySnapshot()` round-trip memory items with consolidation and supersession metadata. `planMemoryPruning()` returns a dry-run cleanup plan for superseded, low-value session-summary, or over-budget active memories without mutating SQLite state.

## Non-Hook OpenCode Integration

The real OpenCode validation path deliberately avoids lifecycle hook ownership so it can coexist with existing plugin or hook setups such as OhMyOpenAgent.

The current validation route is:

1. generate memory-backed prompt and handoff artifacts
2. start a headless OpenCode server with `opencode serve --pure`
3. attach a real run with the scripted `validate:opencode-*` flow, which internally uses `opencode run --pure --attach ... -f prompt.md --dangerously-skip-permissions`
4. capture the output and compare it against scenario-specific expectations

This keeps the adapter and runtime host-agnostic while still validating the real OpenCode surface.

## Setup

### Requirements

- Node.js `>=24.13.0`
- a working local `opencode` installation if you want to run real host validation
- an already configured model/provider for OpenCode if you want real OpenCode responses

### Install / Run

This repo currently relies on built-in Node capabilities and does not require extra npm dependencies to run the first-party implementation.

## Scripts

Available package scripts:

```bash
npm test
npm run test:runtime
npm run test:evaluation
npm run evaluate:project-rule
npm run prepare:opencode-project-rule
npm run prepare:opencode-scenario -- <scenario-id>
npm run prepare:opencode-interrupted-task
npm run prepare:opencode-architecture-rationale
npm run prepare:opencode-decision-update
npm run validate:opencode-scenario -- <scenario-id> <port>
npm run validate:opencode-project-rule
npm run validate:opencode-interrupted-task
npm run validate:opencode-architecture-rationale
npm run validate:opencode-decision-update
```

For real OpenCode host validation, prefer `npm run validate:opencode-scenario -- <scenario-id> <port>` when you want explicit port control. The scenario-specific validation aliases are convenience wrappers with preset ports.

## Validation Outputs

The repo has already produced real non-hook OpenCode validation outputs for the current project-specific scenarios:

- `project-rule`
- `interrupted-task`
- `architecture-rationale`
- `decision-update`

Validation artifacts are written under run-specific directories so repeated preparation and validation do not overwrite or lock previous outputs:

- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/prompt.md`
- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/recall-log.json`
- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/recall-metrics.json`
- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/memory-snapshot.json`
- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/prune-plan.json`
- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/artifacts/handoffs/*.md`
- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/validation-result.json`
- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/validation-error.txt` when a strict validation run fails
- `.runtime-data/opencode-validation/latest-summary.json`

The validation runner now enforces scenario-specific pass/fail semantics instead of only logging output.

`recall-log.json` is intentionally separate from `prompt.md`: the prompt remains focused on what OpenCode should read, while the recall log gives the final report an audit trail of query, candidate memories, score reasons, included/omitted memory IDs, and budget usage.

## Public Deliverables

This repository includes the public project materials:

- source code
- setup and usage instructions
- tests and evaluation scripts
- example artifacts and validation outputs
- architecture documentation
- `docs/final-report.md` and `docs/final-report.pdf`
- `docs/evidence-matrix.md`
- `docs/demo-runbook.md`
- `index.html` and `site.js`

## Important Boundaries

- Keep the project runtime-first, not plugin-first.
- Do not treat `tmp/` as first-party implementation space.
- Do not expand into graph memory, remote shared memory, or dashboard-first work unless MVP needs are already satisfied.
- Prefer explicit, explainable retrieval and bounded injection over opaque memory behavior.

## Public Delivery Files

- `README.md` - project overview, setup, scripts, and deliverable pointers
- `docs/final-report.md` and `docs/final-report.pdf` - formal report source and exported PDF
- `docs/evidence-matrix.md` - requirement-to-artifact mapping for the final submission
- `docs/demo-runbook.md` - presentation and demo plan
- `index.html` and `site.js` - static project page and scenario demo logic
