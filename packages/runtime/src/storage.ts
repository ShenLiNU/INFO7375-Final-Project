import type { MemoryExportSnapshot, MemoryInput, MemoryItem, MemoryKind, MemoryStats, MemoryStatsByKind } from './models.ts'
import { tokenizeSearchText } from './text.ts'

export interface MemoryListFilters {
  projectId?: string
  taskId?: string
  kinds?: MemoryKind[]
  includeSuperseded?: boolean
}

export interface MemoryTextSearchFilters extends MemoryListFilters {
  text: string
  limit?: number
}

export interface MemoryTextSearchResult {
  memoryId: string
  rank: number
}

export interface MemoryStatsFilters {
  projectId?: string
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
  #textSearchAvailable = false

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true })
    this.#database = new DatabaseSync(databasePath)
    this.#initialize()
  }

  remember(input: MemoryInput): MemoryItem {
    const normalizedText = normalizeMemoryText(input.text)
    const duplicate = this.#findConsolidationCandidate(input, normalizedText)

    if (duplicate !== undefined) {
      const reinforced = this.#reinforceMemoryItem(duplicate, input)
      this.#markSuperseded(reinforced.id, input.supersedes ?? [], reinforced.updatedAt, reinforced.projectId)
      return reinforced
    }

    const createdAt = input.createdAt ?? new Date().toISOString()
    const item: MemoryItem = {
      id: globalThis.crypto.randomUUID(),
      projectId: input.projectId,
      kind: input.kind,
      text: input.text,
      taskId: input.taskId,
      tags: input.tags ?? [],
      source: input.source,
      createdAt,
      updatedAt: createdAt,
      reinforcementCount: 1
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

    this.#database.prepare(`
      INSERT INTO memory_consolidation (
        memory_id, normalized_text, reinforcement_count, updated_at
      ) VALUES (?, ?, ?, ?)
    `).run(item.id, normalizedText, item.reinforcementCount, item.updatedAt)

    this.#indexMemoryItem(item)
    this.#markSuperseded(item.id, input.supersedes ?? [], item.updatedAt, item.projectId)

    return item
  }

  list(filters: MemoryListFilters = {}): MemoryItem[] {
    const clauses: string[] = []
    const parameters: SqlValue[] = []

    if (filters.projectId !== undefined) {
      clauses.push('memory_items.project_id = ?')
      parameters.push(filters.projectId)
    }

    if (filters.taskId !== undefined) {
      clauses.push('(memory_items.task_id = ? OR memory_items.task_id IS NULL)')
      parameters.push(filters.taskId)
    }

    if (filters.kinds !== undefined && filters.kinds.length > 0) {
      const placeholders = filters.kinds.map(() => '?').join(', ')
      clauses.push(`memory_items.kind IN (${placeholders})`)
      parameters.push(...filters.kinds)
    }

    if (filters.includeSuperseded !== true) {
      clauses.push('memory_supersession.memory_id IS NULL')
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
      const rows = this.#database.prepare(`
      SELECT
        memory_items.id,
        memory_items.project_id,
        memory_items.task_id,
        memory_items.kind,
        memory_items.text,
        memory_items.tags_json,
        memory_items.source,
        memory_items.created_at,
        memory_consolidation.updated_at,
        memory_consolidation.reinforcement_count,
        memory_supersession.superseded_by,
        memory_supersession.superseded_at
      FROM memory_items
      JOIN memory_consolidation ON memory_consolidation.memory_id = memory_items.id
      LEFT JOIN memory_supersession ON memory_supersession.memory_id = memory_items.id
      ${whereClause}
      ORDER BY memory_consolidation.updated_at DESC, memory_items.id ASC
    `).all(...parameters)

    return rows.map(rowToMemoryItem)
  }

  searchText(filters: MemoryTextSearchFilters): MemoryTextSearchResult[] {
    if (!this.#textSearchAvailable) {
      return []
    }

    const ftsQuery = buildFtsQuery(filters.text)
    if (ftsQuery === undefined) {
      return []
    }

    const clauses = ['memory_items_fts MATCH ?']
    const parameters: SqlValue[] = [ftsQuery]

    if (filters.projectId !== undefined) {
      clauses.push('memory_items.project_id = ?')
      parameters.push(filters.projectId)
    }

    if (filters.taskId !== undefined) {
      clauses.push('(memory_items.task_id = ? OR memory_items.task_id IS NULL)')
      parameters.push(filters.taskId)
    }

    if (filters.kinds !== undefined && filters.kinds.length > 0) {
      const placeholders = filters.kinds.map(() => '?').join(', ')
      clauses.push(`memory_items.kind IN (${placeholders})`)
      parameters.push(...filters.kinds)
    }

    if (filters.includeSuperseded !== true) {
      clauses.push('memory_supersession.memory_id IS NULL')
    }

    parameters.push(filters.limit ?? 20)

    try {
      const rows = this.#database.prepare(`
        SELECT memory_items.id, bm25(memory_items_fts) AS rank
        FROM memory_items_fts
        JOIN memory_items ON memory_items.id = memory_items_fts.id
        LEFT JOIN memory_supersession ON memory_supersession.memory_id = memory_items.id
        WHERE ${clauses.join(' AND ')}
        ORDER BY rank ASC, memory_items.created_at DESC, memory_items.id ASC
        LIMIT ?
      `).all(...parameters)

      return rows.map(rowToTextSearchResult)
    } catch {
      return []
    }
  }

  stats(filters: MemoryStatsFilters = {}): MemoryStats {
    const clauses: string[] = []
    const parameters: SqlValue[] = []

    if (filters.projectId !== undefined) {
      clauses.push('memory_items.project_id = ?')
      parameters.push(filters.projectId)
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = this.#database.prepare(`
      SELECT
        memory_items.kind,
        COUNT(*) AS total,
        SUM(CASE WHEN memory_supersession.memory_id IS NULL THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN memory_supersession.memory_id IS NULL THEN 0 ELSE 1 END) AS superseded,
        SUM(CASE WHEN memory_consolidation.reinforcement_count > 1 THEN 1 ELSE 0 END) AS reinforced_items,
        SUM(memory_consolidation.reinforcement_count - 1) AS reinforcement_events
      FROM memory_items
      JOIN memory_consolidation ON memory_consolidation.memory_id = memory_items.id
      LEFT JOIN memory_supersession ON memory_supersession.memory_id = memory_items.id
      ${whereClause}
      GROUP BY memory_items.kind
    `).all(...parameters)

    return rows.reduce(addStatsRow, createMemoryStats())
  }

  exportSnapshot(): MemoryExportSnapshot {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      memories: this.list({ includeSuperseded: true })
    }
  }

  importSnapshot(snapshot: MemoryExportSnapshot): void {
    validateMemoryExportSnapshot(snapshot)

    for (const memory of snapshot.memories) {
      this.#database.prepare(`
        INSERT OR REPLACE INTO memory_items (
          id, project_id, task_id, kind, text, tags_json, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        memory.id,
        memory.projectId,
        memory.taskId ?? null,
        memory.kind,
        memory.text,
        JSON.stringify(memory.tags),
        memory.source ?? null,
        memory.createdAt
      )

      this.#database.prepare(`
        INSERT OR REPLACE INTO memory_consolidation (
          memory_id, normalized_text, reinforcement_count, updated_at
        ) VALUES (?, ?, ?, ?)
      `).run(memory.id, normalizeMemoryText(memory.text), memory.reinforcementCount, memory.updatedAt)

      if (memory.supersededBy !== undefined && memory.supersededAt !== undefined) {
        this.#database.prepare(`
          INSERT OR REPLACE INTO memory_supersession (memory_id, superseded_by, superseded_at)
          VALUES (?, ?, ?)
        `).run(memory.id, memory.supersededBy, memory.supersededAt)
      } else {
        this.#database.prepare('DELETE FROM memory_supersession WHERE memory_id = ?').run(memory.id)
      }

      this.#replaceTextSearchItem(memory)
    }
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
        kind TEXT NOT NULL CHECK (kind IN ('project-fact', 'task-memory', 'decision-memory', 'session-summary')),
        text TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL
      );
    `)

    this.#migrateMemoryKindConstraint()

    this.#database.exec(`

      CREATE INDEX IF NOT EXISTS idx_memory_items_project_task
        ON memory_items(project_id, task_id);

      CREATE INDEX IF NOT EXISTS idx_memory_items_kind
        ON memory_items(kind);

      CREATE TABLE IF NOT EXISTS memory_consolidation (
        memory_id TEXT PRIMARY KEY,
        normalized_text TEXT NOT NULL,
        reinforcement_count INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(memory_id) REFERENCES memory_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_memory_consolidation_key
        ON memory_consolidation(normalized_text);

      CREATE TABLE IF NOT EXISTS memory_supersession (
        memory_id TEXT PRIMARY KEY,
        superseded_by TEXT NOT NULL,
        superseded_at TEXT NOT NULL,
        FOREIGN KEY(memory_id) REFERENCES memory_items(id) ON DELETE CASCADE,
        FOREIGN KEY(superseded_by) REFERENCES memory_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_memory_supersession_replacement
        ON memory_supersession(superseded_by);
    `)

    this.#backfillConsolidationMetadata()

    this.#initializeTextSearch()
  }

  #migrateMemoryKindConstraint(): void {
    const rows = this.#database.prepare(`
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table' AND name = 'memory_items'
    `).all()
    const tableSql = rows.length === 0 ? undefined : readString(asRecord(rows[0]), 'sql')

    if (tableSql === undefined || tableSql.includes('decision-memory')) {
      return
    }

    this.#database.exec(`
      BEGIN TRANSACTION;

      ALTER TABLE memory_items RENAME TO memory_items_legacy;

      CREATE TABLE memory_items (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        task_id TEXT,
        kind TEXT NOT NULL CHECK (kind IN ('project-fact', 'task-memory', 'decision-memory', 'session-summary')),
        text TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL
      );

      INSERT INTO memory_items (
        id, project_id, task_id, kind, text, tags_json, source, created_at
      )
      SELECT id, project_id, task_id, kind, text, tags_json, source, created_at
      FROM memory_items_legacy;

      DROP TABLE memory_items_legacy;

      COMMIT;
    `)
  }

  #initializeTextSearch(): void {
    try {
      this.#database.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_items_fts
        USING fts5(id UNINDEXED, text, tags);

        DELETE FROM memory_items_fts;

        INSERT INTO memory_items_fts (id, text, tags)
        SELECT id, text, tags_json FROM memory_items;
      `)
      this.#textSearchAvailable = true
    } catch {
      this.#textSearchAvailable = false
    }
  }

  #indexMemoryItem(item: MemoryItem): void {
    if (!this.#textSearchAvailable) {
      return
    }

    try {
      this.#database.prepare(`
        INSERT INTO memory_items_fts (id, text, tags)
        VALUES (?, ?, ?)
      `).run(item.id, item.text, JSON.stringify(item.tags))
    } catch {
      this.#textSearchAvailable = false
    }
  }

  #findConsolidationCandidate(input: MemoryInput, normalizedText: string): MemoryItem | undefined {
    if (input.kind === 'session-summary') {
      return undefined
    }

    const rows = this.#database.prepare(`
      SELECT
        memory_items.id,
        memory_items.project_id,
        memory_items.task_id,
        memory_items.kind,
        memory_items.text,
        memory_items.tags_json,
        memory_items.source,
        memory_items.created_at,
        memory_consolidation.updated_at,
        memory_consolidation.reinforcement_count,
        memory_supersession.superseded_by,
        memory_supersession.superseded_at
      FROM memory_items
      JOIN memory_consolidation ON memory_consolidation.memory_id = memory_items.id
      LEFT JOIN memory_supersession ON memory_supersession.memory_id = memory_items.id
      WHERE memory_items.project_id = ?
        AND memory_items.kind = ?
        AND ((memory_items.task_id = ?) OR (memory_items.task_id IS NULL AND ? IS NULL))
        AND memory_consolidation.normalized_text = ?
        AND memory_supersession.memory_id IS NULL
      ORDER BY memory_consolidation.updated_at DESC, memory_items.id ASC
      LIMIT 1
    `).all(input.projectId, input.kind, input.taskId ?? null, input.taskId ?? null, normalizedText)

    return rows.length === 0 ? undefined : rowToMemoryItem(rows[0])
  }

  #reinforceMemoryItem(existing: MemoryItem, input: MemoryInput): MemoryItem {
    const updatedAt = input.createdAt ?? new Date().toISOString()
    const tags = mergeTags(existing.tags, input.tags ?? [])
    const source = mergeSource(existing.source, input.source)
    const reinforcementCount = existing.reinforcementCount + 1

    this.#database.prepare(`
      UPDATE memory_items
      SET tags_json = ?, source = ?
      WHERE id = ?
    `).run(JSON.stringify(tags), source ?? null, existing.id)

    this.#database.prepare(`
      UPDATE memory_consolidation
      SET reinforcement_count = ?, updated_at = ?
      WHERE memory_id = ?
    `).run(reinforcementCount, updatedAt, existing.id)

    const reinforced: MemoryItem = {
      ...existing,
      tags,
      source,
      updatedAt,
      reinforcementCount
    }

    this.#replaceTextSearchItem(reinforced)

    return reinforced
  }

  #replaceTextSearchItem(item: MemoryItem): void {
    if (!this.#textSearchAvailable) {
      return
    }

    try {
      this.#database.prepare('DELETE FROM memory_items_fts WHERE id = ?').run(item.id)
      this.#indexMemoryItem(item)
    } catch {
      this.#textSearchAvailable = false
    }
  }

  #backfillConsolidationMetadata(): void {
    this.#database.exec(`
      INSERT OR IGNORE INTO memory_consolidation (
        memory_id, normalized_text, reinforcement_count, updated_at
      )
      SELECT id, lower(trim(text)), 1, created_at
      FROM memory_items;
    `)
  }

  #markSuperseded(replacementId: string, supersededIds: string[], supersededAt: string, projectId: string): void {
    const uniqueIds = [...new Set(supersededIds)].filter(id => id !== replacementId)
    if (uniqueIds.length === 0) {
      return
    }

    const placeholders = uniqueIds.map(() => '?').join(', ')
    this.#database.prepare(`
      INSERT OR REPLACE INTO memory_supersession (memory_id, superseded_by, superseded_at)
      SELECT id, ?, ?
      FROM memory_items
      WHERE project_id = ? AND id IN (${placeholders})
    `).run(replacementId, supersededAt, projectId, ...uniqueIds)
  }
}

function buildFtsQuery(text: string): string | undefined {
  const tokens = tokenizeSearchText(text).slice(0, 8)

  if (tokens.length === 0) {
    return undefined
  }

  return tokens.map(token => `"${token.replace(/"/g, '""')}"`).join(' OR ')
}

function rowToTextSearchResult(row: unknown): MemoryTextSearchResult {
  const record = asRecord(row)

  return {
    memoryId: readString(record, 'id'),
    rank: readNumber(record, 'rank')
  }
}

function rowToMemoryItem(row: unknown): MemoryItem {
  const record = asRecord(row)

  const id = readString(record, 'id')
  const projectId = readString(record, 'project_id')
  const kind = readMemoryKind(record, 'kind')
  const text = readString(record, 'text')
  const tags = readTags(record)
  const createdAt = readString(record, 'created_at')
  const updatedAt = readString(record, 'updated_at')
  const reinforcementCount = readNumber(record, 'reinforcement_count')
  const supersededBy = readOptionalString(record, 'superseded_by')
  const supersededAt = readOptionalString(record, 'superseded_at')
  const taskId = readOptionalString(record, 'task_id')
  const source = readOptionalString(record, 'source')

  return {
    id,
    projectId,
    kind,
    text,
    taskId,
    tags,
    source,
    createdAt,
    updatedAt,
    reinforcementCount,
    supersededBy,
    supersededAt
  }
}

function addStatsRow(stats: MemoryStats, row: unknown): MemoryStats {
  const record = asRecord(row)
  const kind = readMemoryKind(record, 'kind')
  const byKind = {
    total: readNumber(record, 'total'),
    active: readNumber(record, 'active'),
    superseded: readNumber(record, 'superseded'),
    reinforcedItems: readNumber(record, 'reinforced_items'),
    reinforcementEvents: readNumber(record, 'reinforcement_events')
  }

  stats.byKind[kind] = byKind
  stats.total += byKind.total
  stats.active += byKind.active
  stats.superseded += byKind.superseded
  stats.reinforcedItems += byKind.reinforcedItems
  stats.reinforcementEvents += byKind.reinforcementEvents

  return stats
}

function createMemoryStats(): MemoryStats {
  return {
    total: 0,
    active: 0,
    superseded: 0,
    reinforcedItems: 0,
    reinforcementEvents: 0,
    byKind: {
      'project-fact': createMemoryStatsByKind(),
      'task-memory': createMemoryStatsByKind(),
      'decision-memory': createMemoryStatsByKind(),
      'session-summary': createMemoryStatsByKind()
    }
  }
}

function createMemoryStatsByKind(): MemoryStatsByKind {
  return {
    total: 0,
    active: 0,
    superseded: 0,
    reinforcedItems: 0,
    reinforcementEvents: 0
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

function readNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key]
  if (typeof value !== 'number') {
    throw new Error(`SQLite row field ${key} must be a number`)
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

function validateMemoryExportSnapshot(snapshot: MemoryExportSnapshot): void {
  if (snapshot.schemaVersion !== 1) {
    throw new Error(`Unsupported memory snapshot schema version: ${snapshot.schemaVersion}`)
  }

  if (typeof snapshot.exportedAt !== 'string' || Number.isNaN(Date.parse(snapshot.exportedAt))) {
    throw new Error('Memory snapshot exportedAt must be an ISO timestamp')
  }

  const memoryIds = new Set<string>()
  for (const memory of snapshot.memories) {
    validateSnapshotMemory(memory)
    if (memoryIds.has(memory.id)) {
      throw new Error(`Memory snapshot contains a duplicate memory id: ${memory.id}`)
    }

    memoryIds.add(memory.id)
  }

  for (const memory of snapshot.memories) {
    if (memory.supersededBy !== undefined && !memoryIds.has(memory.supersededBy)) {
      throw new Error(`Memory snapshot supersededBy references a missing memory id: ${memory.supersededBy}`)
    }
  }
}

function validateSnapshotMemory(memory: MemoryItem): void {
  if (memory.id.trim().length === 0) {
    throw new Error('Memory snapshot item id must be non-empty')
  }

  if (memory.projectId.trim().length === 0) {
    throw new Error('Memory snapshot item projectId must be non-empty')
  }

  if (!isMemoryKind(memory.kind)) {
    throw new Error(`Memory snapshot item contains an unknown kind: ${String(memory.kind)}`)
  }

  if (memory.text.trim().length === 0) {
    throw new Error('Memory snapshot item text must be non-empty')
  }

  if (!isStringArray(memory.tags)) {
    throw new Error('Memory snapshot item tags must be string[]')
  }

  if (!Number.isInteger(memory.reinforcementCount) || memory.reinforcementCount < 1) {
    throw new Error('Memory snapshot item reinforcementCount must be a positive integer')
  }

  if (Number.isNaN(Date.parse(memory.createdAt)) || Number.isNaN(Date.parse(memory.updatedAt))) {
    throw new Error('Memory snapshot item timestamps must be valid ISO timestamps')
  }

  if ((memory.supersededBy === undefined) !== (memory.supersededAt === undefined)) {
    throw new Error('Memory snapshot item supersession fields must be paired')
  }
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
  return value === 'project-fact' || value === 'task-memory' || value === 'decision-memory' || value === 'session-summary'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error('SQLite returned an invalid row')
  }

  return value
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function normalizeMemoryText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function mergeTags(left: string[], right: string[]): string[] {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const tag of [...left, ...right]) {
    const normalized = tag.trim().toLowerCase()
    if (normalized.length === 0 || seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    merged.push(tag)
  }

  return merged
}

function mergeSource(left: string | undefined, right: string | undefined): string | undefined {
  if (left === undefined) {
    return right
  }

  if (right === undefined || left === right) {
    return left
  }

  return `${left},${right}`
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
