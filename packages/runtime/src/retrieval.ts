import type { MemoryItem, RecallQuery, RecallResult } from './models.ts'
import type { MemoryStorage } from './storage.ts'

export function recallMemory(storage: MemoryStorage, query: RecallQuery): RecallResult[] {
  const tokens = tokenize(query.text ?? '')
  const requestedTags = new Set((query.tags ?? []).map(tag => normalize(tag)))
  const candidates = storage.list({
    projectId: query.projectId,
    taskId: query.taskId,
    kinds: query.kinds
  })

  const scored = candidates
    .map(item => scoreMemoryItem(item, tokens, requestedTags))
    .filter(result => result.score > 0 || (tokens.length === 0 && requestedTags.size === 0))
    .sort(compareRecallResults)

  return scored.slice(0, query.limit ?? 8)
}

function scoreMemoryItem(item: MemoryItem, tokens: string[], requestedTags: Set<string>): RecallResult {
  const reasons: string[] = []
  let score = 0

  const searchableText = `${item.text} ${item.tags.join(' ')}`
  const itemTokens = new Set(tokenize(searchableText))

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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map(token => token.trim())
    .filter(token => token.length >= 2)
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}
