import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exists, readTextIfExists } from '@specatlas/core'

async function isSourceRepoRoot(dir: string): Promise<boolean> {
  if (!(await exists(path.join(dir, 'pnpm-workspace.yaml')))) return false
  const raw = await readTextIfExists(path.join(dir, 'packages', 'cli', 'package.json'))
  if (raw === undefined) return false
  try {
    return (JSON.parse(raw) as { name?: unknown }).name === 'specatlas'
  } catch {
    return false
  }
}

async function sourceRepoRoot(startDir: string): Promise<string | undefined> {
  let dir = startDir
  for (let i = 0; i < 5; i += 1) {
    if (await isSourceRepoRoot(dir)) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

async function resolveFromSource(relative: string): Promise<string | undefined> {
  const start = path.dirname(fileURLToPath(import.meta.url))
  const root = await sourceRepoRoot(start)
  if (!root) return undefined
  const candidate = path.join(root, relative)
  return (await exists(candidate)) ? candidate : undefined
}

export async function resolveProfilesDir(): Promise<string | undefined> {
  const env = process.env['SPECATLAS_PROFILES_DIR']
  if (env && (await exists(env))) return env
  return (await resolveFromSource('profiles')) ?? walkUpFor('profiles')
}

export async function resolveWorkflowDir(): Promise<string | undefined> {
  const env = process.env['SPECATLAS_WORKFLOW_DIR']
  if (env && (await exists(env))) return env
  return (await resolveFromSource('workflow')) ?? walkUpFor(path.join('workflow', 'phases'))
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
