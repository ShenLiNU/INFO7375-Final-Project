import { MemoryRuntime } from '../packages/runtime/src/index.ts'

interface AssertStrict {
  equal(actual: unknown, expected: unknown, message?: string): void
  ok(value: unknown, message?: string): void
  match(actual: string, expected: RegExp, message?: string): void
}

interface AssertModule {
  strict: AssertStrict
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

interface TestModule {
  default(name: string, fn: () => Promise<void> | void): void
}

interface ScenarioTask {
  taskId: string
  prompt: string
}

interface ScenarioSeedMemory {
  kind: 'project-fact' | 'task-memory' | 'decision-memory' | 'session-summary'
  text: string
  taskId?: string
  tags?: string[]
}

interface ScenarioDocument {
  id: string
  title: string
  purpose: string
  projectId: string
  seedMemory: ScenarioSeedMemory[]
  task: ScenarioTask
  expectedRecall: string[]
  successCriteria: string[]
}

const assertModuleName = 'node:assert'
const fsPromisesModuleName = 'node:fs/promises'
const osModuleName = 'node:os'
const pathModuleName = 'node:path'
const testModuleName = 'node:test'

const assertModule: unknown = await import(assertModuleName)
const fsPromisesModule: unknown = await import(fsPromisesModuleName)
const osModule: unknown = await import(osModuleName)
const pathModule: unknown = await import(pathModuleName)
const testModule: unknown = await import(testModuleName)

const assert = readAssertModule(assertModule).strict
const { mkdtemp, readFile, rm } = readFsPromisesModule(fsPromisesModule)
const { tmpdir } = readOsModule(osModule)
const { join } = readPathModule(pathModule)
const test = readTestModule(testModule).default

test('architecture-rationale scenario recalls runtime-first boundary and thin-adapter rationale', async () => {
  const scenario = await loadScenarioDocument()
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-architecture-rationale-'))
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
    for (const memory of scenario.seedMemory) {
      memoryRuntime.remember({
        projectId: scenario.projectId,
        kind: memory.kind,
        text: memory.text,
        taskId: memory.taskId,
        tags: memory.tags,
        source: 'evaluation-scenario'
      })
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

    const baselineTexts = baselineBundle.includedResults.map(result => result.item.text)
    const memoryTexts = memoryBundle.includedResults.map(result => result.item.text)
    const matchedExpectedRecall = scenario.expectedRecall.filter(expected =>
      memoryTexts.some(text => text.includes(expected))
    )

    assert.equal(scenario.id, 'architecture-rationale')
    assert.equal(baselineTexts.length, 0)
    assert.equal(matchedExpectedRecall.length, scenario.expectedRecall.length)
    assert.ok(memoryBundle.budget.usedChars <= memoryBundle.budget.maxChars)
    assert.match(memoryBundle.text, /runtime-first/)
    assert.match(memoryBundle.text, /OpenCode adapter thin/)
  } finally {
    baselineRuntime?.close()
    memoryRuntime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

async function loadScenarioDocument(): Promise<ScenarioDocument> {
  const scenarioUrl = new URL('./scenarios/architecture-rationale.json', import.meta.url)
  const content = await readFile(scenarioUrl, 'utf8')
  const parsed: unknown = JSON.parse(content)

  if (!isScenarioDocument(parsed)) {
    throw new Error('architecture-rationale scenario has an invalid shape')
  }

  return parsed
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
    isOptionalStringArray(value.tags)
  )
}

function isMemoryKind(value: unknown): value is ScenarioSeedMemory['kind'] {
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

function readAssertModule(value: unknown): AssertModule {
  if (!isRecord(value) || !isRecord(value.strict)) {
    throw new Error('node:assert module shape is invalid')
  }

  const strict = value.strict
  const equal = readFunction(strict, 'equal')
  const ok = readFunction(strict, 'ok')
  const match = readFunction(strict, 'match')

  return {
    strict: {
      equal(actual, expected, message) {
        equal(actual, expected, message)
      },
      ok(actual, message) {
        ok(actual, message)
      },
      match(actual, expected, message) {
        match(actual, expected, message)
      }
    }
  }
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

function readTestModule(value: unknown): TestModule {
  if (!isRecord(value)) {
    throw new Error('node:test module shape is invalid')
  }

  const runTest = readFunction(value, 'default')

  return {
    default(name, fn) {
      runTest(name, fn)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
}
