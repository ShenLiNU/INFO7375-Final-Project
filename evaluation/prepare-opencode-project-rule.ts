import { prepareOpenCodeScenario } from './opencode-scenario.ts'

const result = await prepareOpenCodeScenario('project-rule')
console.log(JSON.stringify(result, null, 2))
