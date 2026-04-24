import { buildContextBundle } from './context-assembly.ts'
import type { ContextAssemblyOptions, ContextBundle, MemoryInput, RecallQuery, RecallResult, RuntimeOptions } from './models.ts'
import { recallMemory } from './retrieval.ts'
import { MemoryStorage } from './storage.ts'

export class MemoryRuntime {
  #storage: MemoryStorage

  constructor(options: RuntimeOptions) {
    this.#storage = new MemoryStorage(options.databasePath)
  }

  remember(input: MemoryInput) {
    return this.#storage.remember(input)
  }

  recall(query: RecallQuery): RecallResult[] {
    return recallMemory(this.#storage, query)
  }

  buildContextBundle(query: RecallQuery, options: ContextAssemblyOptions = {}): ContextBundle {
    return buildContextBundle(this.recall(query), options)
  }

  close(): void {
    this.#storage.close()
  }
}
