import { buildContextBundle } from './context-assembly.ts'
import type {
  ContextAssemblyOptions,
  ContextBundle,
  MemoryExportSnapshot,
  MemoryInput,
  MemoryItem,
  MemoryPruneCandidate,
  MemoryPruneOptions,
  MemoryPrunePlan,
  MemoryStats,
  RecallQuery,
  RecallLog,
  RecallResult,
  RuntimeOptions,
  SessionSummaryArtifact,
  SessionSummaryInput
} from './models.ts'
import { recallMemory, recallMemoryCandidates } from './retrieval.ts'
import { finalizeSessionSummaryArtifact } from './session-summary.ts'
import { MemoryStorage } from './storage.ts'

export class MemoryRuntime {
  #storage: MemoryStorage

  constructor(options: RuntimeOptions) {
    this.#storage = new MemoryStorage(options.databasePath)
  }

  remember(input: MemoryInput) {
    return this.#storage.remember(input)
  }

  recall(query: RecallQuery): RecallResult[] {
    return recallMemory(this.#storage, query)
  }

  getMemoryStats(projectId?: string): MemoryStats {
    return this.#storage.stats({ projectId })
  }

  exportMemorySnapshot(): MemoryExportSnapshot {
    return this.#storage.exportSnapshot()
  }

  importMemorySnapshot(snapshot: MemoryExportSnapshot): void {
    this.#storage.importSnapshot(snapshot)
  }

  planMemoryPruning(options: MemoryPruneOptions = {}): MemoryPrunePlan {
    const memories = this.#storage.list({ projectId: options.projectId, includeSuperseded: true })
    const activeMemories = memories.filter(memory => memory.supersededBy === undefined)
    const candidates = memories
      .map(memory => buildPruneCandidate(memory))
      .filter(candidate => candidate.reasons.length > 0)
    const activeOverflow = options.targetActiveItems === undefined
      ? []
      : activeMemories
        .filter(memory => memory.kind !== 'project-fact' && memory.kind !== 'decision-memory' && memory.reinforcementCount <= 1)
        .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
        .slice(0, Math.max(activeMemories.length - options.targetActiveItems, 0))
        .map(memory => ({
          memoryId: memory.id,
          kind: memory.kind,
          projectId: memory.projectId,
          taskId: memory.taskId,
          reasons: ['active-over-budget'],
          textPreview: previewMemoryText(memory)
        }))
    const byId = new Map<string, MemoryPruneCandidate>()

    for (const candidate of [...candidates, ...activeOverflow]) {
      const existing = byId.get(candidate.memoryId)
      byId.set(candidate.memoryId, existing === undefined ? candidate : {
        ...existing,
        reasons: [...new Set([...existing.reasons, ...candidate.reasons])]
      })
    }
    const mergedCandidates = [...byId.values()]

    return {
      generatedAt: new Date().toISOString(),
      projectId: options.projectId,
      targetActiveItems: options.targetActiveItems,
      activeCount: activeMemories.length,
      pruneCount: mergedCandidates.length,
      candidates: mergedCandidates
    }
  }

  buildContextBundle(query: RecallQuery, options: ContextAssemblyOptions = {}): ContextBundle {
    const candidates = recallMemoryCandidates(this.#storage, query)
    const results = candidates.slice(0, query.limit ?? 8)
    const bundle = buildContextBundle(results, options)
    const supersededCandidates = query.includeSuperseded === true
      ? []
      : recallMemoryCandidates(this.#storage, { ...query, includeSuperseded: true })
        .filter(result => result.item.supersededBy !== undefined)

    return {
      ...bundle,
      recallLog: buildRecallLog(query, candidates, bundle, supersededCandidates)
    }
  }

  async createSessionSummary(input: SessionSummaryInput): Promise<SessionSummaryArtifact> {
    const bundle = this.buildContextBundle(
      {
        projectId: input.projectId,
        taskId: input.taskId,
        text: input.queryText,
        limit: input.maxItems
      },
      {
        maxItems: input.maxItems,
        maxChars: input.maxChars
      }
    )

    const memory = this.remember({
      projectId: input.projectId,
      taskId: input.taskId,
      kind: 'session-summary',
      text: input.summary,
      tags: ['session-summary'],
      source: 'runtime-session-summary'
    })

    return finalizeSessionSummaryArtifact(input, memory, bundle, 'Session Summary')
  }

  async createHandoff(input: SessionSummaryInput): Promise<SessionSummaryArtifact> {
    const bundle = this.buildContextBundle(
      {
        projectId: input.projectId,
        taskId: input.taskId,
        text: input.queryText,
        limit: input.maxItems
      },
      {
        maxItems: input.maxItems,
        maxChars: input.maxChars
      }
    )

    const memory = this.remember({
      projectId: input.projectId,
      taskId: input.taskId,
      kind: 'session-summary',
      text: input.summary,
      tags: ['handoff'],
      source: 'runtime-handoff'
    })

    return finalizeSessionSummaryArtifact(input, memory, bundle, 'Handoff')
  }

  close(): void {
    this.#storage.close()
  }
}

function buildPruneCandidate(memory: MemoryItem): MemoryPruneCandidate {
  const reasons: string[] = []

  if (memory.supersededBy !== undefined) {
    reasons.push('superseded')
  }

  if (memory.kind === 'session-summary' && memory.reinforcementCount <= 1) {
    reasons.push('low-value-session-summary')
  }

  return {
    memoryId: memory.id,
    kind: memory.kind,
    projectId: memory.projectId,
    taskId: memory.taskId,
    reasons,
    textPreview: previewMemoryText(memory)
  }
}

function buildRecallLog(
  query: RecallQuery,
  results: RecallResult[],
  bundle: ContextBundle,
  supersededResults: RecallResult[]
): RecallLog {
  const includedIds = new Set(bundle.includedResults.map(result => result.item.id))
  const includedMemoryIds = bundle.includedResults.map(result => result.item.id)
  const omittedMemoryIds = results
    .filter(result => !includedIds.has(result.item.id))
    .map(result => result.item.id)
  const supersededMemoryIds = supersededResults.map(result => result.item.id)

  return {
    generatedAt: new Date().toISOString(),
    query: copyRecallQuery(query),
    candidateCount: results.length,
    includedMemoryIds,
    omittedMemoryIds,
    supersededMemoryIds,
    candidates: results.map(result => ({
      memoryId: result.item.id,
      kind: result.item.kind,
      projectId: result.item.projectId,
      taskId: result.item.taskId,
      score: result.score,
      reasons: [...result.reasons],
      included: includedIds.has(result.item.id),
      textPreview: previewMemoryText(result.item),
      reinforcementCount: result.item.reinforcementCount,
      supersededBy: result.item.supersededBy,
      supersededAt: result.item.supersededAt
    })),
    budget: { ...bundle.budget }
  }
}

function copyRecallQuery(query: RecallQuery): RecallQuery {
  return {
    projectId: query.projectId,
    taskId: query.taskId,
    text: query.text,
    tags: query.tags === undefined ? undefined : [...query.tags],
    kinds: query.kinds === undefined ? undefined : [...query.kinds],
    limit: query.limit,
    includeSuperseded: query.includeSuperseded
  }
}

function previewMemoryText(item: MemoryItem): string {
  const maxPreviewChars = 120
  if (item.text.length <= maxPreviewChars) {
    return item.text
  }

  return `${item.text.slice(0, maxPreviewChars - 3)}...`
}
