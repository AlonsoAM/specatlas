import { laneOf, resolveCommand, stepsForLane, buildStepStates, type ActionStepState } from '../actions.js'
import type { Snapshot, SnapshotChange } from '../logic.js'
import { sortChanges } from '../logic.js'

/**
 * Vista «Ahora»: lo primero que se ve al abrir el editor. Responde a una sola
 * pregunta — qué toca hacer — y deja la acción a un clic.
 */
export interface NowNode {
  id: string
  label: string
  description?: string
  tooltip?: string
  icon: string
  tone?: string
  command?: { command: string; args: unknown[] }
  contextValue?: string
  children?: NowNode[]
  expanded?: boolean
}

export const TONE = {
  blue: 'charts.blue',
  green: 'charts.green',
  yellow: 'charts.yellow',
  orange: 'charts.orange',
  red: 'charts.red',
  purple: 'charts.purple',
  gray: 'charts.foreground',
} as const

const ACTOR_ICON: Record<ActionStepState['actor'], string> = { agent: 'sparkle', human: 'account', local: 'terminal' }
const ACTOR_LABEL: Record<ActionStepState['actor'], string> = { agent: 'con agente', human: 'humana', local: 'local' }

export function progressBar(done: number, total: number): string {
  if (total <= 0) return '—'
  const filled = Math.max(0, Math.min(8, Math.round((done / total) * 8)))
  return `${'▰'.repeat(filled)}${'▱'.repeat(8 - filled)} ${done}/${total}`
}

/** Un workspace puede tener varias carpetas; cada una trae su propio estado. */
export function asList(input: Snapshot | Snapshot[] | undefined): Snapshot[] {
  if (!input) return []
  return Array.isArray(input) ? input : [input]
}

/** Los cambios en curso de todo el workspace, con el proyecto al que pertenecen. */
export function activeChanges(input: Snapshot | Snapshot[] | undefined): Array<{ change: SnapshotChange; snapshot: Snapshot }> {
  const pairs = asList(input).flatMap((snapshot) =>
    snapshot.changes.filter((change) => change.state !== 'archived').map((change) => ({ change, snapshot })),
  )
  const order = sortChanges(pairs.map((pair) => pair.change))
  return order
    .map((change) => pairs.find((pair) => pair.change === change))
    .filter((pair): pair is { change: SnapshotChange; snapshot: Snapshot } => pair !== undefined)
}

/** El cambio en foco: el más avanzado en el flujo que aún pide trabajo. */
export function focusChange(input: Snapshot | Snapshot[] | undefined): SnapshotChange | undefined {
  return activeChanges(input)[0]?.change
}

function actorOf(change: SnapshotChange): ActionStepState['actor'] {
  if (change.requiresAgent) return 'agent'
  return /^satlas (approve|archive|amend|pause|resume)\b/.test(change.next) ? 'human' : 'local'
}

function emptyWorkspace(): NowNode[] {
  return [
    {
      id: 'now.empty',
      label: 'Sin cambios activos',
      description: 'empieza uno cuando quieras',
      icon: 'inbox',
      tone: TONE.gray,
      tooltip: 'Un **cambio** es la unidad de trabajo: propuesta, especificación, plan, tareas y evidencia.',
    },
    { id: 'now.new', label: 'Nuevo cambio', description: 'fix · standard · full', icon: 'add', tone: TONE.green, command: { command: 'specatlas.new', args: [] } },
    { id: 'now.adopt', label: 'Adoptar un proyecto existente', description: 'inventario y specs base', icon: 'repo', tone: TONE.purple, command: { command: 'specatlas.adopt', args: [] } },
    { id: 'now.panel', label: 'Abrir el panel', description: 'estado, trazabilidad y métricas', icon: 'window', tone: TONE.blue, command: { command: 'specatlas.panel', args: [] } },
  ]
}

function changeNode(change: SnapshotChange, snapshot: Snapshot, expanded: boolean, showProject: boolean): NowNode {
  const actor = actorOf(change)
  const steps = buildStepStates(change)
  const current = steps.find((step) => step.status === 'now')
  const totalSteps = steps.filter((step) => step.id.split('.')[1] !== 'nuevo').length
  const doneSteps = steps.filter((step) => step.status === 'done').length
  const command = resolveCommand(current?.command ?? change.next, change.slug, snapshot.agent)

  const children: NowNode[] = [
    {
      id: `now.${change.slug}.action`,
      label: current?.title ?? change.nextDescription,
      description: `${ACTOR_LABEL[actor]} · ${command}`,
      icon: ACTOR_ICON[actor],
      tone: actor === 'human' ? TONE.purple : actor === 'agent' ? TONE.blue : TONE.green,
      tooltip: [
        `**Siguiente acción** — ${change.nextDescription}`,
        '',
        `\`${command}\``,
        '',
        actor === 'human'
          ? 'La firma una persona: SpecAtlas no la ejecuta sola.'
          : actor === 'agent'
            ? 'La ejecuta el agente configurado en el proyecto.'
            : 'Es determinista: se ejecuta aquí mismo.',
      ].join('\n'),
      command: { command: 'specatlas.runNext', args: [change.slug] },
      contextValue: `nowAction-${actor}`,
    },
  ]

  for (const blocker of change.blockedBy) {
    children.push({
      id: `now.${change.slug}.block.${blocker}`,
      label: blocker,
      icon: 'circle-slash',
      tone: TONE.orange,
      tooltip: 'Bloqueo declarado por el gate: se resuelve antes de avanzar de fase.',
      contextValue: 'nowBlocker',
    })
  }

  if (change.blocking > 0) {
    children.push({
      id: `now.${change.slug}.findings`,
      label: `${change.blocking} hallazgo(s) bloqueante(s)`,
      description: 'ver en Salud',
      icon: 'error',
      tone: TONE.red,
      command: { command: 'specatlas.focusHealth', args: [] },
      contextValue: 'nowFindings',
    })
  }

  children.push({
    id: `now.${change.slug}.progress`,
    label: 'Tareas',
    description: progressBar(change.progress.tasksDone, change.progress.tasksTotal),
    icon: 'checklist',
    tone: change.progress.tasksTotal > 0 && change.progress.tasksDone === change.progress.tasksTotal ? TONE.green : TONE.blue,
    contextValue: 'nowMetric',
  })
  children.push({
    id: `now.${change.slug}.evidence`,
    label: 'Evidencia',
    description: progressBar(change.progress.scenariosDone, change.progress.scenariosTotal),
    icon: 'beaker',
    tone: change.progress.scenariosTotal > 0 && change.progress.scenariosDone === change.progress.scenariosTotal ? TONE.green : TONE.yellow,
    contextValue: 'nowMetric',
  })

  if (change.review) {
    children.push({
      id: `now.${change.slug}.review`,
      label: 'Revisión',
      description: change.review.passed ? 'cerrada' : change.review.blocking > 0 ? `${change.review.blocking} bloqueante(s)` : `resultado ${change.review.verdict}`,
      icon: change.review.passed ? 'verified' : 'comment-unresolved',
      tone: change.review.passed ? TONE.green : TONE.orange,
      command: { command: 'specatlas.review', args: [change.slug] },
      contextValue: 'nowReview',
    })
  }

  if (change.mockups.decision === 'required' || change.mockups.screens > 0) {
    children.push({
      id: `now.${change.slug}.mockups`,
      label: 'Mockups',
      description: change.mockups.screens > 0 ? `${change.mockups.screens} pantalla(s)${change.mockups.stale ? ' · desactualizados' : ''}` : 'requeridos · pendientes',
      icon: 'device-mobile',
      tone: change.mockups.stale || change.mockups.screens === 0 ? TONE.orange : TONE.purple,
      command: { command: 'specatlas.mockup.open', args: [change.slug] },
      contextValue: 'nowMockups',
    })
  }

  return {
    id: `now.${snapshot.root}.${change.slug}`,
    label: change.title ?? change.slug,
    description: `${showProject ? `${snapshot.projectName} · ` : ''}${change.stateLabel} · ${doneSteps}/${totalSteps} pasos`,
    icon: 'rocket',
    tone: change.blocking > 0 ? TONE.red : change.state === 'ready' ? TONE.green : TONE.blue,
    tooltip: [
      `**${change.title ?? change.slug}** — \`${change.slug}\``,
      '',
      `Estado: ${change.stateLabel} · carril \`${change.lane}\`${change.domain ? ` · dominio \`${change.domain}\`` : ''}`,
      change.approval ? `Firmada por **${change.approval.by}** (${change.approval.at})` : 'Sin firma vigente',
      '',
      `Siguiente: \`${change.next}\``,
    ].join('\n'),
    contextValue: `nowChange-${change.state}`,
    expanded,
    children,
  }
}

export function buildNow(input: Snapshot | Snapshot[] | undefined): NowNode[] {
  const snapshots = asList(input)
  if (snapshots.length === 0) return []
  const active = activeChanges(snapshots)
  if (active.length === 0) return emptyWorkspace()
  // Con varias carpetas abiertas, cada cambio dice de qué proyecto viene.
  const showProject = snapshots.length > 1
  return active.map((pair, index) => changeNode(pair.change, pair.snapshot, index === 0, showProject))
}

/** Texto para la barra de estado: la acción de un vistazo, sin abrir nada. */
export function statusBarText(input: Snapshot | Snapshot[] | undefined): { text: string; tooltip: string; warning: boolean } | undefined {
  const snapshots = asList(input)
  if (snapshots.length === 0) return undefined
  const pair = activeChanges(snapshots)[0]
  const change = pair?.change
  if (!change) {
    return { text: '$(compass) SpecAtlas: sin cambios activos', tooltip: 'Crea un cambio con `SpecAtlas: Nuevo cambio`.', warning: false }
  }
  const prefix = snapshots.length > 1 && pair ? `${pair.snapshot.projectName}/` : ''
  const steps = stepsForLane(laneOf(change))
  const step = steps.find((item) => item.id === buildStepStates(change).find((state) => state.status === 'now')?.id)
  const label = step?.title ?? change.nextDescription
  return {
    text: `$(compass) ${prefix}${change.slug}: ${label}`,
    tooltip: [`**${change.title ?? change.slug}** — ${change.stateLabel}`, '', `Siguiente: \`${change.next}\``, change.blocking > 0 ? `\n${change.blocking} hallazgo(s) bloqueante(s)` : ''].join('\n'),
    warning: change.blocking > 0 || change.blockedBy.length > 0,
  }
}
