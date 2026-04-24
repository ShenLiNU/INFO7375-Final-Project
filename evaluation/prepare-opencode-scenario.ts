import { prepareOpenCodeScenario } from './opencode-scenario.ts'

const scenarioId = process.argv[2]

if (scenarioId === undefined) {
  throw new Error('A scenario id is required. Example: node evaluation/prepare-opencode-scenario.ts interrupted-task')
}

const result = await prepareOpenCodeScenario(scenarioId)
console.log(JSON.stringify(result, null, 2))
