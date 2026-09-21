import { describe, expect, it } from 'vitest'
import { changeForFile, fileBadge, toggleTaskLine } from '../src/views/artefactos'
import { activeChanges, buildNow, statusBarText } from '../src/views/now'
import { buildHealth, healthBadge } from '../src/views/health'
import type { Snapshot, SnapshotChange } from '../src/logic'

const NL = String.fromCharCode(10)

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
    nextDescription: 'Construir en olas',
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
    drift: { mode: 'advisory', domains: 1, checked: 4, broken: [] },
    summary: { specs: 3, changes: 1, fixes: 0, errors: 0, warnings: 0 },
    ...partial,
  } as Snapshot
}

describe('el panel sigue al archivo abierto', () => {
  it('reconoce cada artefacto del cambio', () => {
    const snap = snapshot()
    expect(changeForFile(snap, '/proyecto/.sdd/changes/reset-password/spec.md')?.kind).toBe('spec')
    expect(changeForFile(snap, '/proyecto/.sdd/changes/reset-password/tasks.md')?.kind).toBe('tasks')
    expect(changeForFile(snap, '/proyecto/.sdd/changes/reset-password/docs/tecnica.md')?.kind).toBe('docs')
    expect(changeForFile(snap, '/proyecto/.sdd/changes/reset-password/spec.md')?.change.slug).toBe('reset-password')
  })

  it('no confunde archivos de fuera del cambio', () => {
    const snap = snapshot()
    expect(changeForFile(snap, '/proyecto/src/reset.ts')).toBeUndefined()
    expect(changeForFile(snap, '/proyecto/.sdd/specs/auth/spec.md')).toBeUndefined()
    expect(changeForFile(snap, undefined)).toBeUndefined()
  })

  it('separa rutas de Windows igual que las de POSIX', () => {
    const snap = snapshot({ changes: [change({ dir: 'C:\\proyecto\\.sdd\\changes\\reset-password' })] })
    expect(changeForFile(snap, 'C:\\proyecto\\.sdd\\changes\\reset-password\\verify.md')?.kind).toBe('verify')
  })
})

describe('decoración de los archivos del flujo', () => {
  it('lo que bloquea manda sobre la fase', () => {
    const snap = snapshot({
      diagnostics: [
        { file: '/proyecto/.sdd/changes/reset-password/spec.md', line: 5, severity: 'error', code: 'TRACE-002', message: 'x' },
        { file: '/proyecto/.sdd/changes/reset-password/spec.md', line: 9, severity: 'warning', code: 'LINT-TSK-001', message: 'y' },
      ],
    })
    const badge = fileBadge(snap, '/proyecto/.sdd/changes/reset-password/spec.md')
    expect(badge?.badge).toBe('1')
    expect(badge?.color).toBe('charts.red')
    expect(badge?.propagate).toBe(true)
  })

  it('sin hallazgos, el archivo lleva la marca de su fase', () => {
    const badge = fileBadge(snapshot(), '/proyecto/.sdd/changes/reset-password/plan.md')
    expect(badge?.tooltip).toContain('construyendo')
    expect(badge?.propagate).toBe(false)
  })

  it('un archivo ajeno al flujo no se decora', () => {
    expect(fileBadge(snapshot(), '/proyecto/src/reset.ts')).toBeUndefined()
  })
})

describe('marcar una tarea desde el árbol', () => {
  const tasks = ['## Bloque 1 — Acceso', '', '- [ ] T1.1 Formulario · Archivos: a.ts · Cubre: REQ-A-001-S1', '- [x] T1.2 Otra · Archivos: b.ts · Cubre: REQ-A-001-S2'].join(NL)

  it('marca y desmarca sin tocar el resto de la línea', () => {
    const marcada = toggleTaskLine(tasks, 3, true)
    expect(marcada).toContain('- [x] T1.1 Formulario · Archivos: a.ts · Cubre: REQ-A-001-S1')
    expect(marcada).toContain('- [x] T1.2 Otra')

    const desmarcada = toggleTaskLine(tasks, 4, false)
    expect(desmarcada).toContain('- [ ] T1.2 Otra · Archivos: b.ts · Cubre: REQ-A-001-S2')
  })

  it('no inventa cambios cuando la línea no es una tarea', () => {
    expect(toggleTaskLine(tasks, 1, true)).toBeUndefined()
    expect(toggleTaskLine(tasks, 99, true)).toBeUndefined()
  })

  it('conserva el fin de línea del archivo', () => {
    const crlf = tasks.split(NL).join('\r\n')
    expect(toggleTaskLine(crlf, 3, true)).toContain('\r\n')
  })
})

describe('varias carpetas en el mismo workspace', () => {
  const uno = snapshot()
  const dos = snapshot({
    root: '/otro',
    projectName: 'otro',
    agent: 'claude-code',
    changes: [change({ slug: 'cobros', dir: '/otro/.sdd/changes/cobros', state: 'ready', stateLabel: 'listo para archivar', next: 'satlas archive cobros', requiresAgent: false })],
    diagnostics: [{ file: '/otro/.sdd/changes/cobros/spec.md', line: 1, severity: 'error', code: 'TRACE-002', message: 'z' }],
    drift: { mode: 'strict', domains: 2, checked: 6, broken: [{ domain: 'pagos', requirement: 'REQ-PAGOS-001', anchor: 'src/pagos.ts', kind: 'missing-file' }] },
    summary: { specs: 1, changes: 1, fixes: 0, errors: 1, warnings: 0 },
  })

  it('la vista Ahora lista los cambios de todas las carpetas y dice de cuál es cada uno', () => {
    const nodes = buildNow([uno, dos])
    expect(nodes).toHaveLength(2)
    expect(nodes.map((node) => node.description).join(' ')).toContain('demo ·')
    expect(nodes.map((node) => node.description).join(' ')).toContain('otro ·')
  })

  it('cada cambio usa el agente de su propio proyecto', () => {
    const nodes = buildNow([uno, dos])
    const acciones = nodes.map((node) => node.children![0]!.description ?? '')
    expect(acciones.some((texto) => texto.includes('/satlas-build reset-password'))).toBe(true)
    expect(acciones.some((texto) => texto.includes('satlas archive cobros'))).toBe(true)
  })

  it('la salud y el badge suman todo el workspace', () => {
    expect(healthBadge([uno, dos])).toBe(1)
    const nodes = buildHealth([uno, dos])
    expect(nodes.find((node) => node.id === 'health.errors')?.description).toBe('1')
    const drift = nodes.find((node) => node.id === 'health.drift')
    expect(drift?.description).toBe('1 ancla(s)')
    expect(drift?.tone).toBe('charts.red')
  })

  it('la barra de estado nombra el proyecto cuando hay más de uno', () => {
    expect(statusBarText([uno, dos])?.text).toMatch(/^\$\(compass\) (demo|otro)\//)
    expect(statusBarText(uno)?.text).not.toContain('demo/')
    expect(activeChanges([uno, dos])).toHaveLength(2)
  })
})
