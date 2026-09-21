import { describe, expect, it } from 'vitest'
import { buildPanelModel, type PanelModel } from '../src/panel/model'
import { renderPanelHtml } from '../src/panel/panel'
import { resumenSection } from '../src/panel/sections/resumen'
import { flujoSection } from '../src/panel/sections/flujo'
import { trazabilidadSection } from '../src/panel/sections/trazabilidad'
import { metricasSection } from '../src/panel/sections/metricas'
import { documentosSection } from '../src/panel/sections/documentos'
import { accionesSection } from '../src/panel/sections/acciones'
import { buildStepStates } from '../src/actions'
import type { MatrixModel, Snapshot, SnapshotChange } from '../src/logic'
import type { WorkspaceMetrics } from '@specatlas/core'

function change(overrides: Partial<SnapshotChange> = {}): SnapshotChange {
  return {
    slug: 'alta',
    dir: '/tmp/.sdd/changes/alta',
    title: 'Alta de tareas',
    domain: 'tareas',
    lane: 'standard',
    state: 'building',
    stateLabel: 'construyendo',
    next: '/satlas-build alta',
    nextDescription: 'Construir en olas',
    requiresAgent: true,
    blockedBy: [],
    progress: { tasksDone: 3, tasksTotal: 6, scenariosDone: 2, scenariosTotal: 4 },
    blocking: 0,
    files: [
      { label: 'Propuesta', path: '/tmp/proposal.md', exists: true, kind: 'proposal' },
      { label: 'Especificación', path: '/tmp/spec.md', exists: true, kind: 'spec' },
    ],
    mockups: { screens: 0, stale: false, decision: 'skip' },
    ...overrides,
  }
}

function model(c: SnapshotChange | undefined, metricsOverrides: Partial<WorkspaceMetrics> = {}): PanelModel {
  const changes = c ? [c] : []
  const snapshot: Snapshot = {
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
  return {
    root: '/tmp',
    snapshot,
    change: c,
    matrix: { requirements: [], uncoveredScenarios: [], pendingEvidence: [], requirementsWithoutTasks: [] } as MatrixModel,
    metrics: {
      project: 'Demo',
      generatedAt: '2026-09-20 20:00:00 -05:00',
      totals: { changes: changes.length, archived: 0, tasks: 0, tasksDone: 0, scenarios: 0, scenariosPassed: 0, errors: 0, warnings: 0 },
      changes: [],
      throughputByMonth: {},
      evidenceByMethod: {},
      wipByState: {},
      byLane: [],
      aging: { buckets: [] },
      attention: [],
      blocked: [],
      ...metricsOverrides,
    } as unknown as WorkspaceMetrics,
    steps: c ? buildStepStates(c) : [],
    documents: c?.files.map((file) => ({ kind: file.kind, label: file.label, path: file.path, exists: file.exists })) ?? [],
  }
}

function matrixWith(evidence: 'pass' | 'pending'): MatrixModel {
  return {
    requirements: [
      {
        id: 'REQ-X-001',
        title: 'Algo',
        living: false,
        file: '/tmp/spec.md',
        line: 5,
        passed: evidence === 'pass' ? 1 : 0,
        total: 1,
        domain: 'x',
        scenarios: [{ id: 'REQ-X-001-S1', title: 'Caso', tasks: ['T1.1'], evidence, file: '/tmp/spec.md', line: 9 }],
      },
    ],
    uncoveredScenarios: [],
    pendingEvidence: evidence === 'pass' ? [] : ['REQ-X-001-S1'],
    requirementsWithoutTasks: [],
  }
}

describe('escenarios del panel (REQ-EDITOR-002)', () => {
  it('[REQ-EDITOR-002-S2] el resumen dice expresamente cuando el proceso está al día', () => {
    const html = resumenSection(model(change({ state: 'building', blockedBy: [] }))).html
    expect(html).toContain('Proceso al día')
  })

  it('[REQ-EDITOR-002-S3] el resumen destaca los puntos que requieren atención', () => {
    const html = resumenSection(model(change({ blockedBy: ['mockups requeridos y no listos'] }))).html
    expect(html).toContain('requieren atención')
    expect(html).toContain('mockups requeridos y no listos')
  })

  it('[REQ-EDITOR-002-S4] sin cambios activos el resumen lo indica y ofrece crear uno', () => {
    const html = resumenSection(model(undefined)).html
    expect(html).toContain('Sin cambios activos')
  })

  it('[REQ-EDITOR-002-S5] un proyecto sin historial no presenta datos de archivo', () => {
    const html = resumenSection(model(change())).html
    expect(html).toContain('0 archivados')
  })
})

describe('escenarios del flujo (REQ-EDITOR-003)', () => {
  it('[REQ-EDITOR-003-S2] un cambio bloqueado aparece con el motivo', () => {
    const html = flujoSection(model(change({ blockedBy: ['la spec no está aprobada'], state: 'awaiting_approval' }))).html
    expect(html).toContain('banner warn')
    expect(html).toContain('la spec no está aprobada')
  })

  it('[REQ-EDITOR-003-S4] sin cambios activos las fases no muestran datos inexistentes', () => {
    const html = flujoSection(model(undefined)).html
    expect(html).toContain('Sin cambios activos')
  })
})

describe('escenarios de la trazabilidad (REQ-EDITOR-004)', () => {
  it('[REQ-EDITOR-004-S2] con todo verificado la sección lo indica', () => {
    const base = model(change())
    const html = trazabilidadSection({ ...base, matrix: matrixWith('pass') }).html
    expect(html).toContain('Trazabilidad completa')
  })

  it('[REQ-EDITOR-004-S5] los identificadores abren el artefacto en la línea', () => {
    const base = model(change())
    const html = trazabilidadSection({ ...base, matrix: matrixWith('pass') }).html
    expect(html).toContain('command:specatlas.openAt')
    expect(html).toContain('REQ-X-001-S1')
  })
})

describe('escenarios de métricas (REQ-EDITOR-005)', () => {
  it('[REQ-EDITOR-005-S3] sin actividad la sección lo indica sin inventar indicadores', () => {
    const html = metricasSection(model(undefined)).html
    expect(html).toContain('Sin cambios activos')
  })
})

describe('escenarios de documentos (REQ-EDITOR-006)', () => {
  it('[REQ-EDITOR-006-S2] un documento ausente se indica con la acción que lo produce', () => {
    const c = change({ files: [{ label: 'Plan', path: '/tmp/plan.md', exists: false, kind: 'plan' }] })
    const html = documentosSection(model(c)).html
    expect(html).toContain('Aún no existe')
  })

  it('[REQ-EDITOR-006-S3] los mockups del cambio se ven dentro del panel', () => {
    const c = change({
      mockups: { screens: 1, stale: false, decision: 'required' },
      files: [{ label: 'Mockups', path: '/tmp/mockups', exists: true, kind: 'mockup', screens: [{ id: 'uno', title: 'Pantalla uno', file: 'uno.html' }] }],
    })
    const html = documentosSection(model(c)).html
    expect(html).toContain('Pantalla uno')
    expect(html).toContain('command:specatlas.mockup.open')
  })

  it('[REQ-EDITOR-006-S4] un cambio sin mockups lo indica sin contenido de ejemplo', () => {
    const html = documentosSection(model(change())).html
    expect(html).toContain('no declara mockups')
  })

  it('[REQ-EDITOR-006-S5] unos mockups desactualizados se avisan', () => {
    const c = change({ mockups: { screens: 1, stale: true, decision: 'required' } })
    const html = documentosSection(model(c)).html
    expect(html).toContain('desactualizados')
  })

  it('[REQ-EDITOR-006-S1] la presentación no incrusta el visor de mockups: ofrece abrirlo aparte', () => {
    const c = change({
      mockups: { screens: 2, stale: false, decision: 'required' },
      files: [
        {
          label: 'Mockups',
          path: '/tmp/mockups',
          exists: true,
          kind: 'mockup',
          screens: [
            { id: 'uno', title: 'Pantalla uno', file: 'uno.html' },
            { id: 'dos', title: 'Pantalla dos', file: 'dos.html' },
          ],
        },
      ],
    })
    const base = model(c)
    const html = documentosSection(
      { ...base, documents: [{ kind: 'presentation', label: 'Presentación', path: '/tmp/presentation/index.html', exists: true }] },
      { resources: { presentationBase64: 'PGh0bWw+' } },
    ).html
    const pane = html.slice(html.indexOf('data-doc-pane="presentation"'))
    expect(pane).not.toContain('mockup-viewer')
    expect(pane).not.toContain('Pantallas del cambio')
    expect(pane).toContain('command:specatlas.mockup.open')
    expect(pane).toContain('data-goto-doc="mockup"')
  })

  it('[REQ-EDITOR-006-S6] un documento ilegible no muestra contenido parcial', () => {
    const c = change({ files: [{ label: 'Plan', path: '/tmp/plan.md', exists: true, kind: 'plan' }] })
    const base = model(c)
    const html = documentosSection({ ...base, documents: [{ kind: 'plan', label: 'Plan', path: '/tmp/plan.md', exists: true }] }).html
    expect(html).toContain('no se puede mostrar dentro del panel')
  })
})

describe('escenarios de acciones (REQ-EDITOR-007)', () => {
  it('[REQ-EDITOR-007-S1] la acción válida del estado ofrece su botón ejecutable', () => {
    const html = accionesSection(model(change({ state: 'building' }))).html
    expect(html).toContain('data-message="run-step"')
    expect(html).toContain('▶ ahora')
  })

  it('[REQ-EDITOR-007-S8] se puede crear un cambio desde el panel', () => {
    const html = accionesSection(model(change())).html
    expect(html).toContain('command:specatlas.new')
    expect(html).toContain('Nuevo cambio — paso 1 de todos los carriles')
  })
})

describe('escenarios de revisión y análisis (REQ-EDITOR-011)', () => {
  it('[REQ-EDITOR-011-S1] la revisión aparece como paso vigente tras verificar y queda hecha con su artefacto', () => {
    const verified = buildStepStates(change({ state: 'verified' }))
    expect(verified.find((step) => step.status === 'now')?.id).toBe('std.revisar')
    const withReview = buildStepStates(change({ state: 'verified', files: [{ label: 'Revisión de código', path: '/tmp/review.md', exists: true, kind: 'review' }] }))
    const review = withReview.find((step) => step.id === 'std.revisar')!
    expect(review.status).toBe('done')
    expect(withReview.find((step) => step.id === 'std.analizar')?.enabled).toBe(true)
  })

  it('[REQ-EDITOR-011-S2] el análisis se ofrece y queda hecho con su informe', () => {
    const steps = buildStepStates(change({ state: 'verified' }))
    const analyze = steps.find((step) => step.id === 'std.analizar')!
    expect(analyze.actor).toBe('local')
    expect(analyze.command).toContain('satlas analyze')
    expect(analyze.enabled).toBe(true)
    const withAnalyze = buildStepStates(change({ state: 'verified', files: [{ label: 'Análisis', path: '/tmp/analyze.md', exists: true, kind: 'analyze' }] }))
    expect(withAnalyze.find((step) => step.id === 'std.analizar')?.status).toBe('done')
  })

  it('[REQ-EDITOR-011-S3] en el carril estándar el archivado no se bloquea por no revisar y el panel lo recomienda', () => {
    const steps = buildStepStates(change({ state: 'ready', blockedBy: [] }))
    expect(steps.find((step) => step.status === 'now')?.id).toBe('std.archivar')
    expect(steps.find((step) => step.id === 'std.revisar')?.reason).toContain('recomendado')
    expect(steps.find((step) => step.id === 'std.analizar')?.reason).toContain('opcional')
    const html = accionesSection(model(change({ state: 'ready', blockedBy: [] }))).html
    expect(html).toContain('Revisar')
    expect(html).toContain('Analizar')
  })

  it('[REQ-EDITOR-011-S4] el carril completo ordena revisar, analizar, documentar y contratos antes de archivar', () => {
    const steps = buildStepStates(change({ lane: 'full', state: 'verified' }))
    const ids = steps.map((step) => step.id)
    expect(steps.find((step) => step.status === 'now')?.id).toBe('full.revisar')
    expect(ids.indexOf('full.revisar')).toBeLessThan(ids.indexOf('full.analizar'))
    expect(ids.indexOf('full.analizar')).toBeLessThan(ids.indexOf('full.documentar'))
    expect(ids.indexOf('full.documentar')).toBeLessThan(ids.indexOf('full.contratos'))
    expect(ids.indexOf('full.contratos')).toBeLessThan(ids.indexOf('full.archivar'))
  })
})

describe('escenarios del panel vivo (REQ-EDITOR-008)', () => {
  it('[REQ-EDITOR-008-S2] la página conserva sección y filtros al refrescar', () => {
    const html = renderPanelHtml(model(change()), 'flujo', 'nonce')
    expect(html).toContain('acquireVsCodeApi')
    expect(html).toContain('getState')
    expect(html).toContain('setState')
    expect(html).toContain('data-filter')
  })
})
