import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { prepareOpenCodeScenario, readScenarioDocument, readScenarioValidationRules } from './opencode-scenario.ts'

interface ChildProcessModule {
  spawn(command: string, args: string[], options: SpawnOptions): SpawnProcess
}

interface SpawnOptions {
  cwd: string
}

interface SpawnStream {
  on(event: 'data', listener: (chunk: unknown) => void): void
}

interface SpawnProcess {
  pid?: number
  stdin: { end(): void } | null
  stdout: SpawnStream | null
  stderr: SpawnStream | null
  exitCode: number | null
  killed: boolean
  kill(): void
  on(event: 'exit', listener: (code: number | null) => void): void
}

interface ValidationRecord {
  scenarioId: string
  promptFilePath: string
  recallLogPath: string
  recallMetricsPath: string
  memorySnapshotPath: string
  prunePlanPath: string
  latestSummaryPath: string
  handoffFilePath?: string
  runCommandExample: string
  output: string
  matchedExpectedRecall: string[]
  allExpectedRecallMatched: boolean
  exactOutputMatched: boolean
  timestamp: string
}

const childProcessModuleName = 'node:child_process'
const childProcessModule: unknown = await import(childProcessModuleName)
const { spawn } = readChildProcessModule(childProcessModule)

const scenarioId = process.argv[2]
const portArg = process.argv[3]

if (scenarioId === undefined) {
  throw new Error('A scenario id is required. Example: node evaluation/validate-opencode-scenario.ts interrupted-task 4097')
}

const port = portArg === undefined ? 4096 : Number.parseInt(portArg, 10)
if (!Number.isFinite(port)) {
  throw new Error(`Invalid port: ${portArg}`)
}

const baseUrl = `http://127.0.0.1:${port}`
const preparation = await prepareOpenCodeScenario(scenarioId)
const scenario = readScenarioDocument(scenarioId)
const outputRoot = preparation.outputRoot
const serverLogPath = join(outputRoot, 'server.log')
const serverErrorLogPath = join(outputRoot, 'server.err.log')
const validationRecordPath = join(outputRoot, 'validation-result.json')
const validationFailurePath = join(outputRoot, 'validation-error.txt')

mkdirSync(outputRoot, { recursive: true })

const opencodeExecutable = readOpencodeExecutable()
const server = spawnOpencode(['serve', '--pure', '--port', `${port}`])
server.stdin?.end()

let serverStdout = ''
let serverStderr = ''

server.stdout?.on('data', chunk => {
  serverStdout += chunkToString(chunk)
})

server.stderr?.on('data', chunk => {
  serverStderr += chunkToString(chunk)
})

try {
  await waitForServerReady(baseUrl, 30000)
  await ensureSpawnedServerHealthy(server, serverStderr, baseUrl)
  const output = await runOpencodeAttach(baseUrl, preparation.promptFilePath)
  const normalizedOutput = output.trim()
  const validationRules = readScenarioValidationRules(scenarioId)
  const matchedExpectedRecall = scenario.expectedRecall.filter(expected => normalizedOutput.includes(expected))
  const exactOutputMatched = matchesScenarioOutput(normalizedOutput, scenario.expectedRecall, validationRules)
  const allExpectedRecallMatched = matchedExpectedRecall.length === scenario.expectedRecall.length && exactOutputMatched

  const record: ValidationRecord = {
    scenarioId,
    promptFilePath: preparation.promptFilePath,
    recallLogPath: preparation.recallLogPath,
    recallMetricsPath: preparation.recallMetricsPath,
    memorySnapshotPath: preparation.memorySnapshotPath,
    prunePlanPath: preparation.prunePlanPath,
    latestSummaryPath: preparation.latestSummaryPath,
    handoffFilePath: preparation.handoffFilePath,
    runCommandExample: buildValidationCommandExample(baseUrl, preparation.promptFilePath),
    output: normalizedOutput,
    matchedExpectedRecall,
    allExpectedRecallMatched,
    exactOutputMatched,
    timestamp: new Date().toISOString()
  }

  writeFileSync(serverLogPath, serverStdout, 'utf8')
  writeFileSync(serverErrorLogPath, serverStderr, 'utf8')
  writeFileSync(validationRecordPath, JSON.stringify(record, null, 2), 'utf8')
  if (!record.allExpectedRecallMatched) {
    writeFileSync(validationFailurePath, JSON.stringify(record, null, 2), 'utf8')
    throw new Error(`Scenario validation failed for ${scenarioId}: output did not satisfy expected recall rules.`)
  }

  console.log(JSON.stringify(record, null, 2))
  rmSync(validationFailurePath, { recursive: false, force: true })
} catch (error) {
  writeFileSync(serverLogPath, serverStdout, 'utf8')
  writeFileSync(serverErrorLogPath, serverStderr, 'utf8')
  const message = error instanceof Error ? error.message : String(error)
  writeFileSync(validationFailurePath, message, 'utf8')
  throw error
} finally {
  await stopProcess(server)
}

async function runOpencodeAttach(baseUrl: string, promptFilePath: string): Promise<string> {
  const runProcess = spawnOpencode([
    'run',
    '--pure',
    '--attach',
    baseUrl,
    '--dir',
    process.cwd(),
    '-f',
    promptFilePath,
    '--dangerously-skip-permissions',
    'Read the attached prompt and follow its output instructions exactly.'
  ])
  runProcess.stdin?.end()

  let stdout = ''
  let stderr = ''

  runProcess.stdout?.on('data', chunk => {
    stdout += chunkToString(chunk)
  })

  runProcess.stderr?.on('data', chunk => {
    stderr += chunkToString(chunk)
  })

  const exitCode = await waitForExit(runProcess)
  if (exitCode !== 0) {
    throw new Error(`OpenCode run failed with exit code ${exitCode}: ${stderr.trim()}`)
  }

  return stdout
}

function spawnOpencode(args: string[]): SpawnProcess {
  return spawn(opencodeExecutable, args, {
    cwd: process.cwd()
  })
}

function readOpencodeExecutable(): string {
  const fromEnv = readEnvVar('OPENCODE_BIN')
  return fromEnv ?? 'opencode'
}

function buildValidationCommandExample(baseUrl: string, promptFilePath: string): string {
  return `opencode run --pure --attach ${baseUrl} --dir "${process.cwd()}" -f "${promptFilePath}" --dangerously-skip-permissions "Read the attached prompt and follow its output instructions exactly."`
}

function readEnvVar(name: string): string | undefined {
  if (!isRecord(process.env)) {
    return undefined
  }

  const value = process.env[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function matchesScenarioOutput(
  output: string,
  expectedRecall: string[],
  rules: { expectedOutputMode: 'single-line-exact' | 'multi-line-exact' | 'ordered-sentences' }
): boolean {
  const normalizedOutput = normalizeOutput(output)

  if (rules.expectedOutputMode === 'single-line-exact') {
    return normalizedOutput === expectedRecall[0]
  }

  if (rules.expectedOutputMode === 'ordered-sentences') {
    return normalizeWhitespace(normalizedOutput) === normalizeWhitespace(expectedRecall.join(' '))
  }

  return normalizedOutput === expectedRecall.join('\n')
}

function normalizeOutput(output: string): string {
  return output.replace(/\r\n/g, '\n').trim()
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

async function waitForServerReady(baseUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/doc`)
      if (response.ok) {
        return
      }
    } catch {
      // Retry until the timeout window closes.
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for OpenCode server at ${baseUrl}`)
}

async function ensureSpawnedServerHealthy(
  server: SpawnProcess,
  serverStderr: string,
  baseUrl: string
): Promise<void> {
  await delay(250)

  if (server.exitCode !== null) {
    throw new Error(`OpenCode server exited early for ${baseUrl}: ${serverStderr.trim()}`)
  }

  if (serverStderr.includes('Failed to start server on port')) {
    throw new Error(`OpenCode server failed to start for ${baseUrl}: ${serverStderr.trim()}`)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

function waitForExit(process: SpawnProcess): Promise<number | null> {
  return new Promise(resolve => {
    process.on('exit', code => {
      resolve(code)
    })
  })
}

async function stopProcess(process: SpawnProcess): Promise<void> {
  if (process.killed || process.exitCode !== null) {
    return
  }

  if (globalThis.process.platform === 'win32' && process.pid !== undefined) {
    const taskkill = spawn('taskkill', ['/PID', `${process.pid}`, '/T', '/F'], {
      cwd: globalThis.process.cwd()
    })
    taskkill.stdin?.end()
    await waitForExit(taskkill)
    return
  }

  process.kill()
  await Promise.race([waitForExit(process), delay(2000)])
}

function chunkToString(chunk: unknown): string {
  return typeof chunk === 'string' ? chunk : String(chunk)
}

function readChildProcessModule(value: unknown): ChildProcessModule {
  if (!isRecord(value)) {
    throw new Error('node:child_process module shape is invalid')
  }

  const spawnValue = value.spawn
  if (typeof spawnValue !== 'function') {
    throw new Error('node:child_process is missing spawn')
  }

  return {
    spawn(command, args, options) {
      return spawnValue(command, args, options) as SpawnProcess
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
