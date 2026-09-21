import { describe, expect, it } from 'vitest'
import { buildHealth, healthBadge } from '../src/views/health'
import { buildNow, focusChange, progressBar, statusBarText } from '../src/views/now'
import type { Snapshot, SnapshotChange } from '../src/logic'

function change(partial: Partial<SnapshotChange> = {}): SnapshotChange {
  return {
    slug: 'reset-password',
    dir: '/proyecto/.sdd/changes/reset-password',
    title: 'Restablecer contraseña',
    domain: 'auth',
    lane: 'standard',
    state: 'building',
    stateLabel: 'construyendo',
    next: '/satlas-build reset-password',
    nextDescription: 'Construir en olas (1/3 tareas)',
    requiresAgent: true,
    blockedBy: [],
    progress: { tasksDone: 1, tasksTotal: 3, scenariosDone: 0, scenariosTotal: 4 },
    blocking: 0,
    files: [],
    mockups: { decision: 'skip', screens: 0, stale: false, items: [] },
    ...partial,
  } as SnapshotChange
}

function snapshot(partial: Partial<Snapshot> = {}): Snapshot {
  return {
    root: '/proyecto',
    projectName: 'demo',
    language: 'es',
    agent: 'opencode',
    specs: [],
    changes: [change()],
    fixes: [],
    archived: [],
    diagnostics: [],
    drift: { mode: 'advisory', domains: 2, checked: 12, broken: [] },
    summary: { specs: 3, changes: 1, fixes: 0, errors: 0, warnings: 0 },
    ...partial,
  } as Snapshot
}

describe('vista Ahora', () => {
  it('pone la siguiente acción como primer hijo del cambio en foco', () => {
    const nodes = buildNow(snapshot())
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.expanded).toBe(true)

    const action = nodes[0]!.children![0]!
    expect(action.command?.command).toBe('specatlas.runNext')
    expect(action.description).toContain('/satlas-build reset-password')
    expect(action.contextValue).toBe('nowAction-agent')
  })

  it('la invocación del agente sale del target del proyecto', () => {
    const nodes = buildNow(snapshot({ agent: 'claude-code' }))
    expect(nodes[0]!.children![0]!.description).toContain('/satlas:build reset-password')
  })

  it('distingue lo que firma una persona de lo que se ejecuta solo', () => {
    const humana = buildNow(snapshot({ changes: [change({ state: 'ready', stateLabel: 'listo para archivar', next: 'satlas archive reset-password', requiresAgent: false })] }))
    expect(humana[0]!.children![0]!.contextValue).toBe('nowAction-human')

    const local = buildNow(snapshot({ changes: [change({ state: 'built', stateLabel: 'construido', next: 'satlas verify reset-password', requiresAgent: false })] }))
    expect(local[0]!.children![0]!.contextValue).toBe('nowAction-local')
  })

  it('muestra bloqueos, hallazgos, progreso y revisión', () => {
    const nodes = buildNow(
      snapshot({
        changes: [
          change({
            blockedBy: ['evidencia 0/4'],
            blocking: 2,
            review: { verdict: 'pass', open: 1, blocking: 1, passed: false },
          }),
        ],
      }),
    )
    const labels = nodes[0]!.children!.map((child) => child.label)
    expect(labels).toContain('evidencia 0/4')
    expect(labels).toContain('2 hallazgo(s) bloqueante(s)')
    expect(labels).toContain('Tareas')
    expect(labels).toContain('Evidencia')
    const review = nodes[0]!.children!.find((child) => child.label === 'Revisión')
    expect(review?.description).toContain('1 bloqueante')
  })

  it('sin cambios activos ofrece por dónde empezar', () => {
    const nodes = buildNow(snapshot({ changes: [] }))
    expect(nodes.map((node) => node.command?.command)).toContain('specatlas.new')
    expect(nodes.map((node) => node.command?.command)).toContain('specatlas.adopt')
  })

  it('la barra de estado resume el cambio en foco y avisa si hay bloqueo', () => {
    const limpio = statusBarText(snapshot())
    expect(limpio?.text).toContain('reset-password')
    expect(limpio?.warning).toBe(false)

    const bloqueado = statusBarText(snapshot({ changes: [change({ blocking: 3 })] }))
    expect(bloqueado?.warning).toBe(true)

    expect(statusBarText(snapshot({ changes: [] }))?.text).toContain('sin cambios activos')
    expect(statusBarText(undefined)).toBeUndefined()
  })

  it('la barra de progreso es proporcional', () => {
    expect(progressBar(0, 4)).toContain('0/4')
    expect(progressBar(4, 4).startsWith('▰▰▰▰▰▰▰▰')).toBe(true)
    expect(progressBar(0, 0)).toBe('—')
  })

  it('el foco es el cambio más avanzado que aún pide trabajo', () => {
    const pendiente = change({ slug: 'a', state: 'awaiting_approval' })
    const avanzado = change({ slug: 'b', state: 'ready' })
    expect(focusChange(snapshot({ changes: [avanzado, pendiente] }))?.slug).toBe('a')
  })
})

describe('vista Salud', () => {
  it('separa lo que bloquea de lo que solo avisa', () => {
    const nodes = buildHealth(
      snapshot({
        diagnostics: [
          { file: '/proyecto/.sdd/changes/x/spec.md', line: 5, severity: 'error', code: 'TRACE-002', message: 'Escenario sin tarea' },
          { file: '/proyecto/.sdd/changes/x/tasks.md', line: 2, severity: 'warning', code: 'LINT-TSK-001', message: 'Tarea sin archivos' },
        ],
      }),
    )
    const [bloquean, avisan] = nodes
    expect(bloquean!.label).toBe('Bloquean el avance')
    expect(bloquean!.children).toHaveLength(1)
    expect(bloquean!.children![0]!.command?.command).toBe('specatlas.openAt')
    expect(bloquean!.children![0]!.contextValue).toBe('healthDiagnostic:TRACE-002')
    expect(avisan!.label).toBe('Avisan, no detienen')
  })

  it('muestra la deriva de anclas con su modo', () => {
    const nodes = buildHealth(
      snapshot({
        drift: { mode: 'strict', domains: 1, checked: 4, broken: [{ domain: 'auth', requirement: 'REQ-AUTH-001', anchor: 'src/reset.ts', kind: 'missing-file' }] },
      }),
    )
    const drift = nodes.find((node) => node.id === 'health.drift')
    expect(drift?.description).toBe('1 ancla(s)')
    expect(drift?.children![0]!.description).toContain('el archivo ya no existe')
  })

  it('sin hallazgos y con anclas al día, lo dice en una línea', () => {
    const nodes = buildHealth(snapshot())
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.label).toBe('Todo en orden')
    expect(nodes[0]!.description).toContain('12 anclas comprobadas')
  })

  it('el badge cuenta solo lo que bloquea', () => {
    expect(
      healthBadge(
        snapshot({
          diagnostics: [
            { file: 'a', line: 1, severity: 'error', code: 'X', message: 'x' },
            { file: 'b', line: 1, severity: 'warning', code: 'Y', message: 'y' },
          ],
        }),
      ),
    ).toBe(1)
    expect(healthBadge(undefined)).toBe(0)
  })
})
