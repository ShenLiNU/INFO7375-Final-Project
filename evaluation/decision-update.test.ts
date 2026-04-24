import { MemoryRuntime } from '../packages/runtime/src/index.ts'
import { readScenarioDocument } from './opencode-scenario.ts'

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
const { mkdtemp, rm } = readFsPromisesModule(fsPromisesModule)
const { tmpdir } = readOsModule(osModule)
const { join } = readPathModule(pathModule)
const test = readTestModule(testModule).default

test('decision-update scenario recalls current decision and audits superseded memory', async () => {
  const scenario = readScenarioDocument('decision-update')
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-decision-update-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    const oldDecision = runtime.remember({
      projectId: scenario.projectId,
      kind: scenario.seedMemory[0]?.kind ?? 'decision-memory',
      text: scenario.seedMemory[0]?.text ?? '',
      taskId: scenario.seedMemory[0]?.taskId,
      tags: scenario.seedMemory[0]?.tags,
      source: 'evaluation-scenario'
    })
    runtime.remember({
      projectId: scenario.projectId,
      kind: scenario.seedMemory[1]?.kind ?? 'decision-memory',
      text: scenario.seedMemory[1]?.text ?? '',
      taskId: scenario.seedMemory[1]?.taskId,
      tags: scenario.seedMemory[1]?.tags,
      source: 'evaluation-scenario',
      supersedes: [oldDecision.id]
    })

    const bundle = runtime.buildContextBundle(
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

    assert.equal(bundle.recallLog?.supersededMemoryIds[0], oldDecision.id)
    assert.ok(bundle.includedResults.some(result => result.item.text === scenario.expectedRecall[0]))
    assert.ok(!bundle.includedResults.some(result => result.item.id === oldDecision.id))
    assert.match(bundle.text, /local-first runtime/)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

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
  const rmValue = readFunction(value, 'rm')

  return {
    mkdtemp(prefix) {
      return mkdtempValue(prefix) as Promise<string>
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
