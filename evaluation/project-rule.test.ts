import { runProjectRuleEvaluation } from './project-rule.ts'

interface AssertStrict {
  equal(actual: unknown, expected: unknown, message?: string): void
  ok(value: unknown, message?: string): void
  match(actual: string, expected: RegExp, message?: string): void
}

interface AssertModule {
  strict: AssertStrict
}

interface TestModule {
  default(name: string, fn: () => Promise<void> | void): void
}

const assertModuleName = 'node:assert'
const testModuleName = 'node:test'

const assertModule: unknown = await import(assertModuleName)
const testModule: unknown = await import(testModuleName)

const assert = readAssertModule(assertModule).strict
const test = readTestModule(testModule).default

test('project-rule evaluation shows memory-assisted improvement over baseline', async () => {
  const report = await runProjectRuleEvaluation()

  assert.equal(report.scenarioId, 'project-rule')
  assert.equal(report.baseline.matchedExpectedRecall.length, 0)
  assert.equal(report.memoryAssisted.matchedExpectedRecall.length, 1)
  assert.ok(report.checks.baselineMissedAllExpectedRecall)
  assert.ok(report.checks.memoryAssistedMatchedExpectedRecall)
  assert.ok(report.checks.memoryAssistedBundleIsBounded)
  assert.match(report.memoryAssisted.bundleText, /Durable Project Facts/)
  assert.match(report.memoryAssisted.bundleText, /Do not modify tmp reference repositories/)
  assert.equal(report.memoryAssisted.recallLog?.candidateCount, 1)
  assert.equal(report.memoryAssisted.recallLog?.includedMemoryIds.length, 1)
  assert.equal(report.memoryAssisted.recallLog?.candidates[0]?.reinforcementCount, 2)
  assert.ok(report.memoryAssisted.recallLog?.candidates[0]?.reasons.includes('reinforced:2'))
  assert.equal(report.memoryAssisted.metrics.expectedCount, 1)
  assert.equal(report.memoryAssisted.metrics.matchedExpectedCount, 1)
  assert.equal(report.memoryAssisted.metrics.unexpectedIncludedCount, 0)
  assert.equal(report.baseline.metrics.matchedExpectedCount, 0)
})

function readAssertModule(value: unknown): AssertModule {
  if (!isRecord(value) || !isRecord(value.strict)) {
    throw new Error('node:assert module shape is invalid')
  }

  const strict = value.strict
  const equal = readFunction(strict, 'equal')
  const ok = readFunction(strict, 'ok')
  const match = readFunction(strict, 'match')

  return {
    strict: {
      equal(actual, expected, message) {
        equal(actual, expected, message)
      },
      ok(actual, message) {
        ok(actual, message)
      },
      match(actual, expected, message) {
        match(actual, expected, message)
      }
    }
  }
}

function readTestModule(value: unknown): TestModule {
  if (!isRecord(value)) {
    throw new Error('node:test module shape is invalid')
  }

  const runTest = readFunction(value, 'default')

  return {
    default(name, fn) {
      runTest(name, fn)
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
  return (typeof value === 'object' || typeof value === 'function') && value !== null
}
