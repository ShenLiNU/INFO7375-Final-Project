import { MemoryRuntime } from '../packages/runtime/src/index.ts'
import type { ContextBundle, MemoryInput, MemoryKind, RecallEvaluationMetrics, RecallLog } from '../packages/runtime/src/index.ts'

interface ScenarioTask {
  taskId: string
  prompt: string
}

interface ScenarioSeedMemory {
  kind: MemoryKind
  text: string
  taskId?: string
  tags?: string[]
  source?: string
}

interface ProjectRuleScenario {
  id: string
  title: string
  purpose: string
  projectId: string
  seedMemory: ScenarioSeedMemory[]
  task: ScenarioTask
  expectedRecall: string[]
  successCriteria: string[]
}

interface EvaluationSide {
  recalledTexts: string[]
  bundleText: string
  matchedExpectedRecall: string[]
  metrics: RecallEvaluationMetrics
  recallLog?: RecallLog
}

export interface ProjectRuleEvaluationReport {
  scenarioId: string
  title: string
  purpose: string
  baseline: EvaluationSide
  memoryAssisted: EvaluationSide
  checks: {
    baselineMissedAllExpectedRecall: boolean
    memoryAssistedMatchedExpectedRecall: boolean
    memoryAssistedBundleIsBounded: boolean
  }
}

interface FsPromisesModule {
  mkdtemp(prefix: string): Promise<string>
  readFile(path: URL, encoding: string): Promise<string>
  rm(path: string, options: { recursive: boolean; force: boolean }): Promise<void>
}

interface OsModule {
  tmpdir(): string
}

interface PathModule {
  join(...paths: string[]): string
}

const fsPromisesModuleName = 'node:fs/promises'
const osModuleName = 'node:os'
const pathModuleName = 'node:path'

const fsPromisesModule: unknown = await import(fsPromisesModuleName)
const osModule: unknown = await import(osModuleName)
const pathModule: unknown = await import(pathModuleName)

const { mkdtemp, readFile, rm } = readFsPromisesModule(fsPromisesModule)
const { tmpdir } = readOsModule(osModule)
const { join } = readPathModule(pathModule)

export async function runProjectRuleEvaluation(): Promise<ProjectRuleEvaluationReport> {
  const scenario = await loadProjectRuleScenario()
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-project-rule-eval-'))
  const baselineDatabasePath = join(tempDirectory, 'baseline.sqlite')
  const memoryDatabasePath = join(tempDirectory, 'memory.sqlite')

  let baselineRuntime: MemoryRuntime | undefined
  let memoryRuntime: MemoryRuntime | undefined

  try {
    baselineRuntime = new MemoryRuntime({ databasePath: baselineDatabasePath })
    const baselineBundle = baselineRuntime.buildContextBundle(
      {
        projectId: scenario.projectId,
        taskId: scenario.task.taskId,
        text: scenario.task.prompt,
        limit: 4
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    memoryRuntime = new MemoryRuntime({ databasePath: memoryDatabasePath })
    for (const seedMemory of scenario.seedMemory) {
      const input: MemoryInput = {
        projectId: scenario.projectId,
        kind: seedMemory.kind,
        text: seedMemory.text,
        taskId: seedMemory.taskId,
        tags: seedMemory.tags,
        source: seedMemory.source ?? 'evaluation-scenario'
      }

      memoryRuntime.remember(input)
    }

    const memoryBundle = memoryRuntime.buildContextBundle(
      {
        projectId: scenario.projectId,
        taskId: scenario.task.taskId,
        text: scenario.task.prompt,
        limit: 4
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    const baseline = buildEvaluationSide(baselineBundle, scenario.expectedRecall)
    const memoryAssisted = buildEvaluationSide(memoryBundle, scenario.expectedRecall)

    return {
      scenarioId: scenario.id,
      title: scenario.title,
      purpose: scenario.purpose,
      baseline,
      memoryAssisted,
      checks: {
        baselineMissedAllExpectedRecall: baseline.matchedExpectedRecall.length === 0,
        memoryAssistedMatchedExpectedRecall:
          memoryAssisted.matchedExpectedRecall.length === scenario.expectedRecall.length,
        memoryAssistedBundleIsBounded:
          memoryBundle.budget.usedChars <= memoryBundle.budget.maxChars
      }
    }
  } finally {
    baselineRuntime?.close()
    memoryRuntime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
}

async function loadProjectRuleScenario(): Promise<ProjectRuleScenario> {
  const scenarioUrl = new URL('./scenarios/project-rule.json', import.meta.url)
  const content = await readFile(scenarioUrl, 'utf8')
  const parsed: unknown = JSON.parse(content)

  if (!isProjectRuleScenario(parsed)) {
    throw new Error('project-rule scenario has an invalid shape')
  }

  return parsed
}

function buildEvaluationSide(bundle: ContextBundle, expectedRecall: string[]): EvaluationSide {
  const recalledTexts = bundle.includedResults.map(result => result.item.text)
  const matchedExpectedRecall = expectedRecall.filter(expected =>
    recalledTexts.some(text => text.includes(expected))
  )

  return {
    recalledTexts,
    bundleText: bundle.text,
    matchedExpectedRecall,
    metrics: buildRecallMetrics(bundle, expectedRecall, matchedExpectedRecall),
    recallLog: bundle.recallLog
  }
}

function buildRecallMetrics(
  bundle: ContextBundle,
  expectedRecall: string[],
  matchedExpectedRecall: string[]
): RecallEvaluationMetrics {
  const recallLog = bundle.recallLog

  return {
    expectedCount: expectedRecall.length,
    matchedExpectedCount: matchedExpectedRecall.length,
    candidateCount: recallLog?.candidateCount ?? 0,
    includedCount: recallLog?.includedMemoryIds.length ?? 0,
    omittedCount: recallLog?.omittedMemoryIds.length ?? 0,
    supersededCount: recallLog?.supersededMemoryIds.length ?? 0,
    unexpectedIncludedCount: Math.max(bundle.includedResults.length - matchedExpectedRecall.length, 0),
    budgetUsedChars: bundle.budget.usedChars,
    budgetMaxChars: bundle.budget.maxChars
  }
}

function isProjectRuleScenario(value: unknown): value is ProjectRuleScenario {
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
    isOptionalString(value.source)
  )
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

function readFsPromisesModule(value: unknown): FsPromisesModule {
  if (!isRecord(value)) {
    throw new Error('node:fs/promises module shape is invalid')
  }

  const mkdtempValue = readFunction(value, 'mkdtemp')
  const readFileValue = readFunction(value, 'readFile')
  const rmValue = readFunction(value, 'rm')

  return {
    mkdtemp(prefix) {
      return mkdtempValue(prefix) as Promise<string>
    },
    readFile(path, encoding) {
      return readFileValue(path, encoding) as Promise<string>
    },
    rm(path, options) {
      return rmValue(path, options) as Promise<void>
    }
  }
}

function readOsModule(value: unknown): OsModule {
  if (!isRecord(value)) {
    throw new Error('node:os module shape is invalid')
  }

  const tmpdirValue = readFunction(value, 'tmpdir')

  return {
    tmpdir() {
      return tmpdirValue() as string
    }
  }
}

function readPathModule(value: unknown): PathModule {
  if (!isRecord(value)) {
    throw new Error('node:path module shape is invalid')
  }

  const joinValue = readFunction(value, 'join')

  return {
    join(...paths) {
      return joinValue(...paths) as string
    }
  }
}

function readFunction(record: Record<string, unknown>, key: string): (...args: unknown[]) => unknown {
  const value = record[key]
  if (typeof value !== 'function') {
    throw new Error(`Expected ${key} to be callable`)
  }

  return value as (...args: unknown[]) => unknown
}
