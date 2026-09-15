import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exists } from '@specatlas/core'

export async function resolveProfilesDir(): Promise<string | undefined> {
  const env = process.env['SPECATLAS_PROFILES_DIR']
  if (env && (await exists(env))) return env
  return walkUpFor('profiles')
}

export async function resolveWorkflowDir(): Promise<string | undefined> {
  const env = process.env['SPECATLAS_WORKFLOW_DIR']
  if (env && (await exists(env))) return env
  return walkUpFor(path.join('workflow', 'phases'))
}

async function walkUpFor(relative: string): Promise<string | undefined> {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, relative)
    if (await exists(candidate)) {
      return relative.includes(path.sep) ? path.dirname(candidate) : candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}
