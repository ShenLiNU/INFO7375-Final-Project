import type { MemoryInput, MemoryItem, MemoryKind } from './models.ts'

export interface MemoryListFilters {
  projectId?: string
  taskId?: string
  kinds?: MemoryKind[]
}

type SqlValue = string | number | null

interface SqliteStatement {
  run(...parameters: SqlValue[]): unknown
  all(...parameters: SqlValue[]): unknown[]
}

interface SqliteDatabase {
  prepare(sql: string): SqliteStatement
  exec(sql: string): void
  close(): void
}

interface SqliteDatabaseConstructor {
  new(databasePath: string): SqliteDatabase
}

interface FsModule {
  mkdirSync(path: string, options: { recursive: boolean }): void
}

interface PathModule {
  dirname(path: string): string
}

const sqliteModuleName = 'node:sqlite'
const fsModuleName = 'node:fs'
const pathModuleName = 'node:path'
const sqliteModule: unknown = await import(sqliteModuleName)
const fsModule: unknown = await import(fsModuleName)
const pathModule: unknown = await import(pathModuleName)
const DatabaseSync = readDatabaseSync(sqliteModule)
const { mkdirSync } = readFsModule(fsModule)
const { dirname } = readPathModule(pathModule)

export class MemoryStorage {
  #database: SqliteDatabase

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true })
    this.#database = new DatabaseSync(databasePath)
    this.#initialize()
  }

  remember(input: MemoryInput): MemoryItem {
    const item: MemoryItem = {
      id: globalThis.crypto.randomUUID(),
      projectId: input.projectId,
      kind: input.kind,
      text: input.text,
      taskId: input.taskId,
      tags: input.tags ?? [],
      source: input.source,
      createdAt: input.createdAt ?? new Date().toISOString()
    }

    this.#database.prepare(`
      INSERT INTO memory_items (
        id, project_id, task_id, kind, text, tags_json, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.projectId,
      item.taskId ?? null,
      item.kind,
      item.text,
      JSON.stringify(item.tags),
      item.source ?? null,
      item.createdAt
    )

    return item
  }

  list(filters: MemoryListFilters = {}): MemoryItem[] {
    const clauses: string[] = []
    const parameters: SqlValue[] = []

    if (filters.projectId !== undefined) {
      clauses.push('project_id = ?')
      parameters.push(filters.projectId)
    }

    if (filters.taskId !== undefined) {
      clauses.push('(task_id = ? OR task_id IS NULL)')
      parameters.push(filters.taskId)
    }

    if (filters.kinds !== undefined && filters.kinds.length > 0) {
      const placeholders = filters.kinds.map(() => '?').join(', ')
      clauses.push(`kind IN (${placeholders})`)
      parameters.push(...filters.kinds)
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = this.#database.prepare(`
      SELECT id, project_id, task_id, kind, text, tags_json, source, created_at
      FROM memory_items
      ${whereClause}
      ORDER BY created_at DESC, id ASC
    `).all(...parameters)

    return rows.map(rowToMemoryItem)
  }

  close(): void {
    this.#database.close()
  }

  #initialize(): void {
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS memory_items (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        task_id TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('project-fact', 'task-memory', 'session-summary')),
        text TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memory_items_project_task
        ON memory_items(project_id, task_id);

      CREATE INDEX IF NOT EXISTS idx_memory_items_kind
        ON memory_items(kind);
    `)
  }
}

function rowToMemoryItem(row: unknown): MemoryItem {
  if (!isRecord(row)) {
    throw new Error('SQLite returned an invalid memory row')
  }

  const id = readString(row, 'id')
  const projectId = readString(row, 'project_id')
  const kind = readMemoryKind(row, 'kind')
  const text = readString(row, 'text')
  const tags = readTags(row)
  const createdAt = readString(row, 'created_at')
  const taskId = readOptionalString(row, 'task_id')
  const source = readOptionalString(row, 'source')

  return {
    id,
    projectId,
    kind,
    text,
    taskId,
    tags,
    source,
    createdAt
  }
}

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  if (typeof value !== 'string') {
    throw new Error(`SQLite row field ${key} must be a string`)
  }

  return value
}

function readOptionalString(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key]
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new Error(`SQLite row field ${key} must be a string when present`)
  }

  return value
}

function readMemoryKind(row: Record<string, unknown>, key: string): MemoryKind {
  const value = readString(row, key)
  if (!isMemoryKind(value)) {
    throw new Error(`SQLite row field ${key} contains an unknown memory kind`)
  }

  return value
}

function readTags(row: Record<string, unknown>): string[] {
  const rawTags = readString(row, 'tags_json')
  const parsedTags: unknown = JSON.parse(rawTags)

  if (!isStringArray(parsedTags)) {
    throw new Error('SQLite row field tags_json must decode to string[]')
  }

  return parsedTags
}

function isMemoryKind(value: string): value is MemoryKind {
  return value === 'project-fact' || value === 'task-memory' || value === 'session-summary'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function readDatabaseSync(moduleValue: unknown): SqliteDatabaseConstructor {
  if (!isRecord(moduleValue)) {
    throw new Error('node:sqlite did not load as an object')
  }

  const constructor = moduleValue.DatabaseSync
  if (typeof constructor !== 'function') {
    throw new Error('node:sqlite is missing DatabaseSync')
  }

  return constructor as SqliteDatabaseConstructor
}

function readFsModule(moduleValue: unknown): FsModule {
  if (!isRecord(moduleValue)) {
    throw new Error('node:fs did not load as an object')
  }

  const mkdirSyncValue = moduleValue.mkdirSync
  if (typeof mkdirSyncValue !== 'function') {
    throw new Error('node:fs is missing mkdirSync')
  }

  return {
    mkdirSync(path, options) {
      mkdirSyncValue(path, options)
    }
  }
}

function readPathModule(moduleValue: unknown): PathModule {
  if (!isRecord(moduleValue)) {
    throw new Error('node:path did not load as an object')
  }

  const dirnameValue = moduleValue.dirname
  if (typeof dirnameValue !== 'function') {
    throw new Error('node:path is missing dirname')
  }

  return {
    dirname(path) {
      const resolvedPath = dirnameValue(path)
      if (typeof resolvedPath !== 'string') {
        throw new Error('node:path dirname returned a non-string value')
      }

      return resolvedPath
    }
  }
}
