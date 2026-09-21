import type { FlatDiagnostic, Snapshot, SnapshotDrift } from '../logic.js'
import { asList, TONE } from './now.js'

/**
 * Vista «Salud»: todo lo que el flujo tiene que decir, agrupado por qué hay que
 * hacer con ello — lo que bloquea, lo que avisa y la deriva del código — en vez
 * de un volcado plano de hallazgos.
 */
export interface HealthNode {
  id: string
  label: string
  description?: string
  tooltip?: string
  icon: string
  tone?: string
  command?: { command: string; args: unknown[] }
  contextValue?: string
  children?: HealthNode[]
  expanded?: boolean
}

function shortPath(file: string): string {
  const parts = file.replace(/\\/g, '/').split('/')
  return parts.slice(-2).join('/')
}

function diagnosticNode(diagnostic: FlatDiagnostic, index: number): HealthNode {
  return {
    id: `health.${diagnostic.code}.${index}`,
    label: diagnostic.message,
    description: `${diagnostic.code} · ${shortPath(diagnostic.file)}${diagnostic.line > 0 ? `:${diagnostic.line}` : ''}`,
    tooltip: [`**${diagnostic.code}**`, '', diagnostic.message, diagnostic.suggestion ? `\n_${diagnostic.suggestion}_` : '', '', 'Clic para abrir · clic derecho para explicar el código.'].join('\n'),
    icon: diagnostic.severity === 'error' ? 'error' : diagnostic.severity === 'warning' ? 'warning' : 'info',
    tone: diagnostic.severity === 'error' ? TONE.red : diagnostic.severity === 'warning' ? TONE.yellow : TONE.blue,
    command: { command: 'specatlas.openAt', args: [diagnostic.file, diagnostic.line] },
    contextValue: `healthDiagnostic:${diagnostic.code}`,
  }
}

const DRIFT_LABEL: Record<string, string> = {
  'missing-file': 'el archivo ya no existe',
  'missing-symbol': 'el símbolo ya no está',
}

export function buildHealth(input: Snapshot | Snapshot[] | undefined): HealthNode[] {
  const snapshots = asList(input)
  if (snapshots.length === 0) return []

  // Con varias carpetas abiertas, la salud es la del workspace entero.
  const drift: SnapshotDrift = snapshots.reduce<SnapshotDrift>(
    (total, snapshot) => {
      const own = snapshot.drift
      if (!own) return total
      return {
        mode: own.mode === 'strict' ? 'strict' : total.mode,
        domains: total.domains + own.domains,
        checked: total.checked + own.checked,
        broken: [...total.broken, ...own.broken],
      }
    },
    { mode: 'advisory', domains: 0, checked: 0, broken: [] },
  )
  const diagnostics = snapshots.flatMap((snapshot) => snapshot.diagnostics)
  const errors = diagnostics.filter((item) => item.severity === 'error')
  const warnings = diagnostics.filter((item) => item.severity === 'warning')
  const nodes: HealthNode[] = []

  if (errors.length === 0 && warnings.length === 0 && drift.broken.length === 0) {
    nodes.push({
      id: 'health.ok',
      label: 'Todo en orden',
      description: drift.checked > 0 ? `${drift.checked} anclas comprobadas` : 'sin hallazgos',
      icon: 'pass-filled',
      tone: TONE.green,
      tooltip: 'Especificación, trazabilidad, tareas y anclas coinciden con lo que dice el proyecto.',
    })
    return nodes
  }

  if (errors.length > 0) {
    nodes.push({
      id: 'health.errors',
      label: 'Bloquean el avance',
      description: `${errors.length}`,
      icon: 'error',
      tone: TONE.red,
      expanded: true,
      tooltip: 'Hallazgos que detienen la fase actual hasta resolverse.',
      children: errors.map((item, index) => diagnosticNode(item, index)),
    })
  }

  if (warnings.length > 0) {
    nodes.push({
      id: 'health.warnings',
      label: 'Avisan, no detienen',
      description: `${warnings.length}`,
      icon: 'warning',
      tone: TONE.yellow,
      expanded: errors.length === 0,
      tooltip: 'Deuda declarada: no bloquea, pero conviene cerrarla antes de archivar.',
      children: warnings.map((item, index) => diagnosticNode(item, index + errors.length)),
    })
  }

  if (drift.broken.length > 0) {
    nodes.push({
      id: 'health.drift',
      label: 'El código se movió bajo las specs',
      description: `${drift.broken.length} ancla(s)`,
      icon: 'compass-dot',
      tone: drift.mode === 'strict' ? TONE.red : TONE.orange,
      expanded: false,
      tooltip: [
        '**Deriva de anclas** — las specs vivas dicen dónde vive cada requisito y ahí ya no está.',
        '',
        `Modo \`ci.drift\`: ${drift.mode === 'strict' ? 'estricto (bloquea la comprobación continua)' : 'aviso'}.`,
        '',
        'Si solo cambió la ruta, `SpecAtlas: Depurar anclas rotas`. Si cambió el comportamiento, especifícalo con un cambio.',
      ].join('\n'),
      children: drift.broken.map((item, index) => ({
        id: `health.drift.${index}`,
        label: item.anchor,
        description: `${item.requirement} · ${DRIFT_LABEL[item.kind] ?? item.kind}`,
        icon: item.kind === 'missing-file' ? 'file-symlink-file' : 'symbol-method',
        tone: TONE.orange,
        tooltip: `**${item.requirement}** (dominio \`${item.domain}\`)\n\n${DRIFT_LABEL[item.kind] ?? item.kind}: \`${item.anchor}\``,
        command: { command: 'specatlas.drift', args: [] },
        contextValue: 'healthDrift',
      })),
    })
  } else if (drift.checked > 0) {
    nodes.push({
      id: 'health.drift.ok',
      label: 'Anclas al día',
      description: `${drift.checked} comprobadas · ${drift.domains} dominio(s)`,
      icon: 'compass',
      tone: TONE.green,
      tooltip: 'Cada requisito de las specs vivas sigue existiendo donde dice el proyecto.',
      command: { command: 'specatlas.drift', args: [] },
    })
  }

  return nodes
}

/** Conteo para el badge de la barra de actividad: lo que de verdad detiene. */
export function healthBadge(input: Snapshot | Snapshot[] | undefined): number {
  return asList(input)
    .flatMap((snapshot) => snapshot.diagnostics)
    .filter((item) => item.severity === 'error').length
}
