import path from 'node:path'
import type { Snapshot, SnapshotChange } from '../logic.js'
import { asList } from './now.js'

/**
 * Qué artefacto del flujo es un archivo abierto en el editor, para que el panel
 * lateral siga al trabajo en vez de quedarse donde lo dejaste.
 */
export interface ArtifactRef {
  change: SnapshotChange
  snapshot: Snapshot
  kind: string
}

function normalize(file: string): string {
  return file.replace(/\\/g, '/').toLowerCase()
}

const KINDS: Array<{ file: string; kind: string }> = [
  { file: 'spec.md', kind: 'spec' },
  { file: 'proposal.md', kind: 'proposal' },
  { file: 'plan.md', kind: 'plan' },
  { file: 'tasks.md', kind: 'tasks' },
  { file: 'verify.md', kind: 'verify' },
  { file: 'review.md', kind: 'review' },
  { file: 'fix.md', kind: 'fix' },
  { file: 'clarify.md', kind: 'clarify' },
  { file: 'analyze.md', kind: 'analyze' },
  { file: 'meta.yaml', kind: 'meta' },
]

/** El cambio al que pertenece el archivo abierto, si es uno de sus artefactos. */
export function changeForFile(input: Snapshot | Snapshot[] | undefined, file: string | undefined): ArtifactRef | undefined {
  if (!file) return undefined
  const target = normalize(file)
  for (const snapshot of asList(input)) {
    for (const change of snapshot.changes) {
      const dir = `${normalize(change.dir)}/`
      if (!target.startsWith(dir)) continue
      const rest = target.slice(dir.length)
      const match = KINDS.find((entry) => rest === entry.file || rest.endsWith(`/${entry.file}`))
      return { change, snapshot, kind: match?.kind ?? (rest.startsWith('docs/') ? 'docs' : rest.startsWith('mockups/') ? 'mockup' : 'otro') }
    }
  }
  return undefined
}

export interface FileBadge {
  /** Uno o dos caracteres: es lo que VS Code pinta junto al archivo. */
  badge: string
  tooltip: string
  /** Color temático de VS Code. */
  color?: string
  propagate: boolean
}

const STATE_BADGE: Record<string, { badge: string; label: string; color?: string }> = {
  paused: { badge: '⏸', label: 'pausado', color: 'charts.yellow' },
  spec_draft: { badge: '✎', label: 'spec en borrador', color: 'charts.orange' },
  draft: { badge: '✎', label: 'borrador', color: 'charts.foreground' },
  awaiting_mockups: { badge: '◧', label: 'esperando mockups', color: 'charts.purple' },
  awaiting_approval: { badge: '✍', label: 'esperando aprobación', color: 'charts.purple' },
  approved: { badge: '▷', label: 'aprobado', color: 'charts.blue' },
  building: { badge: '⚒', label: 'construyendo', color: 'charts.blue' },
  built: { badge: '⚗', label: 'construido', color: 'charts.yellow' },
  verified: { badge: '✓', label: 'verificado', color: 'charts.green' },
  reviewed: { badge: '✓', label: 'revisado', color: 'charts.green' },
  ready: { badge: '★', label: 'listo para archivar', color: 'charts.green' },
}

/**
 * Decoración de un archivo de `.sdd/`: lo que bloquea manda sobre el estado,
 * para que un error se vea sin abrir nada.
 */
export function fileBadge(input: Snapshot | Snapshot[] | undefined, file: string | undefined): FileBadge | undefined {
  if (!file) return undefined
  const target = normalize(file)
  const snapshots = asList(input)

  const findings = snapshots.flatMap((snapshot) => snapshot.diagnostics).filter((item) => normalize(item.file) === target)
  const errors = findings.filter((item) => item.severity === 'error').length
  const warnings = findings.filter((item) => item.severity === 'warning').length
  if (errors > 0) {
    return { badge: errors > 9 ? '9+' : String(errors), tooltip: `${errors} hallazgo(s) que bloquean`, color: 'charts.red', propagate: true }
  }
  if (warnings > 0) {
    return { badge: warnings > 9 ? '9+' : String(warnings), tooltip: `${warnings} aviso(s)`, color: 'charts.yellow', propagate: false }
  }

  const ref = changeForFile(snapshots, file)
  if (!ref) return undefined
  const state = STATE_BADGE[ref.change.state]
  if (!state) return undefined
  return {
    badge: state.badge,
    tooltip: `${ref.change.slug} — ${state.label}`,
    ...(state.color !== undefined ? { color: state.color } : {}),
    propagate: false,
  }
}

/** Ruta del tasks.md de un cambio (donde se marca una tarea como hecha). */
export function tasksPath(change: SnapshotChange): string {
  return path.join(change.dir, 'tasks.md')
}

/**
 * Marca o desmarca una tarea en el markdown sin tocar nada más de la línea.
 * Devuelve el contenido nuevo, o undefined si la tarea no está donde se dijo.
 */
export function toggleTaskLine(content: string, line: number, done: boolean): string | undefined {
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r?\n/)
  const index = line - 1
  const current = lines[index]
  if (current === undefined) return undefined
  const next = current.replace(/^(\s*-\s*\[)[ xX](\])/, (_match, start: string, end: string) => `${start}${done ? 'x' : ' '}${end}`)
  if (next === current) return undefined
  lines[index] = next
  return lines.join(eol)
}
