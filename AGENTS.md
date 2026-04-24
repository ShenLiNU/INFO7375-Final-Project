# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-24
**Branch:** master

## OVERVIEW
This repository now contains a working first-party implementation of a local-first persistent memory runtime for coding agents, plus a thin OpenCode adapter and evaluation flows. The docs in the repo root still describe the project boundary, but the code and tests are real, not just planned.

## STRUCTURE
```text
INFO7375 Final Project/
├── README.md                  # Primary project overview and setup notes
├── assignment.txt             # Course requirements and deliverables
├── proposal.md                # Outward-facing project proposal
├── implementation-brief.md    # Internal execution boundary and MVP guide
├── progress.md                # Live status / milestone tracker
├── docs/                      # Reviewer-facing delivery notes and final-report guidance
├── packages/
│   ├── runtime/               # Memory runtime, storage, retrieval, context assembly
│   └── opencode-adapter/      # Thin OpenCode-facing bridge
├── evaluation/                # Scenario definitions and validation flows
└── tmp/                       # Embedded upstream/reference repos, read-only reference material
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Understand course constraints | `assignment.txt` | External grading and deliverable requirements |
| Understand project framing | `README.md` and `proposal.md` | Runtime-first thesis and demo surface |
| Understand MVP boundary | `implementation-brief.md` | Source of truth for scope and non-goals |
| Check current status | `progress.md` | Milestones, TODOs, risks, and recent decisions |
| Inspect runtime code | `packages/runtime/` | Storage, retrieval, and context assembly |
| Inspect adapter boundary | `packages/opencode-adapter/` | Thin bridge into OpenCode inputs |
| Review evaluation coverage | `evaluation/` | Scenario setup and validation scripts |
| Study reference material | `tmp/opencode-upstream/`, `tmp/memkraft/` | Reference only, not first-party implementation targets |

## CONVENTIONS
- Keep the product **runtime-first**, with OpenCode as the demo and integration surface.
- Keep the adapter thin. Memory logic belongs in the runtime, not in host glue.
- Use `progress.md` for live execution notes and `implementation-brief.md` for scope guardrails.
- Keep MVP and stretch goals separate. Do not quietly promote stretch work into the critical path.
- Prefer explainable, bounded retrieval and context assembly over opaque memory behavior.
- Treat `tmp/` as read-only reference material unless a task explicitly says otherwise.

## ENVIRONMENT / DEPENDENCY RULES
- Use project-local isolation only.
- Python work should stay in a project-local `.venv/`.
- Node and Bun dependencies should stay in the project workspace.
- Any runtime artifacts, caches, SQLite files, or logs should stay inside the repo or a repo-local data directory.
- Do not modify global shell config, global package manager defaults, or machine-wide tool settings for this project.

## CURRENT WORKFLOW
- Runtime verification starts with unit and scenario tests in `packages/runtime/` and `evaluation/`.
- OpenCode validation uses the prepared non-hook flow described in `README.md` and the delivery docs under `docs/`.
- Final delivery artifacts should stay in the tracked submission set, while local planning notes and generated workspace clutter stay ignored.

## NOTES
- `tmp/` is large and deep. Keep first-party work outside it unless the task is explicitly about upstream or reference analysis.
- Add new child `AGENTS.md` files only at real ownership boundaries such as `packages/`, `runtime/`, `opencode-adapter/`, `evaluation/`, or `tests/` if the repo grows further.
