import type { MemoryItem, RecallQuery, RecallResult } from './models.ts'
import type { MemoryStorage, MemoryTextSearchResult } from './storage.ts'
import { tokenizeSearchText } from './text.ts'

export function recallMemory(storage: MemoryStorage, query: RecallQuery): RecallResult[] {
  return recallMemoryCandidates(storage, query).slice(0, query.limit ?? 8)
}

export function recallMemoryCandidates(storage: MemoryStorage, query: RecallQuery): RecallResult[] {
  const tokens = tokenizeSearchText(query.text ?? '')
  const requestedTags = new Set((query.tags ?? []).map(tag => normalize(tag)))
  const textSearchResults = query.text === undefined
    ? []
    : storage.searchText({
      projectId: query.projectId,
      taskId: query.taskId,
      kinds: query.kinds,
      includeSuperseded: query.includeSuperseded,
      text: query.text,
      limit: Math.max(query.limit ?? 8, 20)
    })
  const textSearchById = new Map(textSearchResults.map(result => [result.memoryId, result]))
  const candidates = storage.list({
    projectId: query.projectId,
    taskId: query.taskId,
    kinds: query.kinds,
    includeSuperseded: query.includeSuperseded
  })

  return candidates
    .map(item => scoreMemoryItem(item, tokens, requestedTags, textSearchById.get(item.id)))
    .filter(result => result.score > 0 || (tokens.length === 0 && requestedTags.size === 0))
    .sort(compareRecallResults)
}

function scoreMemoryItem(
  item: MemoryItem,
  tokens: string[],
  requestedTags: Set<string>,
  textSearchResult: MemoryTextSearchResult | undefined
): RecallResult {
  const reasons: string[] = []
  let score = 0

  const searchableText = `${item.text} ${item.tags.join(' ')}`
  const itemTokens = new Set(tokenizeSearchText(searchableText))

  if (item.kind === 'project-fact') {
    score += 1
    reasons.push('kind:project-fact')
  }

  if (item.reinforcementCount > 1) {
    score += Math.min(item.reinforcementCount - 1, 3)
    reasons.push(`reinforced:${item.reinforcementCount}`)
  }

  if (textSearchResult !== undefined) {
    score += 4
    reasons.push(`fts:bm25=${formatRank(textSearchResult.rank)}`)
  }

  for (const token of tokens) {
    if (itemTokens.has(token)) {
      score += 2
      reasons.push(`keyword:${token}`)
    }
  }

  for (const tag of item.tags.map(value => normalize(value))) {
    if (requestedTags.has(tag)) {
      score += 3
      reasons.push(`tag:${tag}`)
    }
  }

  if (item.kind === 'decision-memory' && score > 0) {
    score += 1
    reasons.unshift('kind:decision-memory')
  }

  if (tokens.length === 0 && requestedTags.size === 0) {
    score = 1
    reasons.push('filtered')
  }

  return { item, score, reasons }
}

function compareRecallResults(left: RecallResult, right: RecallResult): number {
  if (left.score !== right.score) {
    return right.score - left.score
  }

  if (left.item.createdAt !== right.item.createdAt) {
    return right.item.createdAt.localeCompare(left.item.createdAt)
  }

  return left.item.id.localeCompare(right.item.id)
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function formatRank(rank: number): string {
  return Object.is(rank, -0) || Math.abs(rank) < 0.0005 ? '0.000' : rank.toFixed(3)
}
