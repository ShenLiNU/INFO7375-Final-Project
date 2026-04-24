# Artifact Selection

Use this guide to choose which generated files to screenshot, cite, or include in the final report and video.

## Primary Artifacts

| Artifact | Why it matters | Use in final delivery |
|---|---|---|
| `prompt.md` | Shows the exact OpenCode-readable memory injection document | Video demo and report appendix |
| `recall-log.json` | Shows retrieval query, candidate memories, score reasons, included/omitted IDs, and budget | Evaluation evidence and RAG explanation |
| `artifacts/handoffs/*.md` | Shows runtime-generated handoff/session continuity material | Prompt Engineering section |
| `validation-result.json` | Shows real OpenCode output and pass/fail checks | Results table |
| `validation-error.txt` | Preserves failed strict validation attempts when present | Optional challenges section, not primary success evidence |

## Recommended Current Success Runs

The latest known passing validation records before recall-log artifact wiring are:

- `.runtime-data/opencode-validation/project-rule/2026-04-24T04-02-45-475Z/validation-result.json`
- `.runtime-data/opencode-validation/interrupted-task/2026-04-24T04-02-45-519Z/validation-result.json`
- `.runtime-data/opencode-validation/architecture-rationale/2026-04-24T04-02-45-689Z/validation-result.json`

Fresh scenario preparation or validation runs now also include:

- `.runtime-data/opencode-validation/<scenario-id>/<run-id>/recall-log.json`

If the final report needs recall-log screenshots, generate fresh artifacts with:

```bash
npm run prepare:opencode-scenario -- project-rule
npm run prepare:opencode-scenario -- interrupted-task
npm run prepare:opencode-scenario -- architecture-rationale
```

For final validation screenshots, prefer fresh `validate:opencode-scenario` runs so `validation-result.json` and `recall-log.json` live in the same run directory.

## Selection Rules

- Use one primary scenario in depth: `project-rule` is the simplest and clearest.
- Use `interrupted-task` and `architecture-rationale` as supporting proof that the flow generalizes beyond one sentence.
- Prefer passing `validation-result.json` files with `allExpectedRecallMatched: true` and `exactOutputMatched: true`.
- Do not cite `tmp/` reference repositories as implementation evidence.
- Do not use old failed validation attempts as the main result, but keep them available for a short challenges/iteration note if needed.

## Report Excerpt Template

```text
Scenario: project-rule
Prompt artifact: .runtime-data/opencode-validation/project-rule/<run-id>/prompt.md
Recall audit: .runtime-data/opencode-validation/project-rule/<run-id>/recall-log.json
Validation record: .runtime-data/opencode-validation/project-rule/<run-id>/validation-result.json
Observed output: Do not modify tmp reference repositories during first-party implementation.
Result: Pass
```
