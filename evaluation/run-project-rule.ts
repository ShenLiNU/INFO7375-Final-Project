import { runProjectRuleEvaluation } from './project-rule.ts'

const report = await runProjectRuleEvaluation()
console.log(JSON.stringify(report, null, 2))
