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
  readFile(path: string, encoding: string): Promise<string>
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

interface SqliteStatement {
  run(...parameters: Array<string | number | null>): unknown
}

interface SqliteDatabase {
  exec(sql: string): void
  prepare(sql: string): SqliteStatement
  close(): void
}

interface SqliteDatabaseConstructor {
  new(databasePath: string): SqliteDatabase
}

type UnknownFunction = (...args: unknown[]) => unknown

const assertModuleName = 'node:assert'
const fsPromisesModuleName = 'node:fs/promises'
const osModuleName = 'node:os'
const pathModuleName = 'node:path'
const sqliteModuleName = 'node:sqlite'
const testModuleName = 'node:test'

const assertModule: unknown = await import(assertModuleName)
const fsPromisesModule: unknown = await import(fsPromisesModuleName)
const osModule: unknown = await import(osModuleName)
const pathModule: unknown = await import(pathModuleName)
const sqliteModule: unknown = await import(sqliteModuleName)
const testModule: unknown = await import(testModuleName)

const assert = readAssertModule(assertModule).strict
const { mkdtemp, readFile, rm } = readFsPromisesModule(fsPromisesModule)
const { tmpdir } = readOsModule(osModule)
const { join } = readPathModule(pathModule)
const DatabaseSync = readDatabaseSync(sqliteModule)
const test = readTestModule(testModule).default

test('runtime persists, reloads, recalls, and builds bounded context', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let secondRuntime: MemoryRuntime | undefined

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

    secondRuntime = new MemoryRuntime({ databasePath })
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
    assert.ok(recallResults.some(result => result.item.kind === 'task-memory'))
    assert.ok(recallResults.some(result => result.item.id === remembered.id))

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
    assert.equal(bundle.recallLog?.candidateCount, 2)
    assert.equal(bundle.recallLog?.includedMemoryIds.length, 2)
    assert.equal(bundle.recallLog?.omittedMemoryIds.length, 0)
    assert.equal(bundle.recallLog?.query.text, 'keyword retrieval project rule')
    assert.equal(bundle.recallLog?.candidates[0]?.included, true)
    assert.ok(bundle.recallLog?.candidates[0]?.reasons.length ?? 0)
    assert.ok(!bundle.recallLog?.candidates[0]?.reasons.includes('keyword:the'))
    assert.ok(bundle.recallLog?.candidates.some(candidate => candidate.reasons.includes('kind:project-fact')))
  } finally {
    secondRuntime?.close()
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
    assert.equal(bundle.recallLog?.candidateCount, 1)
    assert.equal(bundle.recallLog?.includedMemoryIds.length, 0)
    assert.equal(bundle.recallLog?.omittedMemoryIds.length, 1)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('recall log preserves candidates omitted by query limit', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Recall audit evidence should include durable project facts.',
      tags: ['audit'],
      source: 'test'
    })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      kind: 'task-memory',
      text: 'Recall audit evidence should include task memory candidates.',
      tags: ['audit'],
      source: 'test'
    })

    const bundle = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        taskId: 'phase-2',
        text: 'recall audit evidence',
        limit: 1
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    assert.equal(bundle.includedResults.length, 1)
    assert.equal(bundle.recallLog?.candidateCount, 2)
    assert.equal(bundle.recallLog?.includedMemoryIds.length, 1)
    assert.equal(bundle.recallLog?.omittedMemoryIds.length, 1)
    assert.equal(bundle.recallLog?.candidates.length, 2)
    assert.equal(bundle.recallLog?.candidates.filter(candidate => candidate.included).length, 1)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime supports decision memory with FTS-backed recall reasons', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      kind: 'decision-memory',
      text: 'Decision: keep the OpenCode adapter thin because host integration details should not drive runtime design.',
      tags: ['architecture', 'adapter', 'rationale'],
      source: 'test'
    })

    const bundle = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        taskId: 'architecture-review',
        text: 'why should the adapter stay thin',
        limit: 4
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    assert.equal(bundle.workingMemory.length, 1)
    assert.equal(bundle.workingMemory[0]?.kind, 'decision-memory')
    assert.ok(bundle.recallLog?.candidates[0]?.reasons.includes('kind:decision-memory'))
    assert.ok(bundle.recallLog?.candidates[0]?.reasons.some(reason => reason.startsWith('fts:bm25=')))
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime aligns FTS search token cleanup with deterministic recall', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Runtime memory should be explainable and bounded.',
      tags: ['memory'],
      source: 'test'
    })

    const stopwordOnly = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        text: 'the and with to',
        limit: 4
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    assert.equal(stopwordOnly.recallLog?.candidates[0]?.reasons.includes('kind:project-fact'), true)
    assert.ok(!stopwordOnly.recallLog?.candidates[0]?.reasons.some(reason => reason.startsWith('fts:bm25=')))

    const duplicateStopwords = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        text: 'runtime runtime and the memory',
        limit: 4
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    const reasons = duplicateStopwords.recallLog?.candidates[0]?.reasons ?? []
    assert.equal(reasons.filter(reason => reason === 'keyword:runtime').length, 1)
    assert.ok(!reasons.includes('keyword:the'))
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime reports memory governance statistics', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    const durableFact = runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Do not modify tmp reference repositories during first-party implementation.',
      tags: ['scope'],
      source: 'test'
    })
    runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Do not modify tmp reference repositories during first-party implementation.',
      tags: ['duplicate'],
      source: 'test'
    })
    const staleDecision = runtime.remember({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      kind: 'decision-memory',
      text: 'Decision: store memory in the OpenCode adapter.',
      tags: ['architecture'],
      source: 'test'
    })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      kind: 'decision-memory',
      text: 'Decision: store memory in the local-first runtime.',
      tags: ['architecture'],
      source: 'test',
      supersedes: [staleDecision.id]
    })
    runtime.remember({
      projectId: 'other-project',
      kind: 'project-fact',
      text: 'Other project memory should not affect scoped stats.',
      tags: ['scope'],
      source: 'test'
    })

    const stats = runtime.getMemoryStats('info7375-final')
    assert.equal(stats.total, 3)
    assert.equal(stats.active, 2)
    assert.equal(stats.superseded, 1)
    assert.equal(stats.reinforcedItems, 1)
    assert.equal(stats.reinforcementEvents, 1)
    assert.equal(stats.byKind['project-fact'].total, 1)
    assert.equal(stats.byKind['project-fact'].reinforcementEvents, 1)
    assert.equal(stats.byKind['decision-memory'].superseded, 1)
    assert.ok(durableFact.reinforcementCount === 1)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime exports and imports portable memory snapshots', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const sourceDatabasePath = join(tempDirectory, 'source.sqlite')
  const targetDatabasePath = join(tempDirectory, 'target.sqlite')
  let sourceRuntime: MemoryRuntime | undefined
  let targetRuntime: MemoryRuntime | undefined

  try {
    sourceRuntime = new MemoryRuntime({ databasePath: sourceDatabasePath })
    const oldDecision = sourceRuntime.remember({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      kind: 'decision-memory',
      text: 'Decision: put memory in the adapter.',
      tags: ['architecture'],
      source: 'test'
    })
    const newDecision = sourceRuntime.remember({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      kind: 'decision-memory',
      text: 'Decision: keep memory in the runtime.',
      tags: ['architecture'],
      source: 'test',
      supersedes: [oldDecision.id]
    })
    sourceRuntime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Runtime snapshots should preserve reinforced memories.',
      tags: ['snapshot'],
      source: 'test'
    })
    sourceRuntime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Runtime snapshots should preserve reinforced memories.',
      tags: ['duplicate'],
      source: 'test'
    })

    const snapshot = sourceRuntime.exportMemorySnapshot()
    targetRuntime = new MemoryRuntime({ databasePath: targetDatabasePath })
    targetRuntime.importMemorySnapshot(snapshot)

    const importedStats = targetRuntime.getMemoryStats('info7375-final')
    assert.equal(importedStats.total, 3)
    assert.equal(importedStats.superseded, 1)
    assert.equal(importedStats.reinforcementEvents, 1)

    const defaultRecall = targetRuntime.recall({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      text: 'memory runtime adapter decision',
      limit: 4
    })
    assert.ok(defaultRecall.some(result => result.item.id === newDecision.id))
    assert.ok(!defaultRecall.some(result => result.item.id === oldDecision.id))

    const auditRecall = targetRuntime.recall({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      text: 'memory runtime adapter decision',
      includeSuperseded: true,
      limit: 4
    })
    assert.ok(auditRecall.some(result => result.item.id === oldDecision.id && result.item.supersededBy === newDecision.id))
  } finally {
    sourceRuntime?.close()
    targetRuntime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime rejects invalid memory snapshots before import', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    const validMemory = runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Snapshot validation should reject invalid governance metadata.',
      tags: ['snapshot'],
      source: 'test'
    })
    const invalidSnapshot = {
      schemaVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      memories: [{
        ...validMemory,
        reinforcementCount: 0
      }]
    }

    let threw = false
    try {
      runtime.importMemorySnapshot(invalidSnapshot)
    } catch (error) {
      threw = error instanceof Error && error.message.includes('reinforcementCount')
    }

    assert.ok(threw)
    assert.equal(runtime.getMemoryStats('info7375-final').total, 1)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime plans pruning without mutating memory state', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Project facts should be retained during dry-run pruning.',
      tags: ['prune'],
      source: 'test'
    })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-1',
      kind: 'session-summary',
      text: 'Old session summary can be pruned from storage evidence.',
      tags: ['session-summary'],
      source: 'test'
    })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-1',
      kind: 'task-memory',
      text: 'Low-priority task memory may be over active budget.',
      tags: ['prune'],
      source: 'test'
    })

    const beforeStats = runtime.getMemoryStats('info7375-final')
    const plan = runtime.planMemoryPruning({ projectId: 'info7375-final', targetActiveItems: 2 })
    const afterStats = runtime.getMemoryStats('info7375-final')

    assert.equal(plan.activeCount, 3)
    assert.equal(plan.pruneCount, 1)
    assert.ok(plan.candidates[0]?.reasons.includes('low-value-session-summary'))
    assert.ok(plan.candidates[0]?.reasons.includes('active-over-budget'))
    assert.equal(afterStats.total, beforeStats.total)
    assert.equal(afterStats.active, beforeStats.active)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime consolidates exact duplicate memories by reinforcement', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    const first = runtime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      kind: 'task-memory',
      text: 'Evaluation should compare memory-assisted output against a baseline.',
      tags: ['evaluation'],
      source: 'test-a',
      createdAt: new Date(0).toISOString()
    })
    const second = runtime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      kind: 'task-memory',
      text: '  Evaluation should compare memory-assisted output against a baseline.  ',
      tags: ['baseline'],
      source: 'test-b'
    })

    assert.equal(second.id, first.id)
    assert.equal(second.reinforcementCount, 2)
    assert.ok(second.tags.includes('evaluation'))
    assert.ok(second.tags.includes('baseline'))
    assert.equal(runtime.recall({ projectId: 'info7375-final', taskId: 'phase-2', text: 'baseline evaluation', limit: 8 }).length, 1)

    const bundle = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        taskId: 'phase-2',
        text: 'baseline evaluation memory assisted output',
        limit: 4
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    assert.equal(bundle.workingMemory.length, 1)
    assert.equal(bundle.workingMemory[0]?.reinforcementCount, 2)
    assert.equal(bundle.recallLog?.candidates[0]?.reinforcementCount, 2)
    assert.ok(bundle.recallLog?.candidates[0]?.reasons.includes('reinforced:2'))
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime excludes superseded memories from recall by default', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    const oldDecision = runtime.remember({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      kind: 'decision-memory',
      text: 'Decision: make the OpenCode adapter own memory storage.',
      tags: ['architecture', 'adapter'],
      source: 'test'
    })
    const newDecision = runtime.remember({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      kind: 'decision-memory',
      text: 'Decision: keep memory storage in the runtime and the OpenCode adapter thin.',
      tags: ['architecture', 'adapter'],
      source: 'test',
      supersedes: [oldDecision.id]
    })

    const defaultResults = runtime.recall({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      text: 'adapter memory storage decision',
      limit: 4
    })

    assert.equal(defaultResults.length, 1)
    assert.equal(defaultResults[0]?.item.id, newDecision.id)

    const defaultBundle = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        taskId: 'architecture-review',
        text: 'adapter memory storage decision',
        limit: 4
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    assert.equal(defaultBundle.recallLog?.candidateCount, 1)
    assert.equal(defaultBundle.recallLog?.supersededMemoryIds[0], oldDecision.id)

    const auditBundle = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        taskId: 'architecture-review',
        text: 'adapter memory storage decision',
        limit: 4,
        includeSuperseded: true
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    assert.equal(auditBundle.recallLog?.candidateCount, 2)
    const supersededCandidate = auditBundle.recallLog?.candidates.find(candidate => candidate.memoryId === oldDecision.id)
    assert.equal(supersededCandidate?.supersededBy, newDecision.id)
    assert.ok(supersededCandidate?.supersededAt !== undefined)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime migrates legacy memory kind constraints for decision memory', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    createLegacyMemoryDatabase(databasePath)
    runtime = new MemoryRuntime({ databasePath })

    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      kind: 'decision-memory',
      text: 'Decision: preserve old runtime databases while adding decision memory.',
      tags: ['migration'],
      source: 'test'
    })

    const recallResults = runtime.recall({
      projectId: 'info7375-final',
      taskId: 'architecture-review',
      text: 'decision memory migration legacy runtime databases',
      limit: 4
    })

    assert.ok(recallResults.some(result => result.item.kind === 'project-fact'))
    assert.ok(recallResults.some(result => result.item.kind === 'decision-memory'))
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime falls back to deterministic recall when FTS search is unavailable', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  let runtime: MemoryRuntime | undefined

  try {
    createNonFtsSearchTable(databasePath)
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'fallback-check',
      kind: 'task-memory',
      text: 'Fallback keyword recall survives unavailable FTS search.',
      tags: ['fallback'],
      source: 'test'
    })

    const bundle = runtime.buildContextBundle(
      {
        projectId: 'info7375-final',
        taskId: 'fallback-check',
        text: 'fallback keyword recall survives unavailable fts search',
        limit: 4
      },
      {
        maxItems: 4,
        maxChars: 1200
      }
    )

    assert.equal(bundle.workingMemory.length, 1)
    assert.ok(bundle.recallLog?.candidates[0]?.reasons.includes('keyword:fallback'))
    assert.ok(!bundle.recallLog?.candidates[0]?.reasons.some(reason => reason.startsWith('fts:bm25=')))
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

test('OpenCode adapter builds a prompt document with handoff content', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  const artifactDirectory = join(tempDirectory, 'artifacts')

  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Avoid conflicting with existing OpenCode hooks by using non-hook input paths.',
      tags: ['integration'],
      source: 'test'
    })

    const handoff = await runtime.createHandoff({
      projectId: 'info7375-final',
      taskId: 'phase-3',
      summary: 'Prepared a runtime handoff for non-hook OpenCode validation.',
      queryText: 'non hook input paths opencode validation',
      nextActions: ['Run opencode serve --pure before attaching the client.'],
      artifactDirectory,
      maxItems: 4,
      maxChars: 1200
    })

    const adapter = createOpenCodeAdapter(runtime)
    const promptDocument = adapter.buildPromptDocument(
      {
        projectId: 'info7375-final',
        taskId: 'phase-3',
        prompt: 'Answer with the safe OpenCode integration mode only.',
        maxItems: 4,
        maxChars: 1200
      },
      {
        handoff,
        instructions: ['Return only the integration mode.']
      }
    )

    assert.match(promptDocument.text, /OpenCode Memory Injection/)
    assert.match(promptDocument.text, /non-hook input paths/)
    assert.match(promptDocument.text, /Prepared a runtime handoff for non-hook OpenCode validation/)
    assert.ok(promptDocument.handoffPath !== undefined)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('OpenCode adapter prompt builder remains callable after destructuring', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')

  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Non-hook server/client surfaces are the safe integration path.',
      tags: ['integration'],
      source: 'test'
    })

    const adapter = createOpenCodeAdapter(runtime)
    const { buildPromptDocument } = adapter
    const promptDocument = buildPromptDocument({
      projectId: 'info7375-final',
      prompt: 'State the safe integration path only.',
      maxItems: 4,
      maxChars: 1200
    })

    assert.match(promptDocument.text, /safe integration path/)
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime creates session summary memory and markdown artifacts', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  const artifactDirectory = join(tempDirectory, 'artifacts')

  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      kind: 'project-fact',
      text: 'Keep the runtime-first boundary intact before any OpenCode validation.',
      tags: ['boundary'],
      source: 'test'
    })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      kind: 'task-memory',
      text: 'Session summary generation should be completed before host-level testing.',
      tags: ['session'],
      source: 'test'
    })

    const sessionSummary = await runtime.createSessionSummary({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      summary: 'Implemented runtime-generated session summary artifacts.',
      queryText: 'runtime boundary host validation session summary',
      nextActions: ['Connect the summary output to the OpenCode adapter.'],
      artifactDirectory,
      maxItems: 4,
      maxChars: 1200
    })

    assert.equal(sessionSummary.memory.kind, 'session-summary')
    assert.ok(sessionSummary.artifactPath !== undefined)
    assert.match(sessionSummary.markdown, /Session Summary/)
    assert.match(sessionSummary.markdown, /Implemented runtime-generated session summary artifacts/)
    assert.match(sessionSummary.markdown, /Connect the summary output to the OpenCode adapter/)
    assert.match(sessionSummary.bundle.text, /Durable Project Facts/)

    const artifactContent = await readFile(sessionSummary.artifactPath ?? '', 'utf8')
    assert.match(artifactContent, /Session Summary/)
    assert.match(artifactContent, /Keep the runtime-first boundary intact/)

    const recallResults = runtime.recall({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      text: 'runtime-generated session summary artifacts',
      kinds: ['session-summary'],
      limit: 4
    })

    assert.equal(recallResults.length, 1)
    assert.equal(recallResults[0]?.item.text, 'Implemented runtime-generated session summary artifacts.')
  } finally {
    runtime?.close()
    await rm(tempDirectory, { recursive: true, force: true })
  }
})

test('runtime creates handoff artifacts with handoff tagging', async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'info7375-memory-runtime-'))
  const databasePath = join(tempDirectory, 'memory.sqlite')
  const artifactDirectory = join(tempDirectory, 'artifacts')

  let runtime: MemoryRuntime | undefined

  try {
    runtime = new MemoryRuntime({ databasePath })
    runtime.remember({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      kind: 'task-memory',
      text: 'The next natural step is to run the adapter through a real OpenCode workflow.',
      tags: ['next-step'],
      source: 'test'
    })

    const handoff = await runtime.createHandoff({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      summary: 'Runtime handoff artifact is ready for host-level validation.',
      queryText: 'next natural step open code workflow adapter validation',
      nextActions: ['Run a real OpenCode flow with the adapter and handoff output.'],
      artifactDirectory,
      maxItems: 4,
      maxChars: 1200
    })

    assert.equal(handoff.memory.kind, 'session-summary')
    assert.match(handoff.markdown, /Handoff/)
    assert.match(handoff.markdown, /Runtime handoff artifact is ready for host-level validation/)

    const handoffRecall = runtime.recall({
      projectId: 'info7375-final',
      taskId: 'phase-2',
      text: 'handoff artifact host-level validation',
      tags: ['handoff'],
      kinds: ['session-summary'],
      limit: 4
    })

    assert.equal(handoffRecall.length, 1)
    assert.equal(handoffRecall[0]?.item.source, 'runtime-handoff')
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
  const readFile = readFunction(value, 'readFile')
  const rm = readFunction(value, 'rm')

  return {
    mkdtemp(prefix) {
      return mkdtemp(prefix) as Promise<string>
    },
    readFile(path, encoding) {
      return readFile(path, encoding) as Promise<string>
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

function createLegacyMemoryDatabase(databasePath: string): void {
  const database = new DatabaseSync(databasePath)
  try {
    database.exec(`
      CREATE TABLE memory_items (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        task_id TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('project-fact', 'task-memory', 'session-summary')),
        text TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL
      );
    `)
    database.prepare(`
      INSERT INTO memory_items (
        id, project_id, task_id, kind, text, tags_json, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'legacy-project-fact',
      'info7375-final',
      null,
      'project-fact',
      'Legacy runtime databases should keep existing project facts after schema migration.',
      JSON.stringify(['legacy']),
      'test',
      new Date(0).toISOString()
    )
  } finally {
    database.close()
  }
}

function createNonFtsSearchTable(databasePath: string): void {
  const database = new DatabaseSync(databasePath)
  try {
    database.exec('CREATE TABLE memory_items_fts (id TEXT, text TEXT, tags TEXT);')
  } finally {
    database.close()
  }
}

function readDatabaseSync(value: unknown): SqliteDatabaseConstructor {
  if (!isRecord(value)) {
    throw new Error('node:sqlite module shape is invalid')
  }

  const constructor = value.DatabaseSync
  if (typeof constructor !== 'function') {
    throw new Error('node:sqlite is missing DatabaseSync')
  }

  return constructor as SqliteDatabaseConstructor
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
