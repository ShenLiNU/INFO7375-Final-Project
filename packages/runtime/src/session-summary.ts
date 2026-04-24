import type { ContextBundle, MemoryItem, SessionSummaryArtifact, SessionSummaryInput } from './models.ts'

interface FsPromisesModule {
  mkdir(path: string, options: { recursive: boolean }): Promise<void>
  writeFile(path: string, content: string, encoding: string): Promise<void>
}

interface PathModule {
  join(...paths: string[]): string
}

const fsPromisesModuleName = 'node:fs/promises'
const pathModuleName = 'node:path'

const fsPromisesModule: unknown = await import(fsPromisesModuleName)
const pathModule: unknown = await import(pathModuleName)

const { mkdir, writeFile } = readFsPromisesModule(fsPromisesModule)
const { join } = readPathModule(pathModule)

export async function finalizeSessionSummaryArtifact(
  input: SessionSummaryInput,
  memory: MemoryItem,
  bundle: ContextBundle,
  heading: string
): Promise<SessionSummaryArtifact> {
  const markdown = renderSessionSummaryMarkdown(input, bundle, heading)
  const artifactPath = await writeArtifactIfRequested(input, markdown)

  return {
    memory,
    bundle,
    markdown,
    artifactPath
  }
}

function renderSessionSummaryMarkdown(
  input: SessionSummaryInput,
  bundle: ContextBundle,
  heading: string
): string {
  const sections: string[] = [
    `# ${heading}`,
    `- Project: ${input.projectId}`,
    `- Task: ${input.taskId ?? 'none'}`,
    '',
    '## Summary',
    input.summary,
    '',
    '## Query Context',
    input.queryText,
    '',
    '## Recalled Bundle',
    bundle.text
  ]

  if ((input.nextActions ?? []).length > 0) {
    sections.push('', '## Next Actions', ...(input.nextActions ?? []).map(action => `- ${action}`))
  }

  return sections.join('\n')
}

async function writeArtifactIfRequested(
  input: SessionSummaryInput,
  markdown: string
): Promise<string | undefined> {
  if (input.artifactDirectory === undefined) {
    return undefined
  }

  const artifactDirectory = join(input.artifactDirectory, 'handoffs')
  await mkdir(artifactDirectory, { recursive: true })

  const taskSegment = sanitizeFileSegment(input.taskId ?? 'general')
  const timestampSegment = new Date().toISOString().replace(/[.:]/g, '-')
  const artifactPath = join(artifactDirectory, `${taskSegment}-${timestampSegment}.md`)

  await writeFile(artifactPath, markdown, 'utf8')
  return artifactPath
}

function sanitizeFileSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return normalized.length > 0 ? normalized : 'general'
}

function readFsPromisesModule(value: unknown): FsPromisesModule {
  if (!isRecord(value)) {
    throw new Error('node:fs/promises module shape is invalid')
  }

  const mkdirValue = readFunction(value, 'mkdir')
  const writeFileValue = readFunction(value, 'writeFile')

  return {
    mkdir(path, options) {
      return mkdirValue(path, options) as Promise<void>
    },
    writeFile(path, content, encoding) {
      return writeFileValue(path, content, encoding) as Promise<void>
    }
  }
}

function readPathModule(value: unknown): PathModule {
  if (!isRecord(value)) {
    throw new Error('node:path module shape is invalid')
  }

  const joinValue = readFunction(value, 'join')

  return {
    join(...paths) {
      return joinValue(...paths) as string
    }
  }
}

function readFunction(record: Record<string, unknown>, key: string): (...args: unknown[]) => unknown {
  const value = record[key]
  if (typeof value !== 'function') {
    throw new Error(`Expected ${key} to be callable`)
  }

  return value as (...args: unknown[]) => unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
