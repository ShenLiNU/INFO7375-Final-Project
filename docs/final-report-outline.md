# Final Report Outline

This outline maps the course PDF requirements to the current implementation and evidence artifacts.

## 1. Problem Statement

Coding agents often lose project-specific continuity across sessions: repository guardrails, interrupted task state, and architecture decisions must be repeated by the user. The project addresses this with a local-first persistent memory runtime for coding agents.

## 2. System Architecture

Describe the runtime-first boundary:

- `packages/runtime/` owns storage, retrieval, context assembly, session summaries, handoff artifacts, and recall logs.
- `packages/opencode-adapter/` remains thin and formats runtime output into an OpenCode-readable prompt document.
- `evaluation/` owns scenario definitions, baseline/memory-assisted comparison, and non-hook OpenCode validation.

Suggested diagram:

```text
MemoryRuntime -> SQLite MemoryStorage -> deterministic retrieval -> ContextBundle + recallLog
       |                                                        |
       v                                                        v
session/handoff markdown artifacts                    OpenCode prompt document
```

## 3. Implementation Details

Cover these concrete implementation points:

- SQLite-backed local memory items in `packages/runtime/src/storage.ts`.
- Deterministic keyword/tag/kind scoring plus SQLite FTS5-backed text matching in `packages/runtime/src/retrieval.ts`.
- Bounded context assembly in `packages/runtime/src/context-assembly.ts`.
- Runtime facade and recall audit generation in `packages/runtime/src/runtime.ts`.
- Session summary and handoff artifacts in `packages/runtime/src/session-summary.ts`.
- Thin OpenCode adapter in `packages/opencode-adapter/src/index.ts`.

## 4. Prompt Engineering

Explain the structured prompt surfaces:

- OpenCode prompt document sections: task prompt, memory context bundle, instructions, optional handoff summary.
- Scenario-specific output instructions in `evaluation/opencode-scenario.ts`.
- Handoff/session summary markdown format that preserves next actions and recalled memory.
- Context budget controls through `maxItems` and `maxChars`.

## 5. RAG Design

Explain this as lightweight, explainable RAG:

1. store structured memory locally,
2. filter by project/task/kind,
3. score by keyword, tag, memory-kind, and FTS/BM25 reasons,
4. assemble a bounded context bundle,
5. emit `recall-log.json` for retrieval evidence,
6. attach the prompt document to a real OpenCode run.

## 6. Evaluation Methodology

Use three project-specific scenarios:

- `project-rule`: durable repository guardrail recall.
- `interrupted-task`: resume interrupted task state.
- `architecture-rationale`: preserve architecture boundary and rationale.

Report both deterministic tests and real non-hook OpenCode validation. Explain that `project-rule` also has baseline vs memory-assisted comparison through `npm run evaluate:project-rule`.

## 7. Results

Use a table like this:

| Scenario | Expected recall count | Validation artifact | Result |
|---|---:|---|---|
| `project-rule` | 1 | `.runtime-data/opencode-validation/project-rule/.../validation-result.json` | Pass |
| `interrupted-task` | 2 | `.runtime-data/opencode-validation/interrupted-task/.../validation-result.json` | Pass |
| `architecture-rationale` | 2 | `.runtime-data/opencode-validation/architecture-rationale/.../validation-result.json` | Pass |

Include one excerpt from `recall-log.json` showing score reasons.

## 8. Challenges and Solutions

- Scope control: chose runtime-first instead of plugin-first.
- Host integration risk: used non-hook OpenCode `serve --pure` + `run --attach` path.
- Retrieval noise: kept deterministic filters and bounded injection.
- Evidence quality: added recall logs separate from prompt files.

## 9. Ethics and Limitations

- Local-first storage improves auditability but still requires users to avoid storing secrets.
- Deterministic keyword retrieval is explainable but less semantically flexible than vector search.
- The MVP does not include graph memory, cloud sync, dashboard UI, team memory, or production install UX.
- OpenCode validation depends on local provider/model configuration.

## 10. Future Work

Keep future work scoped:

- Better deterministic scoring and recall log analysis.
- Lightweight lifecycle hygiene: consolidation, decay, pruning, tombstone/recovery, and health checks.
- Clearer memory inspection views.
- Further tune SQLite FTS5/BM25-style recall before any vector-heavy backend.

Do not frame graph memory, dashboards, or remote team memory as required next steps.
