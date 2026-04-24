import { prepareOpenCodeScenario } from './opencode-scenario.ts'

interface AssertStrict {
  equal(actual: unknown, expected: unknown, message?: string): void
  ok(value: unknown, message?: string): void
  match(actual: string, expected: RegExp, message?: string): void
}

interface AssertModule {
  strict: AssertStrict
}

interface FsModule {
  mkdtempSync(prefix: string): string
}

interface OsModule {
  tmpdir(): string
}

interface PathModule {
  join(...paths: string[]): string
}

interface FsPromisesModule {
  readFile(path: string, encoding: string): Promise<string>
  rm(path: string, options: { recursive: boolean; force: boolean }): Promise<void>
}

interface TestModule {
  default(name: string, fn: () => Promise<void> | void): void
}

const assertModuleName = 'node:assert'
const fsModuleName = 'node:fs'
const fsPromisesModuleName = 'node:fs/promises'
const osModuleName = 'node:os'
const pathModuleName = 'node:path'
const testModuleName = 'node:test'

const assertModule: unknown = await import(assertModuleName)
const fsModule: unknown = await import(fsModuleName)
const fsPromisesModule: unknown = await import(fsPromisesModuleName)
const osModule: unknown = await import(osModuleName)
const pathModule: unknown = await import(pathModuleName)
const testModule: unknown = await import(testModuleName)

const assert = readAssertModule(assertModule).strict
const { mkdtempSync } = readFsModule(fsModule)
const { readFile, rm } = readFsPromisesModule(fsPromisesModule)
const { tmpdir } = readOsModule(osModule)
const { join } = readPathModule(pathModule)
const test = readTestModule(testModule).default

const scenarioIds = ['project-rule', 'interrupted-task', 'architecture-rationale', 'decision-update'] as const

for (const scenarioId of scenarioIds) {
  test(`prepareOpenCodeScenario prepares attachable prompt artifacts for ${scenarioId}`, async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), `info7375-opencode-${scenarioId}-`))
    const result = await prepareOpenCodeScenario(scenarioId, { outputRoot })

    try {
      assert.equal(result.scenarioId, scenarioId)
      assert.match(result.outputRoot, /info7375-opencode-/)
      assert.equal(result.attachFiles.length, 1)
      assert.match(result.runCommandExample, /opencode run --pure --attach/)

      const promptText = await readFile(result.promptFilePath, 'utf8')
      assert.match(promptText, /OpenCode Memory Injection/)
      assert.match(promptText, /Memory Context Bundle/)
      assert.ok(!promptText.includes('recallLog'))

      const recallLogText = await readFile(result.recallLogPath, 'utf8')
      assert.match(recallLogText, /candidateCount/)
      assert.match(recallLogText, /includedMemoryIds/)
      assert.match(recallLogText, /supersededMemoryIds/)
      assert.match(recallLogText, /candidates/)
      assert.match(recallLogText, /reinforcementCount/)

      const recallMetricsText = await readFile(result.recallMetricsPath, 'utf8')
      assert.match(recallMetricsText, /matchedExpectedCount/)
      assert.match(recallMetricsText, /unexpectedIncludedCount/)

      const memorySnapshotText = await readFile(result.memorySnapshotPath, 'utf8')
      assert.match(memorySnapshotText, /"stats"/)
      assert.match(memorySnapshotText, /"snapshot"/)

      const prunePlanText = await readFile(result.prunePlanPath, 'utf8')
      assert.match(prunePlanText, /pruneCount/)

      const latestSummaryText = await readFile(result.latestSummaryPath, 'utf8')
      assert.match(latestSummaryText, new RegExp(scenarioId))

      if (result.handoffFilePath !== undefined) {
        const handoffText = await readFile(result.handoffFilePath, 'utf8')
        assert.match(handoffText, /Handoff/)
        assert.match(handoffText, /Runtime-prepared handoff for non-hook OpenCode validation/)
      }
    } finally {
      await rm(outputRoot, { recursive: true, force: true })
    }
  })
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

  const readFileValue = readFunction(value, 'readFile')
  const rmValue = readFunction(value, 'rm')

  return {
    readFile(path, encoding) {
      return readFileValue(path, encoding) as Promise<string>
    },
    rm(path, options) {
      return rmValue(path, options) as Promise<void>
    }
  }
}

function readFsModule(value: unknown): FsModule {
  if (!isRecord(value)) {
    throw new Error('node:fs module shape is invalid')
  }

  const mkdtempSyncValue = readFunction(value, 'mkdtempSync')

  return {
    mkdtempSync(prefix) {
      return mkdtempSyncValue(prefix) as string
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
