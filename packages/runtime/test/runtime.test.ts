import { MemoryRuntime } from '../src/index.ts'
import { createOpenCodeAdapter } from '../../opencode-adapter/src/index.ts'

interface AssertStrict {
  equal(actual: unknown, expected: unknown, message?: string): void
  match(actual: string, expected: RegExp, message?: string): void
  ok(value: unknown, message?: string): void
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

type UnknownFunction = (...args: unknown[]) => unknown

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

test('runtime persists, reloads, recalls, and builds bounded context', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')

  try {
    const firstRuntime = new MemoryRuntime({ databasePath })
    const remembered = firstRuntime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Do not modify tmp reference repositories during first-party implementation.',
      tags: ['project-rule'],
      source: 'test'
    })

    assert.equal(remembered.projectId, 'info7375-final')
    assert.equal(remembered.kind, 'project-fact')
    firstRuntime.close()

    const secondRuntime = new MemoryRuntime({ databasePath })
    secondRuntime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-1',
      kind: 'task-memory',
      text: 'Runtime scaffolding uses deterministic keyword recall before semantic search.',
      tags: ['retrieval'],
      source: 'test'
    })

    const recallResults = secondRuntime.recall({
      projectId: 'info7375-final',
      taskId: 'phase-1',
      text: 'keyword retrieval should remember project rule',
      limit: 4
    })

    assert.equal(recallResults.length, 2)
    assert.equal(recallResults[0]?.item.kind, 'task-memory')
    assert.equal(recallResults[1]?.item.id, remembered.id)

    const bundle = secondRuntime.buildContextBundle(
      {
        projectId: 'info7375-final',
        taskId: 'phase-1',
        text: 'keyword retrieval project rule',
        limit: 4
      },
      {
        maxItems: 2,
        maxChars: 1000
      }
    )

    assert.equal(bundle.durableFacts.length, 1)
    assert.equal(bundle.workingMemory.length, 1)
    assert.equal(bundle.includedResults.length, 2)
    assert.match(bundle.text, /Durable Project Facts/)
    assert.match(bundle.text, /Working Memory/)
    assert.match(bundle.text, /Do not modify tmp reference repositories/)
    assert.ok(bundle.budget.usedChars <= bundle.budget.maxChars)

    secondRuntime.close()
  } finally {
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('context assembly respects tiny character budgets', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'This memory item is intentionally too long for a tiny context budget.',
      tags: ['budget-test'],
      source: 'test'
    })

    const bundle = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        text: 'budget test',
        limit: 4
      },
      {
        maxItems: 1,
        maxChars: 20
      }
    )

    assert.equal(bundle.includedResults.length, 0)
    assert.equal(bundle.durableFacts.length, 0)
    assert.equal(bundle.workingMemory.length, 0)
    assert.equal(bundle.text, '# Memory Context Bun')
    assert.ok(bundle.budget.usedChars <= bundle.budget.maxChars)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('OpenCode adapter delegates request fields to the runtime bundle builder', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')

  try {
    const runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-1',
      kind: 'task-memory',
      text: 'Adapter requests should flow into the runtime unchanged.',
      tags: ['adapter'],
      source: 'test'
    })

    const adapter = createOpenCodeAdapter(runtime)
    const bundle = adapter.buildInjection({
      projectId: 'info7375-final',
      taskId: 'phase-1',
      prompt: 'adapter flow unchanged',
      maxItems: 1,
      maxChars: 500
    })

    assert.equal(bundle.includedResults.length, 1)
    assert.equal(bundle.workingMemory.length, 1)
    assert.equal(bundle.includedResults[0]?.item.taskId, 'phase-1')
    assert.match(bundle.text, /adapter flow unchanged|Adapter requests should flow into the runtime unchanged/)

    runtime.close()
  } finally {
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

function readAssertModule(value: unknown): AssertModule {
  if (!isRecord(value) || !isRecord(value.strict)) {
    throw new Error('node:assert module shape is invalid')
  }

  const strict = value.strict
  const equal = readFunction(strict, 'equal')
  const match = readFunction(strict, 'match')
  const ok = readFunction(strict, 'ok')

  return {
    strict: {
      equal(actual, expected, message) {
        equal(actual, expected, message)
      },
      match(actual, expected, message) {
        match(actual, expected, message)
      },
      ok(actual, message) {
        ok(actual, message)
      }
    }
  }
}

function readFsPromisesModule(value: unknown): FsPromisesModule {
  if (!isRecord(value)) {
    throw new Error('node:fs/promises module shape is invalid')
  }

  const mkdtemp = readFunction(value, 'mkdtemp')
  const rm = readFunction(value, 'rm')

  return {
    mkdtemp(prefix) {
      return mkdtemp(prefix) as Promise<string>
    },
    rm(path, options) {
      return rm(path, options) as Promise<void>
    }
  }
}

function readOsModule(value: unknown): OsModule {
  if (!isRecord(value)) {
    throw new Error('node:os module shape is invalid')
  }

  const tmpdir = readFunction(value, 'tmpdir')

  return {
    tmpdir() {
      return tmpdir() as string
    }
  }
}

function readPathModule(value: unknown): PathModule {
  if (!isRecord(value)) {
    throw new Error('node:path module shape is invalid')
  }

  const join = readFunction(value, 'join')

  return {
    join(...paths) {
      return join(...paths) as string
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

function readFunction(record: Record<string, unknown>, key: string): UnknownFunction {
  const value = record[key]
  if (typeof value !== 'function') {
    throw new Error(`Expected ${key} to be callable`)
  }

  return value as UnknownFunction
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
}
