import path from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { z } from 'zod'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, listDirs, readTextIfExists, toPosix, writeText } from './fsx.js'
import type { Delta, Language, TasksFile } from './model.js'
import { localDate } from './time.js'

export const ANCHORS_FILE = 'anchors.yaml'

/**
 * Dónde vive en el código cada requisito de una spec viva. Vive fuera de
 * `spec.md` a propósito: la especificación es de negocio (Artículo 3) y no
 * nombra archivos. El ancla es el puente entre ese lenguaje y el repositorio.
 */
export interface RequirementAnchor {
  requirement: string
  /** Rutas relativas a la raíz del proyecto; `ruta#simbolo` ancla también un símbolo. */
  files: string[]
  updated?: string
  source?: 'archive' | 'manual'
}

export interface AnchorsFile {
  path: string
  domain: string
  schemaVersion: number
  anchors: RequirementAnchor[]
  diagnostics: Diagnostic[]
}

const anchorsSchema = z.object({
  schema_version: z.number().int().positive().default(1),
  anchors: z
    .array(
      z.object({
        requirement: z.string().min(1),
        files: z.array(z.string().min(1)).default([]),
        updated: z.string().optional(),
        source: z.enum(['archive', 'manual']).optional(),
      }),
    )
    .default([]),
})

export function anchorsPath(root: string, domain: string): string {
  return path.join(path.resolve(root), '.sdd', 'specs', domain, ANCHORS_FILE)
}

/** Separa `ruta#simbolo` en sus dos partes. */
export function splitAnchor(anchor: string): { file: string; symbol?: string } {
  const index = anchor.indexOf('#')
  if (index < 0) return { file: anchor.trim() }
  const file = anchor.slice(0, index).trim()
  const symbol = anchor.slice(index + 1).trim()
  return symbol.length > 0 ? { file, symbol } : { file }
}

export function parseAnchors(raw: string, filePath: string, domain: string): AnchorsFile {
  const empty: AnchorsFile = { path: filePath, domain, schemaVersion: 1, anchors: [], diagnostics: [] }
  let data: unknown
  try {
    data = parseYaml(raw)
  } catch (err) {
    return { ...empty, diagnostics: [diag('ATLAS-ANCHOR-001', 'error', `anchors.yaml inválido: ${(err as Error).message}`, { path: filePath })] }
  }
  if (data === null || data === undefined) return empty
  const parsed = anchorsSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ...empty,
      diagnostics: parsed.error.issues.map((issue) =>
        diag('ATLAS-ANCHOR-001', 'error', `anchors.yaml (${issue.path.join('.') || 'raíz'}): ${issue.message}`, { path: filePath }),
      ),
    }
  }
  return {
    path: filePath,
    domain,
    schemaVersion: parsed.data.schema_version,
    anchors: parsed.data.anchors.map((entry) => {
      const anchor: RequirementAnchor = { requirement: entry.requirement.toUpperCase(), files: entry.files.map((file) => toPosix(file.trim())) }
      if (entry.updated !== undefined) anchor.updated = entry.updated
      if (entry.source !== undefined) anchor.source = entry.source
      return anchor
    }),
    diagnostics: [],
  }
}

export async function loadAnchors(root: string, domain: string): Promise<AnchorsFile> {
  const file = anchorsPath(root, domain)
  const raw = await readTextIfExists(file)
  if (raw === undefined) return { path: file, domain, schemaVersion: 1, anchors: [], diagnostics: [] }
  return parseAnchors(raw, file, domain)
}

/** Todas las anclas del workspace, una entrada por dominio con spec viva. */
export async function loadAllAnchors(root: string): Promise<AnchorsFile[]> {
  const specsDir = path.join(path.resolve(root), '.sdd', 'specs')
  if (!(await exists(specsDir))) return []
  const out: AnchorsFile[] = []
  for (const domain of await listDirs(specsDir)) {
    const anchors = await loadAnchors(root, domain)
    if (anchors.anchors.length > 0 || anchors.diagnostics.length > 0) out.push(anchors)
  }
  return out
}

export function anchorsToYaml(anchors: RequirementAnchor[], language: Language = 'es'): string {
  const es = language !== 'en'
  const header = es
    ? '# Anclas de implementación: dónde vive en el código cada requisito de esta spec.\n' +
      '# Lo mantiene `satlas archive` con los archivos que declaran las tareas; puedes editarlo a mano.\n' +
      '# `satlas drift` avisa cuando un ancla ya no existe en el código.\n\n'
    : '# Implementation anchors: where each requirement of this spec lives in the code.\n' +
      '# Maintained by `satlas archive` from the files declared by tasks; hand edits are welcome.\n' +
      '# `satlas drift` reports anchors that no longer exist in the code.\n\n'
  const doc = {
    schema_version: 1,
    anchors: [...anchors]
      .sort((a, b) => a.requirement.localeCompare(b.requirement))
      .map((anchor) => ({
        requirement: anchor.requirement,
        files: [...anchor.files].sort(),
        ...(anchor.updated !== undefined ? { updated: anchor.updated } : {}),
        ...(anchor.source !== undefined ? { source: anchor.source } : {}),
      })),
  }
  return header + stringifyYaml(doc, { lineWidth: 120 })
}

export async function writeAnchors(root: string, domain: string, anchors: RequirementAnchor[], language: Language = 'es'): Promise<string> {
  const file = anchorsPath(root, domain)
  await writeText(file, anchorsToYaml(anchors, language))
  return file
}

/**
 * Funde las anclas nuevas con las existentes: lo escrito a mano se conserva,
 * y un requisito que vuelve a tocarse suma sus archivos sin duplicarlos.
 */
export function mergeAnchors(current: RequirementAnchor[], incoming: RequirementAnchor[]): RequirementAnchor[] {
  const byRequirement = new Map<string, RequirementAnchor>()
  for (const anchor of current) byRequirement.set(anchor.requirement, { ...anchor, files: [...anchor.files] })
  for (const anchor of incoming) {
    const existing = byRequirement.get(anchor.requirement)
    if (!existing) {
      byRequirement.set(anchor.requirement, { ...anchor, files: [...new Set(anchor.files)] })
      continue
    }
    const files = new Set([...existing.files, ...anchor.files])
    const merged: RequirementAnchor = { requirement: existing.requirement, files: [...files] }
    if (anchor.updated !== undefined) merged.updated = anchor.updated
    // Una entrada tocada a mano no se degrada a automática.
    merged.source = existing.source === 'manual' ? 'manual' : (anchor.source ?? existing.source ?? 'archive')
    byRequirement.set(existing.requirement, merged)
  }
  return [...byRequirement.values()].filter((anchor) => anchor.files.length > 0)
}

/**
 * Deriva las anclas del cambio: cada requisito hereda los archivos de las
 * tareas que cubren sus escenarios (requisito → escenario → tarea → archivo).
 */
/**
 * Los artefactos del propio proceso (`.sdd/**`) no son anclas: viven con el
 * cambio y se mueven al histórico al archivar. El ancla apunta al código.
 */
function isCodeFile(file: string): boolean {
  const clean = toPosix(file).replace(/^\.\//, '')
  return clean.length > 0 && !clean.startsWith('.sdd/')
}

export function anchorsFromTasks(delta: Delta, tasks: TasksFile | undefined, now?: Date): RequirementAnchor[] {
  if (!tasks) return []
  const requirements = [...delta.added, ...delta.modified]
  if (requirements.length === 0) return []

  const filesByScenario = new Map<string, Set<string>>()
  for (const block of tasks.blocks) {
    for (const task of block.tasks) {
      for (const scenario of task.covers) {
        const set = filesByScenario.get(scenario) ?? new Set<string>()
        for (const file of task.files) {
          const clean = toPosix(file.trim())
          if (isCodeFile(clean)) set.add(clean)
        }
        filesByScenario.set(scenario, set)
      }
    }
  }

  const updated = localDate(now)
  const out: RequirementAnchor[] = []
  for (const requirement of requirements) {
    const files = new Set<string>()
    for (const scenario of requirement.scenarios) {
      for (const file of filesByScenario.get(scenario.id) ?? []) files.add(file)
    }
    // Una tarea puede declarar el requisito entero en vez de un escenario.
    for (const file of filesByScenario.get(requirement.id) ?? []) files.add(file)
    if (files.size === 0) continue
    out.push({ requirement: requirement.id, files: [...files], updated, source: 'archive' })
  }
  return out
}
