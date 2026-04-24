import type { ContextBundle, MemoryRuntime, SessionSummaryArtifact } from '../../runtime/src/index.ts'

export interface OpenCodeContextRequest {
  projectId: string
  prompt: string
  taskId?: string
  maxItems?: number
  maxChars?: number
}

export interface OpenCodeAdapter {
  buildInjection(request: OpenCodeContextRequest): ContextBundle
  buildPromptDocument(
    request: OpenCodeContextRequest,
    options?: OpenCodePromptOptions
  ): OpenCodePromptDocument
}

export interface OpenCodePromptOptions {
  handoff?: SessionSummaryArtifact
  instructions?: string[]
}

export interface OpenCodePromptDocument {
  title: string
  text: string
  bundle: ContextBundle
  handoffPath?: string
}

export function createOpenCodeAdapter(runtime: MemoryRuntime): OpenCodeAdapter {
  const buildInjection = (request: OpenCodeContextRequest): ContextBundle => {
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

  return {
    buildInjection,
    buildPromptDocument(request, options = {}) {
      const bundle = buildInjection(request)
      const sections: string[] = [
        '# OpenCode Memory Injection',
        '',
        '## Task Prompt',
        request.prompt,
        '',
        '## Memory Context Bundle',
        bundle.text
      ]

      if ((options.instructions ?? []).length > 0) {
        sections.push('', '## Instructions', ...(options.instructions ?? []).map(instruction => `- ${instruction}`))
      }

      if (options.handoff !== undefined) {
        sections.push('', '## Handoff Summary', options.handoff.markdown)

        if (options.handoff.artifactPath !== undefined) {
          sections.push('', `Artifact path: ${options.handoff.artifactPath}`)
        }
      }

      return {
        title:
          request.taskId === undefined
            ? 'OpenCode Memory Injection'
            : `OpenCode Memory Injection: ${request.taskId}`,
        text: sections.join('\n'),
        bundle,
        handoffPath: options.handoff?.artifactPath
      }
    }
  }
}
