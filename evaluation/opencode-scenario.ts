import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createOpenCodeAdapter } from '../packages/opencode-adapter/src/index.ts'
import { MemoryRuntime } from '../packages/runtime/src/index.ts'
import type { MemoryKind, RecallEvaluationMetrics, RecallLog } from '../packages/runtime/src/index.ts'

export interface ScenarioTask {
  taskId: string
  prompt: string
}

export interface ScenarioSeedMemory {
  kind: MemoryKind
  text: string
  taskId?: string
  tags?: string[]
  supersedesText?: string[]
}

export interface ScenarioDocument {
  id: string
  title: string
  purpose: string
  projectId: string
  seedMemory: ScenarioSeedMemory[]
  task: ScenarioTask
  expectedRecall: string[]
  successCriteria: string[]
}

export interface ScenarioPreparationResult {
  scenarioId: string
  outputRoot: string
  promptFilePath: string
  recallLogPath: string
  recallMetricsPath: string
  memorySnapshotPath: string
  prunePlanPath: string
  latestSummaryPath: string
  handoffFilePath?: string
  databasePath: string
  attachFiles: string[]
  runCommandExample: string
}

export interface ScenarioValidationRules {
  expectedOutputMode: 'single-line-exact' | 'multi-line-exact' | 'ordered-sentences'
}

export interface ScenarioPreparationOptions {
  outputRoot?: string
}

const scenarioInstructionMap: Record<string, string> = {
  'project-rule': 'Reply with only the recalled repository guardrail sentence.',
  'interrupted-task': 'Reply with only the two recalled resume-state sentences in order.',
  'architecture-rationale': 'Reply with exactly the two recalled architecture sentences, verbatim, each on its own line.',
  'decision-update': 'Reply with exactly this sentence and nothing else: Decision: keep memory storage in the local-first runtime while the OpenCode adapter stays thin.'
}

const nextActionMap: Record<string, string> = {
  'project-rule': 'Read the injected context and answer using the recalled repository rule only.',
  'interrupted-task': 'Read the injected context and answer using the recalled resume-state memory only.',
  'architecture-rationale': 'Read the injected context and answer using the recalled architecture rationale only.',
  'decision-update': 'Read the injected context and answer using the current non-superseded decision only.'
}

export async function prepareOpenCodeScenario(
  scenarioId: string,
  options: ScenarioPreparationOptions = {}
): Promise<ScenarioPreparationResult> {
  const scenario = readScenarioDocument(scenarioId)
  const outputRoot = options.outputRoot ?? join(process.cwd(), '.runtime-data', 'opencode-validation', scenario.id, buildRunDirectoryName())
  const databasePath = join(outputRoot, 'memory.sqlite')
  const artifactDirectory = join(outputRoot, 'artifacts')
  const promptFilePath = join(outputRoot, 'prompt.md')
  const recallLogPath = join(outputRoot, 'recall-log.json')
  const recallMetricsPath = join(outputRoot, 'recall-metrics.json')
  const memorySnapshotPath = join(outputRoot, 'memory-snapshot.json')
  const prunePlanPath = join(outputRoot, 'prune-plan.json')
  const latestSummaryPath = options.outputRoot === undefined
    ? join(process.cwd(), '.runtime-data', 'opencode-validation', 'latest-summary.json')
    : join(outputRoot, 'latest-summary.json')

  mkdirSync(outputRoot, { recursive: true })

  const runtime = new MemoryRuntime({ databasePath })

  try {
    const rememberedByText = new Map<string, string>()
    for (const memory of scenario.seedMemory) {
      const supersedes = (memory.supersedesText ?? [])
        .map(text => rememberedByText.get(text))
        .filter((id): id is string => id !== undefined)
      const remembered = runtime.remember({
        projectId: scenario.projectId,
        kind: memory.kind,
        text: memory.text,
        taskId: memory.taskId,
        tags: memory.tags,
        source: 'opencode-preparation',
        supersedes
      })
      rememberedByText.set(memory.text, remembered.id)
    }

    const handoff = await runtime.createHandoff({
      projectId: scenario.projectId,
      taskId: scenario.task.taskId,
      summary: `Runtime-prepared handoff for non-hook OpenCode validation of ${scenario.id}.`,
      queryText: scenario.task.prompt,
      nextActions: [readScenarioNextAction(scenario.id)],
      artifactDirectory,
      maxItems: 4,
      maxChars: 1200
    })
    const adapter = createOpenCodeAdapter(runtime)
    const promptDocument = adapter.buildPromptDocument(
      {
        projectId: scenario.projectId,
        taskId: scenario.task.taskId,
        prompt: `${scenario.task.prompt}\n\n${readScenarioInstruction(scenario.id)}`,
        maxItems: 4,
        maxChars: 1200
      },
      {
        handoff,
        instructions: [
          'Use the provided memory context and handoff only.',
          readScenarioInstruction(scenario.id)
        ]
      }
    )

    writeFileSync(promptFilePath, promptDocument.text, 'utf8')
    const recallLog = readRecallLog(promptDocument.bundle.recallLog)
    writeFileSync(recallLogPath, JSON.stringify(recallLog, null, 2), 'utf8')
    const recallMetrics = buildRecallMetrics(
      recallLog,
      scenario.expectedRecall,
      promptDocument.bundle.includedResults.map(result => result.item.text)
    )
    const memoryStats = runtime.getMemoryStats(scenario.projectId)
    const memorySnapshot = runtime.exportMemorySnapshot()
    const prunePlan = runtime.planMemoryPruning({ projectId: scenario.projectId, targetActiveItems: 4 })
    writeFileSync(recallMetricsPath, JSON.stringify(recallMetrics, null, 2), 'utf8')
    writeFileSync(memorySnapshotPath, JSON.stringify({
      stats: memoryStats,
      snapshot: memorySnapshot
    }, null, 2), 'utf8')
    writeFileSync(prunePlanPath, JSON.stringify(prunePlan, null, 2), 'utf8')
    writeLatestSummary(latestSummaryPath, scenario.id, {
      outputRoot,
      promptFilePath,
      recallLogPath,
      recallMetricsPath,
      memorySnapshotPath,
      prunePlanPath,
      handoffFilePath: promptDocument.handoffPath,
      metrics: recallMetrics,
      stats: memoryStats
    })

    return {
      scenarioId: scenario.id,
      outputRoot,
      promptFilePath,
      recallLogPath,
      recallMetricsPath,
      memorySnapshotPath,
      prunePlanPath,
      latestSummaryPath,
      handoffFilePath: promptDocument.handoffPath,
      databasePath,
      attachFiles: [promptFilePath],
      runCommandExample: `opencode run --pure --attach http://127.0.0.1:4096 --dir \"${process.cwd()}\" -f \"${promptFilePath}\" \"Read the attached prompt and follow its output instructions exactly.\"`
    }
  } finally {
    runtime.close()
  }
}

export function buildRecallMetrics(
  recallLog: RecallLog,
  expectedRecall: string[],
  includedTexts: string[]
): RecallEvaluationMetrics {
  const matchedExpectedCount = expectedRecall.filter(expected =>
    includedTexts.some(text => text.includes(expected))
  ).length

  return {
    expectedCount: expectedRecall.length,
    matchedExpectedCount,
    candidateCount: recallLog.candidateCount,
    includedCount: recallLog.includedMemoryIds.length,
    omittedCount: recallLog.omittedMemoryIds.length,
    supersededCount: recallLog.supersededMemoryIds.length,
    unexpectedIncludedCount: Math.max(includedTexts.length - matchedExpectedCount, 0),
    budgetUsedChars: recallLog.budget.usedChars,
    budgetMaxChars: recallLog.budget.maxChars
  }
}

function buildRunDirectoryName(): string {
  return new Date().toISOString().replace(/[.:]/g, '-')
}

function readRecallLog(value: RecallLog | undefined): RecallLog {
  if (value === undefined) {
    throw new Error('OpenCode scenario preparation expected a runtime recall log')
  }

  return value
}

export function readScenarioDocument(scenarioId: string): ScenarioDocument {
  const content = readFileSync(new URL(`./scenarios/${scenarioId}.json`, import.meta.url), 'utf8')
  const parsed: unknown = JSON.parse(content)

  if (!isScenarioDocument(parsed)) {
    throw new Error(`${scenarioId} scenario has an invalid shape`)
  }

  return parsed
}

export function readScenarioValidationRules(scenarioId: string): ScenarioValidationRules {
  if (scenarioId === 'project-rule') {
    return { expectedOutputMode: 'single-line-exact' }
  }

  if (scenarioId === 'interrupted-task') {
    return { expectedOutputMode: 'ordered-sentences' }
  }

  if (scenarioId === 'architecture-rationale') {
    return { expectedOutputMode: 'multi-line-exact' }
  }

  if (scenarioId === 'decision-update') {
    return { expectedOutputMode: 'single-line-exact' }
  }

  throw new Error(`No validation rules configured for scenario ${scenarioId}`)
}

function readScenarioInstruction(scenarioId: string): string {
  const instruction = scenarioInstructionMap[scenarioId]
  if (instruction === undefined) {
    throw new Error(`No OpenCode instruction configured for scenario ${scenarioId}`)
  }

  return instruction
}

function readScenarioNextAction(scenarioId: string): string {
  const nextAction = nextActionMap[scenarioId]
  if (nextAction === undefined) {
    throw new Error(`No next action configured for scenario ${scenarioId}`)
  }

  return nextAction
}

function isScenarioDocument(value: unknown): value is ScenarioDocument {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.purpose === 'string' &&
    typeof value.projectId === 'string' &&
    isScenarioSeedMemoryArray(value.seedMemory) &&
    isScenarioTask(value.task) &&
    isStringArray(value.expectedRecall) &&
    isStringArray(value.successCriteria)
  )
}

function isScenarioTask(value: unknown): value is ScenarioTask {
  return isRecord(value) && typeof value.taskId === 'string' && typeof value.prompt === 'string'
}

function isScenarioSeedMemoryArray(value: unknown): value is ScenarioSeedMemory[] {
  return Array.isArray(value) && value.every(item => isScenarioSeedMemory(item))
}

function isScenarioSeedMemory(value: unknown): value is ScenarioSeedMemory {
  if (!isRecord(value)) {
    return false
  }

  return (
    isMemoryKind(value.kind) &&
    typeof value.text === 'string' &&
    isOptionalString(value.taskId) &&
    isOptionalStringArray(value.tags) &&
    isOptionalStringArray(value.supersedesText)
  )
}

function writeLatestSummary(
  latestSummaryPath: string,
  scenarioId: string,
  entry: Record<string, unknown>
): void {
  mkdirSync(dirname(latestSummaryPath), { recursive: true })
  const existing = readExistingLatestSummary(latestSummaryPath)
  writeFileSync(latestSummaryPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    scenarios: {
      ...existing.scenarios,
      [scenarioId]: entry
    }
  }, null, 2), 'utf8')
}

function readExistingLatestSummary(latestSummaryPath: string): { scenarios: Record<string, unknown> } {
  try {
    const parsed: unknown = JSON.parse(readFileSync(latestSummaryPath, 'utf8'))
    if (isRecord(parsed) && isRecord(parsed.scenarios)) {
      return { scenarios: parsed.scenarios }
    }
  } catch {
    return { scenarios: {} }
  }

  return { scenarios: {} }
}

function isMemoryKind(value: unknown): value is MemoryKind {
  return value === 'project-fact' || value === 'task-memory' || value === 'decision-memory' || value === 'session-summary'
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || isStringArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
