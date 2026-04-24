# Persistent Memory Runtime for Coding Agents

INFO7375 Generative AI Final Project

## 1. Problem Statement

Coding agents can complete useful single-session tasks, but they often lose project continuity across sessions. Users must repeatedly restate repository guardrails, interrupted task state, architecture decisions, and why earlier tradeoffs were made. This project addresses that problem with a local-first persistent memory runtime for coding agents.

The design avoids treating memory as a raw transcript. It stores structured memory items, retrieves a small relevant set for the current task, and records the evidence behind each recall decision. This gives the agent continuity without expanding the prompt with unstructured notes.

The system is designed for realistic developer workflows. It stores durable project facts, task memory, architecture decisions, and session summaries locally, then recalls a bounded context bundle for later agent runs. The core product is the memory runtime; OpenCode is used as a thin integration and demonstration surface.

This project focuses on the memory layer itself: SQLite-backed persistence, explainable retrieval, context budgeting, memory governance, generated evidence artifacts, and a thin host adapter that can feed a real coding-agent run.

## 2. Generative AI Components

The project implements two required generative AI components: Prompt Engineering and Retrieval-Augmented Generation (RAG). It does not claim fine-tuning, multimodal generation, or synthetic-data generation as implemented components.

### Prompt Engineering

The runtime creates structured prompt surfaces instead of appending raw notes to the user prompt. The OpenCode adapter prepares prompt documents with clear sections for task instructions, durable memory, working memory, and optional handoff summaries. Scenario-specific instructions in `evaluation/opencode-scenario.ts` test whether the agent can use recalled memory precisely.

The prompt strategy also includes context budget controls through `maxItems` and `maxChars`, ensuring memory is bounded and relevant rather than noisy. Session summaries and handoff artifacts preserve next actions and current state so a future agent run can resume work without requiring the user to repeat context.

### Retrieval-Augmented Generation

The system implements a lightweight and explainable RAG loop. The knowledge base is local SQLite memory state. Retrieval filters by project, task, memory kind, tags, and query text. Ranking uses deterministic keyword, tag, kind, and SQLite FTS5/BM25-backed text matching when available. The retrieved memories are assembled into a bounded context bundle and attached to a real OpenCode run.

The assignment mentions vector storage as a typical RAG implementation path. This project intentionally uses SQLite FTS5 and deterministic ranking instead of a hosted vector database because the domain is persistent coding-agent memory. In this domain, the important requirement is not only semantic similarity; it is also auditability, local reproducibility, scope control, and the ability to explain why a project rule, task state, or architecture decision was recalled. Each scenario can produce `recall-log.json`, `recall-metrics.json`, `memory-snapshot.json`, and `prune-plan.json` so retrieval decisions can be inspected in the final report.

## 3. System Architecture

The architecture is runtime-first and host-agnostic.

```text
User / evaluation scenario
        |
        v
MemoryRuntime facade
        |
        +--> SQLite MemoryStorage
        |       - memory_items
        |       - memory_items_fts
        |       - memory_consolidation
        |       - memory_supersession
        |
        +--> Retrieval and ranking
        |       - deterministic keyword scoring
        |       - tag and kind scoring
        |       - optional FTS5/BM25 reasons
        |       - deterministic fallback
        |
        +--> Context bundle + recallLog
        |       - durable memory
        |       - working memory
        |       - included and omitted candidates
        |       - score reasons and budget usage
        |
        +--> Session summary / handoff artifacts
        |
        v
Thin OpenCode adapter
        |
        v
OpenCode prompt document and real validation run
```

The runtime lives under `packages/runtime/`. It owns storage, retrieval, context assembly, session summaries, handoff artifacts, governance statistics, snapshots, and pruning plans. The adapter under `packages/opencode-adapter/` only formats runtime output into an OpenCode-readable prompt document. The evaluation system under `evaluation/` owns scenario definitions, deterministic tests, baseline comparison, and real non-hook OpenCode validation.

## 4. Implementation Details

The implementation is TypeScript-first and local-first.

- `packages/runtime/src/storage.ts` persists memory items in SQLite and manages FTS5 indexing, duplicate consolidation, supersession metadata, export/import snapshots, strict snapshot validation, statistics, and dry-run pruning.
- `packages/runtime/src/retrieval.ts` ranks candidate memories with explainable score reasons such as keyword matches, tag matches, kind boosts, reinforcement counts, and optional `fts:bm25=...` reasons.
- `packages/runtime/src/text.ts` centralizes token cleanup so deterministic recall and FTS queries share stopword filtering and duplicate-token removal.
- `packages/runtime/src/runtime.ts` exposes the main API: `remember`, `recall`, `buildContextBundle`, `getMemoryStats`, `exportMemorySnapshot`, `importMemorySnapshot`, `planMemoryPruning`, `createSessionSummary`, and `createHandoff`.
- `packages/runtime/src/session-summary.ts` writes local markdown artifacts for session continuity and handoff flows.
- `packages/opencode-adapter/src/index.ts` keeps OpenCode integration thin and non-hook-based.

The memory model includes `project-fact`, `task-memory`, `decision-memory`, and `session-summary`. `decision-memory` is important because architecture decisions often need to outlive a single task and should be recalled as rationale, not just as generic notes.

## 5. Memory Governance

The runtime includes several governance features that keep recall useful over time.

Duplicate consolidation reinforces exact duplicate memories rather than storing repeated copies. The existing item keeps a `reinforcementCount`, merged tags, and updated freshness metadata. Supersession lets a new memory explicitly replace stale memory while preserving audit history. Normal recall excludes superseded memories by default, but audit logs still record `supersededMemoryIds`.

The runtime can report local governance metrics such as active memories, superseded memories, reinforced items, reinforcement events, and per-kind counts. It can export and import portable snapshots while preserving governance metadata. It can also produce a dry-run pruning plan for superseded items, low-value session summaries, or active memories beyond a configured budget.

## 6. Evaluation Methodology

Evaluation uses deterministic tests and scenario-level OpenCode validation.

The four project-specific scenarios are:

| Scenario | Purpose | Expected result |
|---|---|---|
| `project-rule` | Recall durable repository guardrails | Output includes the rule that `tmp/` is reference-only |
| `interrupted-task` | Resume task state | Output includes remembered next steps and session summary |
| `architecture-rationale` | Preserve architecture rationale | Output recalls runtime-first boundary and thin adapter rationale |
| `decision-update` | Supersede stale decisions | Output includes only the current decision while audit logs record the superseded memory |

The main verification command is `npm test`, which currently passes 26 tests across runtime and evaluation coverage. Real OpenCode validation is available through scenario-specific commands such as `npm run validate:opencode-decision-update` when a local OpenCode provider is configured.

## 7. Results and Validation Metrics

The latest local verification passed 26 tests. These tests cover persistence, context budgets, recall logs, decision memory, token cleanup, FTS fallback, governance statistics, snapshot export/import, invalid snapshot rejection, dry-run pruning, duplicate consolidation, supersession, legacy database migration, adapter behavior, session summaries, and handoff artifacts.

Scenario preparation emits structured metrics in `recall-metrics.json`, including expected memory count, matched expected count, candidate count, included count, omitted count, superseded count, unexpected included count, and character budget usage. This provides results for the RAG loop without depending only on screenshots.

The evaluation artifacts also make the memory behavior reviewable after the model run. `recall-log.json` records candidate memories, score reasons, included and omitted IDs, superseded IDs, and context budget usage. `memory-snapshot.json` preserves the local knowledge base used for the run, while `prune-plan.json` shows lifecycle governance decisions without mutating the database. Together, these artifacts connect the visible agent output back to concrete retrieval evidence.

The `decision-update` real OpenCode validation passed with exact output:

```text
Decision: keep memory storage in the local-first runtime while the OpenCode adapter stays thin.
```

## 8. Challenges and Solutions

Scope control was the first major challenge. Memory systems can easily expand into graph memory, dashboards, cloud sync, vector databases, and plugin ownership. The solution was to keep the project runtime-first and local-first, with OpenCode as a demo surface rather than the system core.

Retrieval noise was another challenge. Injecting too much memory can harm agent performance. The solution was bounded context assembly with explicit `maxItems` and `maxChars`, plus recall logs that show which candidates were included or omitted.

Result quality was also important. A prompt alone does not show that retrieval worked. The solution was to generate separate outputs: recall logs, recall metrics, memory snapshots, prune plans, handoff files, and validation results.

Compatibility was a practical challenge because older SQLite databases may have stricter memory-kind constraints. The solution was a migration path and tests that confirm legacy databases can accept `decision-memory`.

## 9. Ethical Considerations and Limitations

The local-first design improves privacy and auditability because memory is stored in the project workspace rather than a remote service by default. However, users should still avoid storing secrets, credentials, or sensitive personal data in memory. The system makes memory inspectable, but it does not automatically solve all data governance problems.

The retrieval approach is explainable but less semantically flexible than embedding-based vector search. SQLite FTS5 is an optional enhancement with deterministic fallback, not a replacement for every semantic retrieval use case.

The MVP is single-user and local. It does not include team memory, cloud sync, graph reasoning, a dashboard-first product, production packaging, or automatic secret redaction. OpenCode validation also depends on local OpenCode and model provider configuration.

## 10. Future Improvements

Future work should remain aligned with the runtime-first scope. Useful next steps include better deterministic scoring analysis, richer recall-log inspection, safer memory editing tools, optional lightweight semantic retrieval, stronger secret-detection warnings, and clearer health checks for memory lifecycle quality.

Remote team memory, dashboards, graph reasoning, and vector-heavy backends could be explored later, but they are not required for the current project goal. The core value is already demonstrated by a working local memory runtime, prompt assembly, RAG retrieval, governance controls, and real OpenCode validation results.

## 11. Repository and Deliverables

The repository includes complete first-party source code, setup instructions, test scripts, scenario definitions, generated example-output paths, documentation, a static project web page, and this final report source.

Key reviewer entry points:

- `README.md`
- `index.html`
- `packages/runtime/`
- `packages/opencode-adapter/`
- `evaluation/`
- `docs/evidence-matrix.md`
