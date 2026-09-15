import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CORE_VERSION } from '@specatlas/core'

let cached: string | undefined

export function cliVersion(): string {
  if (cached) return cached
  try {
    const packageJson = fileURLToPath(new URL('../package.json', import.meta.url))
    const parsed = JSON.parse(readFileSync(packageJson, 'utf8')) as { version?: unknown }
    cached = typeof parsed.version === 'string' ? parsed.version : CORE_VERSION
  } catch {
    cached = CORE_VERSION
  }
  return cached
}
