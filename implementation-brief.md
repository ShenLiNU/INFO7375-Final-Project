# Implementation Brief

## 1. Purpose

This document is the internal execution brief for the final project.

`proposal.md` is the outward-facing narrative for the course. This file is the inward-facing development guide that fixes scope, defines the MVP, and gives a concrete standard for what counts as "done" during implementation.

Project thesis:

> Build a local-first persistent memory runtime for coding agents, using OpenCode as the primary integration and demo surface.

## 2. Product Boundary

### Core product

The core product is **not** "an OpenCode plugin" by itself.

The core product is:

- a local-first memory runtime
- a retrieval and context-assembly layer
- a thin OpenCode integration surface for capture, inspection, and injection

### Why this boundary matters

- It keeps the actual system logic independent from host-specific API details.
- It reduces the risk of overfitting the project to undocumented host behavior.
- It preserves a cleaner path for later OmO integration or other host adapters.

## 3. MVP Definition

### MVP statement

The MVP is successful if a coding agent can:

1. store a small set of durable project/task memory locally,
2. retrieve relevant memory in a later session,
3. assemble that memory into a bounded context bundle,
4. inject that bundle into an OpenCode-driven workflow,
5. demonstrate visible improvement in cross-session continuity.

### MVP capabilities

The MVP must include:

- local-first storage for runtime memory
- at least one stable project facts mechanism
- task/session memory capture
- retrieval over stored memory
- ranking/filtering for recall candidates
- bounded context assembly
- OpenCode-facing integration path for demonstration
- a simple evaluation path comparing memory vs no-memory behavior

### MVP does not require

The MVP does not require:

- universal multi-host support
- graph memory
- team/shared cloud memory
- complex autonomous self-bootstrapping
- perfect semantic search
- polished dashboard UI
- production-grade install UX

## 4. GenAI Components To Demonstrate

The course-facing implementation must visibly demonstrate two GenAI components.

### Prompt Engineering

This project must show structured prompt strategy in at least these places:

- memory extraction prompts or extraction templates
- handoff/session summary formatting
- context injection template design
- token-budget-aware memory assembly rules

### RAG

This project must show a real retrieval path:

- stored memory items or memory artifacts
- recall query or task-conditioned retrieval
- filtering/ranking before injection
- final context bundle consumed by the agent workflow

## 5. System Modules

Implementation should be organized around these modules.

### A. `runtime`

Responsibilities:

- own storage lifecycle
- define memory item schemas
- ingest structured events or extracted memory items
- expose recall and context assembly APIs
- generate handoff/session summary artifacts if needed

### B. `storage`

Preferred initial approach:

- SQLite for dynamic structured runtime state
- visible markdown or text artifacts for stable, human-readable project memory

Candidate stored concepts:

- project facts
- task memory
- session summaries
- handoff records
- recall logs

### C. `retrieval`

Responsibilities:

- recall by task/session/project scope
- support simple filtering and ranking
- prefer deterministic or explainable retrieval before heavy semantic systems

Initial bias:

- structured filters
- keyword / FTS recall
- optional vector or semantic enhancement later

### D. `context-assembly`

Responsibilities:

- take recall candidates and package them into a bounded context bundle
- separate durable facts from volatile task/session state
- avoid over-injection and prompt pollution

### E. `opencode-adapter`

Responsibilities:

- connect the runtime to OpenCode for demo purposes
- capture available workflow signals
- expose memory inspection or utility hooks/tools if needed
- bridge runtime output into an OpenCode-readable input path

This layer should remain thin.

### F. `evaluation`

Responsibilities:

- define test scenarios
- compare memory-assisted vs baseline workflows
- capture observable outcomes for the final report/video

## 6. Scope Priorities

### Priority 1: must land

- runtime boundary
- local storage
- project/task/session memory model
- retrieval path
- context assembly path
- OpenCode demo path
- evaluation scenario

### Priority 2: good if time allows

- better ranking logic beyond the current keyword/tag/kind/FTS scoring blend
- richer handoff artifacts
- clearer memory inspection tooling
- more explicit multi-agent/shared-vs-local memory handling

### Priority 3: stretch goals only

- headless self-bootstrapping demo
- dashboard or graph visualization
- vector backend swap or mem0-backed experimental branch
- OmO orchestration sync
- advanced checkpoint semantics

### Post-MVP optimization directions

Once the Priority 1 runtime path is validated, optimization work should improve the existing local-first loop rather than change the product boundary. The most useful reference systems point toward a few scoped refinements:

- explainable retrieval tuning: keep deterministic scoring, but make keyword, tag, kind, recency, and task-scope contributions easier to inspect
- recall logging: record the query, candidate memories, score reasons, included bundle items, and omitted items for report/debug evidence
- lifecycle rules: add lightweight policies for consolidation, decay, pruning, tombstone/recovery, and health checks before considering graph or vector-heavy retrieval
- artifact clarity: improve generated session summaries, handoff files, and prompt documents so each recalled memory has clear provenance
- inspection controls: expose read-only memory/status/context views before adding write-heavy plugin or dashboard surfaces
- multi-agent hygiene: keep shared task state separate from agent-local trace state, and require explicit promotion before subagent output becomes durable shared memory

These are optimization candidates, not new MVP requirements. They should be adopted only when they strengthen the final demo, evaluation, or report without expanding into a general memory OS.

## 7. What We Intentionally Cut

To stay inside semester-project scope, we explicitly cut or delay:

- a universal agent memory platform claim
- deep hard integration with every inspiration source
- graph reasoning as a foundation
- remote sync/team collaboration
- complex SaaS-first dependency chains
- any feature whose demo value is high but whose failure would block the whole project

## 8. Sources and How To Use Them

### Use as primary implementation reference

- `proposal.md`
- `local prototype repository`
- `tmp/opencode-upstream`

### Use as targeted design inspiration

- `tmp/memkraft`
- `local VCP research repository`

### Use as conceptual framing / related work

- mem0
- MemOS
- Knox

Rule of thumb:

- borrow architecture and interaction ideas freely
- do not promise deep implementation fusion unless we actually validate and use it

### Reference claim policy

Only claim that a reference influenced this project when the specific inspected behavior, file, architecture pattern, or evaluation idea is recorded in `progress.md` or the final report. Otherwise describe the source as background inspiration.

Current scoped reference lessons:

- `local prototype repository`: useful for runtime-vs-adapter separation, bounded memory context preview, explicit promotion, task-scoped checkpoints, episodic decay, deduplication, and SQLite FTS5 as a lightweight retrieval improvement
- `tmp/memkraft`: useful for tiered memory, reversible tombstone/recovery behavior, lifecycle operations such as compact/digest/health, decision records with what/why/how rationale, evidence-first recall, and source-attributed artifacts
- `local VCP research repository`: useful for read-only context bridge boundaries, context-aware strategy selection, caching, and defensive context folding; its vector-heavy TagMemo/EPA stack is reference material, not an MVP dependency
- Knox docs: useful for the framing of layered memory, context-aware loading, consolidation, selective forgetting, and multi-strategy retrieval; its unlimited-context, graph, and platform claims remain conceptual inspiration rather than implementation scope

## 9. Acceptance Criteria

The implementation phase is not complete until all of the following are true.

### Functional

- A new or resumed coding task can access previously stored project/task memory.
- Recalled memory is visibly filtered or assembled before injection.
- The OpenCode demo path shows cross-session continuity.

### Technical

- Project structure cleanly separates runtime from integration.
- Storage is local-first and inspectable.
- Retrieval path is deterministic enough to explain in the final report.

### Course deliverable support

- There is enough material for the final PDF architecture section.
- There is at least one stable live demo path for the video.
- There is enough visual/documented material for the web page.

## 10. Evaluation Plan

At minimum, evaluate on a few concrete scenarios such as:

- remembering a project rule across sessions
- resuming a partially completed coding task
- recovering key state after context loss or summary/compaction
- preserving a past architecture decision or preference

For each scenario, compare:

- no-memory baseline
- memory-assisted workflow

Measure or describe:

- whether the agent needed the user to repeat context
- whether the recalled memory was relevant
- whether the task resumed faster or more accurately
- whether injected context stayed bounded and readable

## 11. Testing Strategy

Testing must follow a **runtime-first, integration-second** strategy.

### Layer 1: runtime tests

This is the primary correctness layer.

It should test the core product without depending on OpenCode:

- memory write path
- storage and reload behavior
- retrieval and filtering
- ranking or recall ordering
- context assembly
- handoff or session summary generation

Why this comes first:

- it proves the actual project contribution
- it is faster and more deterministic
- it reduces the risk that host integration instability blocks verification

### Layer 2: OpenCode integration tests

This is the host-surface validation layer.

It should prove that the runtime can actually be exercised through OpenCode-driven workflows.

Target forms:

- adapter/plugin smoke test
- scripted headless or server-driven workflow
- end-to-end cross-session continuity demonstration

Questions this layer must answer:

- can OpenCode call into the runtime correctly?
- can memory be written during one workflow and recalled in a later one?
- does context injection visibly help the resumed workflow?

### Layer 3: demo/manual QA

This is the presentation and course-deliverable layer.

It should use a real scenario to demonstrate:

- memory capture
- memory recall
- cross-session continuity
- user-visible value in a coding workflow

This layer is required for the final video and should not be replaced by unit tests alone.

## 12. Benchmark and Scoring Policy

### Role of MemKraft benchmarks

`tmp/memkraft/benchmarks/longmemeval/` is a useful public reference point, but it is **not** the whole evaluation strategy for this project.

We may:

- study the benchmark design
- run or adapt parts of the benchmark
- use its methodology as an external reference or baseline

We should not:

- treat MemKraft's published benchmark numbers as our project's score
- rely only on LongMemEval-style results to justify project success
- present a borrowed benchmark as if it directly measures coding-agent workflow continuity

### Project scoring model

The preferred evaluation stack is:

1. **external reference layer**
   - optional public benchmark or adapted benchmark inspired by MemKraft / LongMemEval
2. **project-specific core layer**
   - coding-agent scenarios designed for this project
3. **demo layer**
   - observable before/after or baseline-vs-memory-assisted workflows

### What must be project-specific

The main project score should come from scenarios such as:

- remembering a project rule across sessions
- resuming an interrupted coding task
- recovering a prior architecture decision or rationale
- restoring enough context after summary/compaction to continue useful work

These scenarios are closer to the actual thesis than a generic memory leaderboard.

## 13. Benchmark Usage Rules

- Use public benchmark material as a **reference**, not as the sole evaluation source.
- If adapting a benchmark, document exactly what was reused and what was changed.
- Keep baseline and memory-assisted comparisons explicit.
- Prefer a small, believable, reproducible scoring setup over a large borrowed benchmark that does not fit the thesis.
- The final report should separate:
  - external/comparative benchmark results
  - project-specific evaluation results
  - qualitative demo observations

## 14. Initial Build Order

Recommended implementation order:

1. define repository structure
2. define runtime schema and storage layout
3. implement minimal memory write path
4. implement minimal recall path
5. implement context assembly
6. connect OpenCode demo path
7. create evaluation scenarios
8. decide what stretch features are still worth adding

## 15. Working Rules During Development

- Keep runtime logic host-agnostic where possible.
- Prefer explainable retrieval before clever retrieval.
- Keep visible memory artifacts small and readable.
- Do not expand scope just because a reference repo has a bigger system.
- Any new feature must justify itself in terms of demo value and assignment value.
- Do not let OpenCode integration tests substitute for runtime correctness tests.
- Do not let an external benchmark substitute for project-specific evaluation.

## 16. Deliverable Mapping

### For GitHub repo

- code
- setup instructions
- tests/evaluation scripts
- example outputs / artifacts
- docs

### For PDF

- architecture
- implementation details
- evaluation
- challenges and future work
- ethics and limitations

### For video

- show cross-session memory continuity
- show retrieval and context injection
- show why this is useful in coding workflow

### For web page

- state the problem
- show the architecture
- explain Prompt Engineering + RAG
- embed demo/result material

## 17. Current Decision

The current best direction is:

**Build the runtime first, keep OpenCode as the main demo/integration surface, and treat advanced automation as optional showcase material.**

That is the baseline this project should follow unless new evidence clearly justifies a change.
