export type MemoryKind = 'project-fact' | 'task-memory' | 'decision-memory' | 'session-summary'

export interface MemoryInput {
  projectId: string
  kind: MemoryKind
  text: string
  taskId?: string
  tags?: string[]
  source?: string
  createdAt?: string
  supersedes?: string[]
}

export interface MemoryItem {
  id: string
  projectId: string
  kind: MemoryKind
  text: string
  taskId?: string
  tags: string[]
  source?: string
  createdAt: string
  updatedAt: string
  reinforcementCount: number
  supersededBy?: string
  supersededAt?: string
}

export interface RecallQuery {
  projectId?: string
  taskId?: string
  text?: string
  tags?: string[]
  kinds?: MemoryKind[]
  limit?: number
  includeSuperseded?: boolean
}

export interface RecallResult {
  item: MemoryItem
  score: number
  reasons: string[]
}

export interface RecallLogCandidate {
  memoryId: string
  kind: MemoryKind
  projectId: string
  taskId?: string
  score: number
  reasons: string[]
  included: boolean
  textPreview: string
  reinforcementCount: number
  supersededBy?: string
  supersededAt?: string
}

export interface RecallLog {
  generatedAt: string
  query: RecallQuery
  candidateCount: number
  includedMemoryIds: string[]
  omittedMemoryIds: string[]
  supersededMemoryIds: string[]
  candidates: RecallLogCandidate[]
  budget: {
    maxItems: number
    maxChars: number
    usedChars: number
  }
}

export interface ContextAssemblyOptions {
  maxItems?: number
  maxChars?: number
}

export interface ContextBundle {
  durableFacts: MemoryItem[]
  workingMemory: MemoryItem[]
  includedResults: RecallResult[]
  omittedCount: number
  text: string
  budget: {
    maxItems: number
    maxChars: number
    usedChars: number
  }
  recallLog?: RecallLog
}

export interface SessionSummaryInput {
  projectId: string
  summary: string
  queryText: string
  taskId?: string
  nextActions?: string[]
  artifactDirectory?: string
  maxItems?: number
  maxChars?: number
}

export interface SessionSummaryArtifact {
  memory: MemoryItem
  bundle: ContextBundle
  markdown: string
  artifactPath?: string
}

export interface MemoryStatsByKind {
  total: number
  active: number
  superseded: number
  reinforcedItems: number
  reinforcementEvents: number
}

export interface MemoryStats {
  total: number
  active: number
  superseded: number
  reinforcedItems: number
  reinforcementEvents: number
  byKind: Record<MemoryKind, MemoryStatsByKind>
}

export interface MemoryExportSnapshot {
  schemaVersion: 1
  exportedAt: string
  memories: MemoryItem[]
}

export interface MemoryPruneCandidate {
  memoryId: string
  kind: MemoryKind
  projectId: string
  taskId?: string
  reasons: string[]
  textPreview: string
}

export interface MemoryPrunePlan {
  generatedAt: string
  projectId?: string
  targetActiveItems?: number
  activeCount: number
  pruneCount: number
  candidates: MemoryPruneCandidate[]
}

export interface MemoryPruneOptions {
  projectId?: string
  targetActiveItems?: number
  includeSuperseded?: boolean
}

export interface RecallEvaluationMetrics {
  expectedCount: number
  matchedExpectedCount: number
  candidateCount: number
  includedCount: number
  omittedCount: number
  supersededCount: number
  unexpectedIncludedCount: number
  budgetUsedChars: number
  budgetMaxChars: number
}

export interface RuntimeOptions {
  databasePath: string
}
