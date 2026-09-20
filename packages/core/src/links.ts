import path from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, isDirectory, listDirs, readTextIfExists, toPosix, writeText } from './fsx.js'
import { loadConfig } from './config.js'
import { parseSpecFile } from './parse/spec.js'
import type { LinkEntry, LinkStatus, LinksState, SpecRef } from './model.js'

export const LINKS_FILE = 'links.yaml'

interface LinksDocument {
  schema_version: number
  links: LinkEntry[]
}

function parseLinksDocument(raw: string, file: string): { document?: LinksDocument; diagnostics: Diagnostic[] } {
  let data: unknown
  try {
    data = parseYaml(raw)
  } catch (error) {
    return { diagnostics: [diag('ATLAS-LINK-001', 'error', `links.yaml ilegible: ${(error as Error).message}`, { path: file })] }
  }
  const doc = data as { schema_version?: unknown; links?: unknown } | null
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.links)) {
    return { diagnostics: [diag('ATLAS-LINK-001', 'error', 'links.yaml inválido: falta la lista de enlaces', { path: file })] }
  }
  const links: LinkEntry[] = []
  const diagnostics: Diagnostic[] = []
  for (const item of doc.links) {
    const entry = item as { name?: unknown; path?: unknown }
    if (typeof entry?.name !== 'string' || typeof entry?.path !== 'string' || entry.name.trim() === '' || entry.path.trim() === '') {
      diagnostics.push(diag('ATLAS-LINK-001', 'error', 'Enlace inválido en links.yaml: cada enlace necesita nombre y ruta', { path: file }))
      continue
    }
    links.push({ name: entry.name.trim(), path: entry.path.trim() })
  }
  return { document: { schema_version: typeof doc.schema_version === 'number' ? doc.schema_version : 1, links }, diagnostics }
}

async function readLinks(root: string): Promise<{ document: LinksDocument; file: string; diagnostics: Diagnostic[] }> {
  const file = path.join(root, '.sdd', LINKS_FILE)
  const raw = await readTextIfExists(file)
  if (raw === undefined) return { document: { schema_version: 1, links: [] }, file, diagnostics: [] }
  const parsed = parseLinksDocument(raw, file)
  return { document: parsed.document ?? { schema_version: 1, links: [] }, file, diagnostics: parsed.diagnostics }
}

async function writeLinks(root: string, document: LinksDocument): Promise<void> {
  const file = path.join(root, '.sdd', LINKS_FILE)
  const lines: string[] = ['# Enlaces a otros proyectos (specs compartidas en solo lectura). Generado por `satlas link`.', stringifyYaml(document, { lineWidth: 120 }).trimEnd(), '']
  await writeText(file, lines.join('\n'))
}

export function resolveLinkPath(root: string, linkPath: string): string {
  return path.isAbsolute(linkPath) ? path.normalize(linkPath) : path.resolve(root, linkPath)
}

async function linkedSpecs(absPath: string): Promise<SpecRef[]> {
  const specsDir = path.join(absPath, '.sdd', 'specs')
  const specs: SpecRef[] = []
  for (const domain of await listDirs(specsDir)) {
    const file = path.join(specsDir, domain, 'spec.md')
    const content = await readTextIfExists(file)
    if (content === undefined) continue
    specs.push({ domain, path: file, spec: parseSpecFile(content, file) })
  }
  return specs
}

export async function loadLinks(root: string): Promise<LinksState> {
  const { document, diagnostics } = await readLinks(root)
  const entries: LinkStatus[] = []
  const specs: SpecRef[] = []
  const unavailable: string[] = []
  for (const entry of document.links) {
    const abs = resolveLinkPath(root, entry.path)
    const sddDir = path.join(abs, '.sdd')
    const available = (await isDirectory(sddDir)) && (await isDirectory(path.join(sddDir, 'specs')))
    if (!available) {
      unavailable.push(entry.name)
      entries.push({ name: entry.name, path: abs, available: false, requirements: 0, domains: [], error: 'el enlace no está disponible' })
      continue
    }
    const linked = await linkedSpecs(abs)
    specs.push(...linked)
    entries.push({
      name: entry.name,
      path: abs,
      available: true,
      requirements: linked.reduce((total, spec) => total + spec.spec.requirements.length, 0),
      domains: linked.map((spec) => spec.domain),
    })
  }
  void diagnostics
  return { entries, specs, unavailable }
}

export interface AddLinkResult {
  entry?: LinkEntry
  diagnostics: Diagnostic[]
}

export async function addLink(root: string, opts: { path: string; name?: string }): Promise<AddLinkResult> {
  const abs = resolveLinkPath(root, opts.path)
  const sddDir = path.join(abs, '.sdd')
  if (!(await isDirectory(sddDir))) {
    return {
      diagnostics: [
        diag('ATLAS-LINK-002', 'error', `El enlace no es un proyecto inicializado: ${abs}`, {
          suggestion: 'Indica la ruta de un proyecto con su estado inicializado (satlas init)',
        }),
      ],
    }
  }
  const { document } = await readLinks(root)
  let name = opts.name?.trim()
  if (!name) {
    const linkedConfig = await loadConfig(sddDir)
    name = linkedConfig.config.project.name || path.basename(abs)
  }
  const entry: LinkEntry = { name, path: toPosix(abs) }
  const existing = document.links.findIndex((link) => link.name === name || resolveLinkPath(root, link.path) === abs)
  if (existing >= 0) document.links[existing] = entry
  else document.links.push(entry)
  await writeLinks(root, document)
  return { entry, diagnostics: [] }
}

export interface RemoveLinkResult {
  removed?: string
  diagnostics: Diagnostic[]
}

export async function removeLink(root: string, ref: string): Promise<RemoveLinkResult> {
  const { document } = await readLinks(root)
  const index = document.links.findIndex((link) => link.name === ref || link.path === ref || resolveLinkPath(root, link.path) === resolveLinkPath(root, ref))
  if (index < 0) {
    return {
      diagnostics: [diag('ATLAS-LINK-003', 'warning', `No existe un enlace "${ref}"`, { suggestion: 'Consulta los enlaces con `satlas link list`' })],
    }
  }
  const [removed] = document.links.splice(index, 1)
  await writeLinks(root, document)
  return { removed: removed?.name, diagnostics: [] }
}

export function linkedRequirementIds(state: LinksState | undefined): string[] {
  if (!state) return []
  const ids: string[] = []
  for (const spec of state.specs) {
    for (const requirement of spec.spec.requirements) ids.push(requirement.id)
  }
  return ids
}

export function linkedTraceInput(workspace: { links?: LinksState }): { ids: string[]; unavailable: string[] } | undefined {
  if (!workspace.links || workspace.links.entries.length === 0) return undefined
  return { ids: linkedRequirementIds(workspace.links), unavailable: workspace.links.unavailable }
}

export async function ensureLinksFile(root: string): Promise<void> {
  const file = path.join(root, '.sdd', LINKS_FILE)
  if (await exists(file)) return
  await writeLinks(root, { schema_version: 1, links: [] })
}
