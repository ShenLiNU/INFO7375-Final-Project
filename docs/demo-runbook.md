# Demo Runbook

This runbook is scoped for a 10-minute final video. The goal is to show cross-session memory continuity with concrete artifacts, not to present the project as a full memory platform.

## Demo Narrative

The core claim is: a local-first runtime can persist useful coding-agent memory, retrieve it later with explainable scoring, assemble a bounded context bundle, and feed that bundle into a real OpenCode workflow without owning hooks.

## Recommended 10-Minute Flow

| Time | Segment | What to show | Evidence |
|---|---|---|---|
| 0:00-1:00 | Problem | Coding agents forget project rules, task state, and architecture rationale across sessions | `README.md`, `docs/final-report.md` |
| 1:00-2:30 | Architecture | Runtime owns storage/retrieval/context assembly; adapter formats OpenCode input | `README.md`, package structure |
| 2:30-4:30 | Local RAG loop | Memory item -> deterministic recall -> bounded bundle -> prompt document | `packages/runtime/src/*`, generated `prompt.md` |
| 4:30-6:30 | Main scenario | Run or replay `project-rule` as the clearest scenario | `validation-result.json`, `recall-log.json` |
| 6:30-7:45 | Supporting scenarios | Briefly show `interrupted-task`, `architecture-rationale`, and `decision-update` outputs | scenario JSON and validation records |
| 7:45-8:45 | Evidence trail | Show `recall-log.json`: query, candidates, score reasons, included/omitted memory IDs, budget | generated artifact |
| 8:45-9:30 | Evaluation | Explain baseline vs memory-assisted and strict OpenCode validations | `npm test`, `evaluate:project-rule` |
| 9:30-10:00 | Limits | Local-first MVP, no graph/vector/dashboard/cloud/team sync | `docs/final-report.md` |

## Commands for Recording

Prepare fresh artifacts without requiring a model response:

```bash
npm run prepare:opencode-scenario -- project-rule
npm run prepare:opencode-scenario -- interrupted-task
npm run prepare:opencode-scenario -- architecture-rationale
npm run prepare:opencode-scenario -- decision-update
```

Run deterministic tests and baseline comparison:

```bash
npm test
npm run test:runtime
npm run test:evaluation
npm run evaluate:project-rule
```

Run real OpenCode validation when provider and OpenCode are configured:

```bash
npm run validate:opencode-project-rule
npm run validate:opencode-interrupted-task
npm run validate:opencode-architecture-rationale
npm run validate:opencode-decision-update
npm run validate:opencode-scenario -- project-rule 4111
npm run validate:opencode-scenario -- interrupted-task 4112
npm run validate:opencode-scenario -- architecture-rationale 4113
npm run validate:opencode-scenario -- decision-update 4114
```

## Screenshot Checklist

- Repository tree showing `packages/runtime`, `packages/opencode-adapter`, `evaluation`, and `docs`.
- `prompt.md` showing the bounded memory context bundle.
- `recall-log.json` showing score reasons and included/omitted memory IDs.
- `validation-result.json` showing `allExpectedRecallMatched: true` and `exactOutputMatched: true`.
- Test output showing all tests passing.

## Speaker Notes

- Emphasize that the retrieval is intentionally deterministic and inspectable.
- Explain that `recall-log.json` is not injected into the prompt; it is reviewer evidence.
- Mention that OpenCode is the demo surface, not the core product.
- Avoid claiming parity with mem0, Knox, VCPToolBox, or MemKraft; this project implements a smaller verified slice.
- Do not claim vector database retrieval, fine-tuning, multimodal generation, synthetic data generation, cloud sync, or team memory; the submitted implementation is a local-first Prompt Engineering plus RAG system.
