# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-23
**Commit:** 846a2f9
**Branch:** master

## OVERVIEW
Course project repo for a local-first persistent memory runtime for coding agents. The current first-party surface is documentation-first; implementation is planned, but most executable code in this checkout lives under `tmp/` as upstream/reference material.

## STRUCTURE
```text
INFO7375 Final Project/
├── assignment.txt               # Course requirements and deliverables
├── proposal.md                  # Outward-facing project proposal
├── implementation-brief.md      # Internal execution boundary and MVP guide
├── progress.md                  # Live status / milestone tracker
├── AGENTS.md                    # Root rules for this repo
└── tmp/                         # Embedded upstream/reference repos; not first-party product code
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Understand course constraints | `assignment.txt` | External grading and deliverable requirements |
| Understand project thesis | `proposal.md` | Runtime-first framing, OpenCode as demo surface |
| Understand MVP boundary | `implementation-brief.md` | Source of truth for build scope |
| Check current status | `progress.md` | Milestones, TODOs, scope guardrails |
| Study OpenCode host patterns | `tmp/opencode-upstream/` | Reference only; obey local AGENTS there |
| Study memory-system ideas | `tmp/memkraft/` | Reference only; not first-party code |

## CONVENTIONS
- Treat this repo as **runtime-first**, not plugin-first. The core product is the memory runtime; any OpenCode adapter must remain thin.
- The current repo is **planning-first**. Do not invent nonexistent source layout; create first-party implementation structure deliberately when implementation starts.
- Use `implementation-brief.md` as the stable internal scope document. Use `progress.md` as the mutable execution log.
- Keep MVP and stretch goals separate. Do not silently promote stretch work into the critical path.
- Prefer explainable, bounded retrieval and context assembly over clever but opaque memory behavior.

## ENVIRONMENT / DEPENDENCY RULES
- If the project needs environment changes, use **project-level isolation only**.
- Python: use a project-local virtual environment such as `.venv/` inside this repo; do not install project dependencies into the system/global Python.
- Node/Bun: install dependencies in the project workspace only; do not rely on globally installed packages except existing host tooling the user already has.
- Any future runtime artifacts, caches, or local databases must stay inside the project directory or a project-local config/data directory.
- Do not modify global shell config, global package-manager defaults, or machine-wide tool settings for this project.

## ANTI-PATTERNS (THIS PROJECT)
- Do not turn this into a universal memory OS.
- Do not make the OpenCode adapter/plugin the system core.
- Do not deep-fuse every inspiration source unless actually validated and adopted.
- Do not make headless self-bootstrapping a hard dependency for project success.
- Do not start with graph memory, remote team memory, or dashboard-first work.
- Do not let host integration details drive runtime design.
- Do not over-inject context or allow retrieval noise to dominate the workflow.
- Do not pollute the system global environment with project dependencies.
- Do not treat `tmp/` reference repos as first-party implementation targets unless explicitly instructed.

## UNIQUE STYLES
- This repo currently has more architectural intent than code. Documentation is authoritative until first-party implementation directories exist.
- Reference repos under `tmp/` are here to study boundaries, patterns, and tradeoffs, not to be modified as part of normal project work.
- The project’s quality bar is shaped by a hybrid MVP: local-first memory runtime, OpenCode demo path, Prompt Engineering + RAG evidence, and a small but real evaluation loop.

## COMMANDS
```bash
# Current repo state: planning docs only, no first-party build commands yet.
# When implementation starts, add project-local commands here and keep them scoped to this repo.
```

## NOTES
- There was no first-party `AGENTS.md` before this file; embedded AGENTS under `tmp/` belong to the reference repos, not this project.
- `tmp/` is large and deep. Keep first-party work outside it unless the task is explicitly about upstream/reference analysis.
- When actual code lands, consider adding child `AGENTS.md` files only at real ownership boundaries such as `packages/`, `src/`, `runtime/`, `opencode-adapter/`, or `tests/`.
