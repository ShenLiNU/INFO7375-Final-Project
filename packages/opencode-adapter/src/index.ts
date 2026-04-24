import type { ContextBundle, MemoryRuntime } from '../../runtime/src/index.ts'

export interface OpenCodeContextRequest {
  projectId: string
  prompt: string
  taskId?: string
  maxItems?: number
  maxChars?: number
}

export interface OpenCodeAdapter {
  buildInjection(request: OpenCodeContextRequest): ContextBundle
}

export function createOpenCodeAdapter(runtime: MemoryRuntime): OpenCodeAdapter {
  return {
    buildInjection(request) {
      return runtime.buildContextBundle(
        {
          projectId: request.projectId,
          taskId: request.taskId,
          text: request.prompt,
          limit: request.maxItems
        },
        {
          maxItems: request.maxItems,
          maxChars: request.maxChars
        }
      )
    }
  }
}
