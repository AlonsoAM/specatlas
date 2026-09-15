import path from 'node:path'
import { listDir, parseFrontmatter, readText, readTextIfExists, sha256 } from '@specatlas/core'

export interface PhaseSource {
  id: string
  title: string
  description: string
  body: string
  requires: string[]
  produces: string[]
  acceptsArguments: boolean
  path: string
}

export interface WorkflowSources {
  phases: PhaseSource[]
  snippets: Map<string, string>
  sourceHash: string
}

export async function loadWorkflow(workflowDir: string): Promise<WorkflowSources> {
  const phasesDir = path.join(workflowDir, 'phases')
  const snippetsDir = path.join(workflowDir, 'snippets')
  const phases: PhaseSource[] = []
  const snippets = new Map<string, string>()
  const hashParts: string[] = []

  for (const entry of (await listDir(phasesDir)).sort()) {
    if (!entry.endsWith('.md')) continue
    const filePath = path.join(phasesDir, entry)
    const raw = await readText(filePath)
    hashParts.push(raw)
    const fm = parseFrontmatter(raw, filePath)
    const data = fm.data
    const id = typeof data['id'] === 'string' ? data['id'] : path.basename(entry, '.md')
    phases.push({
      id,
      title: typeof data['title'] === 'string' ? data['title'] : id,
      description: typeof data['description'] === 'string' ? data['description'].replace(/\s+/g, ' ').trim() : id,
      body: fm.body.trim(),
      requires: Array.isArray(data['requires']) ? (data['requires'] as string[]) : [],
      produces: Array.isArray(data['produces']) ? (data['produces'] as string[]) : [],
      acceptsArguments: data['arguments'] === true,
      path: filePath,
    })
  }

  for (const entry of (await listDir(snippetsDir)).sort()) {
    if (!entry.endsWith('.md')) continue
    const raw = (await readTextIfExists(path.join(snippetsDir, entry))) ?? ''
    hashParts.push(raw)
    snippets.set(path.basename(entry, '.md'), raw.trim())
  }

  return { phases: phases.sort((a, b) => a.id.localeCompare(b.id)), snippets, sourceHash: sha256(hashParts.join('\n---\n')) }
}

export interface RenderVars {
  SLUG: string
  LANGUAGE: string
  LANGUAGE_NAME: string
  SDD_DIR: string
  COMMAND_PREFIX: string
}

export function renderPhase(body: string, snippets: Map<string, string>, vars: RenderVars): string {
  let text = body
  const includeRe = /\{\{>([a-z0-9-]+)\}\}/g
  let guard = 0
  while (includeRe.test(text) && guard < 10) {
    guard += 1
    text = text.replace(includeRe, (_m, name: string) => snippets.get(name) ?? `<!-- snippet ${name} no encontrado -->`)
  }
  return text
    .replace(/\{\{SLUG\}\}/g, vars.SLUG)
    .replace(/\{\{LANGUAGE\}\}/g, vars.LANGUAGE)
    .replace(/\{\{LANGUAGE_NAME\}\}/g, vars.LANGUAGE_NAME)
    .replace(/\{\{SDD_DIR\}\}/g, vars.SDD_DIR)
    .replace(/\{\{COMMAND_PREFIX\}\}/g, vars.COMMAND_PREFIX)
    .trim()
}
