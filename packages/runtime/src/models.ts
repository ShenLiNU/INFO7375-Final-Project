export type MemoryKind = 'project-fact' | 'task-memory' | 'session-summary'

export interface MemoryInput {
  projectId: string
  kind: MemoryKind
  text: string
  taskId?: string
  tags?: string[]
  source?: string
  createdAt?: string
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
}

export interface RecallQuery {
  projectId?: string
  taskId?: string
  text?: string
  tags?: string[]
  kinds?: MemoryKind[]
  limit?: number
}

export interface RecallResult {
  item: MemoryItem
  score: number
  reasons: string[]
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
}

export interface RuntimeOptions {
  databasePath: string
}
