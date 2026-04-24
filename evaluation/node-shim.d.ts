declare module 'node:fs' {
  export function mkdirSync(path: string, options: { recursive: boolean }): void
  export function readFileSync(path: string | URL, encoding: string): string
  export function rmSync(path: string, options: { recursive: boolean; force: boolean }): void
  export function writeFileSync(path: string, content: string, encoding: string): void
}

declare module 'node:path' {
  export function join(...paths: string[]): string
}

declare module 'node:child_process' {
  export function spawn(
    command: string,
    args: string[],
    options: { cwd: string }
  ): {
    stdin: { end(): void } | null
    stdout: { on(event: 'data', listener: (chunk: unknown) => void): void } | null
    stderr: { on(event: 'data', listener: (chunk: unknown) => void): void } | null
    exitCode: number | null
    killed: boolean
    kill(): void
    on(event: 'exit', listener: (code: number | null) => void): void
  }
}

declare const process: {
  argv: string[]
  cwd(): string
  env: Record<string, string | undefined>
}
