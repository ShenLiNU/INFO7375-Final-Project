import type { ContextAssemblyOptions, ContextBundle, MemoryItem, RecallResult } from './models.ts'

const DEFAULT_MAX_ITEMS = 8
const DEFAULT_MAX_CHARS = 4000

export function buildContextBundle(
  results: RecallResult[],
  options: ContextAssemblyOptions = {}
): ContextBundle {
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS
  let includedResults: RecallResult[] = []
  let text = renderEmptyContextText(maxChars)

  for (const result of results) {
    if (includedResults.length >= maxItems) {
      break
    }

    const candidateResults = [...includedResults, result]
    const candidateSections = partitionMemoryItems(candidateResults)
    const candidateText = renderContextText(
      candidateSections.durableFacts,
      candidateSections.workingMemory
    )

    if (candidateText.length > maxChars) {
      continue
    }

    includedResults = candidateResults
    text = candidateText
  }

  const { durableFacts, workingMemory } = partitionMemoryItems(includedResults)

  if (text.length > maxChars) {
    includedResults = []
    text = renderEmptyContextText(maxChars)
  }

  return {
    durableFacts,
    workingMemory,
    includedResults,
    omittedCount: results.length - includedResults.length,
    text,
    budget: {
      maxItems,
      maxChars,
      usedChars: text.length
    }
  }
}

function partitionMemoryItems(results: RecallResult[]): {
  durableFacts: MemoryItem[]
  workingMemory: MemoryItem[]
} {
  const items = results.map(result => result.item)

  return {
    durableFacts: items.filter(item => item.kind === 'project-fact'),
    workingMemory: items.filter(item => item.kind !== 'project-fact')
  }
}

function renderContextText(durableFacts: MemoryItem[], workingMemory: MemoryItem[]): string {
  const sections: string[] = ['# Memory Context Bundle']

  sections.push('## Durable Project Facts')
  sections.push(renderSection(durableFacts))

  sections.push('## Working Memory')
  sections.push(renderSection(workingMemory))

  return sections.join('\n\n')
}

function renderEmptyContextText(maxChars: number): string {
  const fullEmptyText = renderContextText([], [])
  if (fullEmptyText.length <= maxChars) {
    return fullEmptyText
  }

  const minimalHeader = '# Memory Context Bundle'
  if (minimalHeader.length <= maxChars) {
    return minimalHeader
  }

  return minimalHeader.slice(0, Math.max(maxChars, 0))
}

function renderSection(items: MemoryItem[]): string {
  if (items.length === 0) {
    return '- None recalled.'
  }

  return items.map(renderMemoryItem).join('\n')
}

function renderMemoryItem(item: MemoryItem): string {
  const scope = item.taskId === undefined ? item.projectId : `${item.projectId}/${item.taskId}`
  const tags = item.tags.length > 0 ? ` tags=${item.tags.join(',')}` : ''
  return `- [${item.kind}] (${scope}) ${item.text}${tags}`
}
