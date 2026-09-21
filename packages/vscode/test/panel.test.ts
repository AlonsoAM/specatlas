import { describe, expect, it } from 'vitest'
import { buildStepStates, laneOf, stepsForLane } from '../src/actions.js'
import { renderPanelHtml } from '../src/panel/panel.js'
import { panelNotice } from '../src/panel/panel.js'
import type { PanelModel } from '../src/panel/model.js'
import type { MatrixModel, Snapshot, SnapshotChange } from '../src/logic.js'

function change(overrides: Partial<SnapshotChange> = {}): SnapshotChange {
  return {
    slug: 'panel-principal',
    dir: '/tmp/.sdd/changes/panel-principal',
    title: 'Un panel principal único',
    domain: 'editor',
    lane: 'standard',
    state: 'awaiting_approval',
    stateLabel: 'esperando aprobación',
    next: 'satlas approve panel-principal --by "<nombre>"',
    nextDescription: 'Firmar la aprobación',
    requiresAgent: false,
    blockedBy: ['la spec no está aprobada'],
    progress: { tasksDone: 0, tasksTotal: 0, scenariosDone: 0, scenariosTotal: 51 },
    blocking: 0,
    files: [
      { label: 'Propuesta', path: '/tmp/proposal.md', exists: true, kind: 'proposal' },
      { label: 'Especificación', path: '/tmp/spec.md', exists: true, kind: 'spec' },
      { label: 'Mockups', path: '/tmp/mockups', exists: true, kind: 'mockup' },
    ],
    mockups: { screens: 9, stale: false, decision: 'required' },
    ...overrides,
  }
}

function snapshot(changes: SnapshotChange[]): Snapshot {
  return {
    root: '/tmp',
    projectName: 'Demo',
    language: 'es',
    specs: [],
    changes,
    fixes: [],
    archived: [],
    diagnostics: [],
    summary: { specs: 0, changes: changes.length, fixes: 0, errors: 0, warnings: 0 },
  }
}

function model(c: SnapshotChange): PanelModel {
  return {
    root: '/tmp',
    snapshot: snapshot([c]),
    change: c,
    matrix: { requirements: [], uncoveredScenarios: [], pendingEvidence: [], requirementsWithoutTasks: [] } as MatrixModel,
    metrics: {
      project: 'Demo',
      generatedAt: '2026-09-20 20:00:00 -05:00',
      totals: { changes: 1, archived: 0, tasks: 0, tasksDone: 0, scenarios: 51, scenariosPassed: 0, errors: 0, warnings: 0 },
      changes: [],
      throughputByMonth: {},
      evidenceByMethod: {},
      wipByState: {},
      byLane: [],
      aging: { buckets: [] },
      attention: [],
      blocked: [],
    } as unknown as PanelModel['metrics'],
    steps: buildStepStates(c),
    documents: c.files.map((file) => ({ kind: file.kind, label: file.label, path: file.path, exists: file.exists })),
  }
}

describe('catálogo de acciones del panel', () => {
  it('[REQ-EDITOR-007-S7] cada carril tiene sus pasos en orden', () => {
    expect(stepsForLane('fix').map((step) => step.id)).toEqual(['fix.nuevo', 'fix.corregir', 'fix.verificar', 'fix.archivar'])
    expect(stepsForLane('standard')).toHaveLength(11)
    expect(stepsForLane('full')).toHaveLength(13)
    expect(stepsForLane('standard')[1]!.actor).toBe('agent')
    expect(stepsForLane('standard')[4]!.actor).toBe('human')
  })

  it('[REQ-EDITOR-007-S7][REQ-EDITOR-007-S1] marca el paso actual según el estado del cambio', () => {
    const steps = buildStepStates(change())
    const current = steps.find((step) => step.status === 'now')
    expect(current?.id).toBe('std.aprobar')
    expect(steps.filter((step) => step.status === 'done').map((step) => step.id)).toEqual(['std.nuevo', 'std.especificar', 'std.mockups'])
    expect(steps.find((step) => step.id === 'std.aclarar')?.status).toBe('skipped')
  })

  it('[REQ-EDITOR-007-S2][REQ-EDITOR-007-S9] los pasos pendientes quedan deshabilitados con motivo y los hechos permiten repetir', () => {
    const steps = buildStepStates(change())
    const plan = steps.find((step) => step.id === 'std.planificar')!
    expect(plan.enabled).toBe(false)
    expect(plan.reason).toContain('requiere')
    const especificar = steps.find((step) => step.id === 'std.especificar')!
    expect(especificar.status).toBe('done')
    expect(especificar.enabled).toBe(true)
  })

  it('el carril express no exige especificar', () => {
    const steps = buildStepStates(change({ lane: 'fix', state: 'draft', mockups: { screens: 0, stale: false } }))
    expect(laneOf(change({ lane: 'fix' }))).toBe('fix')
    expect(steps.find((step) => step.status === 'now')?.id).toBe('fix.corregir')
    expect(steps.some((step) => step.id.includes('especificar'))).toBe(false)
  })
})

describe('panel principal: página y secciones', () => {
  const c = change()
  const html = renderPanelHtml(model(c), 'resumen', 'nonce-test')

  it('[REQ-EDITOR-001-S1][REQ-EDITOR-001-S2] es una sola página con las seis secciones internas', () => {
    const tabs = [...html.matchAll(/data-section-tab="([^"]+)"/g)].map((match) => match[1])
    expect(tabs).toEqual(['resumen', 'flujo', 'trazabilidad', 'metricas', 'documentos', 'acciones'])
    expect(html).toContain('role="tablist"')
  })

  it('[REQ-EDITOR-002-S1] el resumen muestra el estado y la siguiente acción del cambio', () => {
    expect(html).toContain('Cambios activos y siguiente acción')
    expect(html).toContain('panel-principal')
    expect(html).toContain('satlas approve panel-principal')
  })

  it('[REQ-EDITOR-003-S1][REQ-EDITOR-003-S4] el flujo es vertical, incluye la fase de mockups y resume las vacías', () => {
    expect(html).toContain('Esperando mockups')
    expect(html).toContain('class="flow"')
    expect(html).toContain('flow-empty')
    expect(html).toContain('Sin cambios en:')
  })

  it('[REQ-EDITOR-004-S1][REQ-EDITOR-005-S1] la trazabilidad y las métricas viven en la misma página', () => {
    expect(html).toContain('Cobertura por dominio')
    expect(html).toContain('Evidencia por método')
    expect(html).toContain('Matriz')
  })

  it('[REQ-EDITOR-006-S1][REQ-EDITOR-007-S7] los documentos y las acciones están integrados', () => {
    expect(html).toContain('Documentos')
    expect(html).toContain('Flujo por carril')
    expect(html).toContain('Abrir opencode')
    expect(html).toContain('Transversales')
  })

  it('[REQ-EDITOR-001-S4][REQ-EDITOR-001-S5] las secciones sin proyecto o sin inicializar se explican', () => {
    expect(panelNotice('no-workspace', 'abre una carpeta')).toContain('No hay una carpeta de proyecto abierta')
    expect(panelNotice('not-initialized', 'inicializa')).toContain('no está inicializado')
  })

  it('[REQ-EDITOR-001-S1] incluye los tokens de diseño y los estilos de botones, sin documentos anidados', () => {
    expect(html).toContain('--atlas-line:')
    expect(html).toContain('--atlas-ink:')
    expect(html).toContain('.btn.primary')
    expect(html.match(/<!doctype html>/gi)?.length).toBe(1)
  })
})
