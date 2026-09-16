import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveChange, collectMetrics, createChange, initWorkspace, signApproval } from '@specatlas/core'
import { buildMatrix, buildSnapshot, escapeHtml, previewHtml, sortChanges, toFlat, toolItems, type SnapshotChange } from '../src/logic'
import { boardHtml, matrixHtml, metricsHtml } from '../src/panels'

const DELTA = `# Delta — Restablecer contraseña

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** el usuario solicita restablecer con un email registrado
- **ENTONCES** recibe un enlace de un solo uso
`

const TASKS = `# Tareas

## Bloque 1 — API

- [x] T1.1 Endpoint · Archivos: src/reset.ts · Cubre: REQ-AUTH-001-S1
`

const VERIFY = `# Verificación

\`\`\`evidence
scenario: REQ-AUTH-001-S1
method: manual
result: pass
date: 2026-09-15T18:00:00Z
by: Ana
\`\`\`
`

async function makeWorkspace(withApproval: boolean): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-vscode-'))
  await initWorkspace({ root, name: 'vscode-demo', language: 'es' })
  await createChange({ root, slug: 'reset-password', lane: 'standard', domain: 'auth', title: 'Restablecer contraseña' })
  const dir = path.join(root, '.sdd', 'changes', 'reset-password')
  await fs.writeFile(path.join(dir, 'spec.md'), DELTA, 'utf8')
  await fs.writeFile(path.join(dir, 'tasks.md'), TASKS, 'utf8')
  await fs.writeFile(path.join(dir, 'verify.md'), VERIFY, 'utf8')
  if (withApproval) {
    await signApproval({ root, artifact: 'changes/reset-password/spec.md', by: 'Maria Perez', channel: 'editor' })
  }
  return root
}

describe('buildSnapshot', () => {
  it('ordena el estado del cambio y expone progreso, archivos y siguiente acción', async () => {
    const root = await makeWorkspace(true)
    const snapshot = await buildSnapshot(root)
    expect(snapshot).toBeDefined()
    expect(snapshot!.projectName).toBe('vscode-demo')
    expect(snapshot!.summary.changes).toBe(1)
    expect(snapshot!.summary.errors).toBe(0)

    const change = snapshot!.changes[0]!
    expect(change.slug).toBe('reset-password')
    expect(change.state).toBe('ready')
    expect(change.next).toContain('satlas archive')
    expect(change.progress).toEqual({ tasksDone: 1, tasksTotal: 1, scenariosDone: 1, scenariosTotal: 1 })

    const byKind = new Map(change.files.map((f) => [f.kind, f.exists]))
    expect(byKind.get('spec')).toBe(true)
    expect(byKind.get('tasks')).toBe(true)
    expect(byKind.get('verify')).toBe(true)
    expect(byKind.get('plan')).toBe(false)
    expect(byKind.get('presentation')).toBe(false)
  })

  it('tareas y mockups se despliegan como hijos del árbol', async () => {
    const root = await makeWorkspace(true)
    const dir = path.join(root, '.sdd', 'changes', 'reset-password')
    await fs.mkdir(path.join(dir, 'mockups'), { recursive: true })
    await fs.writeFile(
      path.join(dir, 'mockups', 'manifest.yaml'),
      `schema_version: 1
version: 1
level: hifi
platform: web
screens:
  - id: alta
    title: Alta de tareas
    file: alta.html
  - id: vacio
    title: Lista vacía
    file: vacio.html
`,
      'utf8',
    )

    const snapshot = await buildSnapshot(root)
    const change = snapshot!.changes[0]!

    const tasksFile = change.files.find((file) => file.kind === 'tasks')
    expect(tasksFile?.tasks?.length).toBeGreaterThan(0)
    expect(tasksFile?.tasks?.[0]?.id).toBeTruthy()
    expect(typeof tasksFile?.tasks?.[0]?.done).toBe('boolean')
    expect(tasksFile?.tasks?.[0]?.line).toBeGreaterThan(0)

    const mockupFile = change.files.find((file) => file.kind === 'mockup')
    expect(mockupFile?.screens?.map((screen) => screen.id)).toEqual(['alta', 'vacio'])
    expect(change.mockups.items?.map((screen) => screen.title)).toEqual(['Alta de tareas', 'Lista vacía'])
  })

  it('la matriz reconoce las tareas y la evidencia de cambios archivados', async () => {
    const root = await makeWorkspace(true)
    await archiveChange({ root, slug: 'reset-password' })

    const snapshot = await buildSnapshot(root)
    expect(snapshot!.summary.changes).toBe(0)

    const matrix = await buildMatrix(root)
    const requirement = matrix.requirements.find((r) => r.id === 'REQ-AUTH-001')
    expect(requirement).toBeDefined()
    const scenario = requirement!.scenarios[0]!
    expect(scenario.tasks.length).toBeGreaterThan(0)
    expect(scenario.evidence).toBe('pass')
    expect(matrix.uncoveredScenarios).toHaveLength(0)
    expect(matrix.requirementsWithoutTasks).toHaveLength(0)
  })

  it('sin firma queda en esperando aprobación', async () => {
    const root = await makeWorkspace(false)
    const snapshot = await buildSnapshot(root)
    expect(snapshot!.changes[0]!.state).toBe('awaiting_approval')
    expect(snapshot!.changes[0]!.next).toContain('satlas present')
  })

  it('devuelve undefined cuando no hay .sdd', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-empty-'))
    expect(await buildSnapshot(root)).toBeUndefined()
  })
})

describe('orden y estructura del sidebar', () => {
  it('sortChanges pone primero lo accionable y desempata por bloqueos y slug', () => {
    const base: Omit<SnapshotChange, 'slug' | 'state' | 'blocking'> = {
      dir: '/tmp',
      lane: 'standard',
      stateLabel: 'x',
      next: 'satlas validate',
      nextDescription: 'x',
      requiresAgent: false,
      blockedBy: [],
      progress: { tasksDone: 0, tasksTotal: 0, scenariosDone: 0, scenariosTotal: 0 },
      files: [],
      mockups: { screens: 0, stale: false },
    }
    const changes: SnapshotChange[] = [
      { ...base, slug: 'z-listo', state: 'ready', blocking: 0 },
      { ...base, slug: 'b-borrador', state: 'draft', blocking: 0 },
      { ...base, slug: 'a-espera', state: 'awaiting_approval', blocking: 0 },
      { ...base, slug: 'c-bloqueado', state: 'awaiting_approval', blocking: 2 },
    ]
    const sorted = sortChanges(changes).map((change) => change.slug)
    expect(sorted[0]).toBe('c-bloqueado')
    expect(sorted[1]).toBe('a-espera')
    expect(sorted[2]).toBe('b-borrador')
    expect(sorted[3]).toBe('z-listo')
  })

  it('el snapshot expone los requisitos de cada spec viva para el árbol', async () => {
    const root = await makeWorkspace(true)
    const livingDir = path.join(root, '.sdd', 'specs', 'auth')
    await fs.mkdir(livingDir, { recursive: true })
    await fs.writeFile(
      path.join(livingDir, 'spec.md'),
      `---\ndomain: auth\ntitle: Autenticación\nversion: 1\n---\n\n# Autenticación\n\n### Requisito: REQ-AUTH-900 — Sesión\nProsa.\n\n#### Escenario: REQ-AUTH-900-S1 — ok\n- **CUANDO** a\n- **ENTONCES** b\n`,
      'utf8',
    )
    const snapshot = await buildSnapshot(root)
    expect(snapshot!.specs).toHaveLength(1)
    expect(snapshot!.specs[0]!.items).toHaveLength(1)
    expect(snapshot!.specs[0]!.items[0]!.id).toBe('REQ-AUTH-900')
    expect(snapshot!.specs[0]!.items[0]!.scenarios).toBe(1)
    expect(snapshot!.changes[0]!.state).toBe('ready')
  })
})

describe('matriz, tablero y métricas', () => {
  it('buildMatrix detecta huecos de tarea y evidencia', async () => {
    const root = await makeWorkspace(true)
    const matrix = await buildMatrix(root)
    expect(matrix.requirements).toHaveLength(1)
    expect(matrix.requirements[0]!.scenarios[0]!.tasks).toEqual(['T1.1'])
    expect(matrix.requirements[0]!.scenarios[0]!.evidence).toBe('pass')
    expect(matrix.uncoveredScenarios).toEqual([])

    const uncovered = await buildMatrix(root)
    expect(uncovered.pendingEvidence).toEqual([])

    const html = matrixHtml(matrix)
    expect(html).toContain('Cobertura requisito → evidencia')
    expect(html).toContain('command:specatlas.openAt')
    expect(html).toContain('kpi')
    expect(html).toContain('donut')

    const missing = matrixHtml({ requirements: [], uncoveredScenarios: ['REQ-X-001-S1'], pendingEvidence: ['REQ-X-001-S1'], requirementsWithoutTasks: ['REQ-X-001'] })
    expect(missing).toContain('Sin requisitos todavía')
  })

  it('boardHtml agrupa por estado con progreso', async () => {
    const root = await makeWorkspace(true)
    const snapshot = await buildSnapshot(root)
    const html = boardHtml(snapshot!)
    expect(html).toContain('Listo para archivar')
    expect(html).toContain('reset-password')
    expect(html).toContain('col-head')
    expect(html).toContain('progress')
    expect(html).toContain('fill="color-mix(in srgb, var(--atlas-ink) 6%, transparent)"')
    expect(html).toContain('stroke="color-mix(in srgb, var(--atlas-ink) 16%, transparent)"')
    expect(html).toContain('class="donut-chart"')
    expect(html).toContain('url(#atlas-donut-')
  })

  it('la matriz y el tablero traen filtros listos para usar', async () => {
    const root = await makeWorkspace(true)
    const matrix = await buildMatrix(root)
    const requirement = matrix.requirements[0]!
    expect(requirement.domain).toBe('auth')
    expect(requirement.changes).toContain('reset-password')

    const matrixPage = matrixHtml(matrix, 'nonce1')
    expect(matrixPage).toContain('id="mq"')
    expect(matrixPage).toContain('data-group="REQ-AUTH-001"')
    expect(matrixPage).toMatch(/data-gap="[01]"/)
    expect(matrixPage).toContain('data-changes="reset-password"')
    expect(matrixPage).toContain('nonce="nonce1"')
    expect(matrixPage).toContain('Content-Security-Policy')
    expect(matrixPage).toContain('data-domain="auth"')

    const snapshot = await buildSnapshot(root)
    const boardPage = boardHtml(snapshot!, 'nonce2')
    expect(boardPage).toContain('id="bq"')
    expect(boardPage).toContain('data-count="')
    expect(boardPage).toContain('data-lane="standard"')
    expect(boardPage).toContain('nonce="nonce2"')
  })

  it('metricsHtml resume totales, WIP y evidencia', async () => {
    const root = await makeWorkspace(true)
    const metrics = await collectMetrics(root)
    const html = metricsHtml(metrics)
    expect(html).toContain('Salud del proceso — vscode-demo')
    expect(html).toContain('WIP por estado')
    expect(html).toContain('Evidencia por método')
    expect(html).toContain('manual')
    expect(html).toContain('donut')
  })
})

describe('presentación y diagnósticos', () => {
  it('toFlat normaliza severidad y línea', () => {
    const flat = toFlat({ code: 'LINT-BIZ-001', severity: 'warning', message: 'x', path: 'a.md', line: 7, suggestion: 'y' })
    expect(flat).toMatchObject({ severity: 'warning', line: 7, file: 'a.md', code: 'LINT-BIZ-001' })
  })

  it('previewHtml renderiza markdown, código resaltado y aviso de mermaid', () => {
    const html = previewHtml('spec.md', '# Título\n\nTexto **fuerte**.\n\n```mermaid\nflowchart LR\n  A-->B\n```\n\n```ts\nconst x = 1\n```\n')
    expect(html).toMatch(/<h1[^>]*>Título<\/h1>/)
    expect(html).toContain('<strong>fuerte</strong>')
    expect(html).toMatch(/diagrama mermaid/i)
    expect(html).toContain('class="hljs language-ts"')
    expect(html).toContain('--atlas-accent')
  })

  it('previewHtml con mermaidUri activa el modo script y la CSP', () => {
    const html = previewHtml('spec.md', '```mermaid\ngraph TD\nA-->B\n```', {
      mermaidUri: 'vscode-webview://abc/media/mermaid.min.js',
      cspSource: 'vscode-webview://abc',
      nonce: 'n1',
    })
    expect(html).toContain('Content-Security-Policy')
    expect(html).toContain('media/mermaid.min.js')
    expect(html).toContain('mermaid.initialize')
  })

})

describe('paneles y acciones del sidebar', () => {
  it('con workspace inicializado lista los paneles con icono y comando', () => {
    const items = toolItems(true)
    expect(items.map((item) => item.command)).toEqual([
      'specatlas.new',
      'specatlas.matrix',
      'specatlas.board',
      'specatlas.metrics',
      'specatlas.validate',
      'specatlas.ci',
      'specatlas.doctor',
      'specatlas.adapters',
    ])
    for (const item of items) {
      expect(item.icon.length, `${item.id} con icono`).toBeGreaterThan(0)
      expect(item.label.length, `${item.id} con etiqueta`).toBeGreaterThan(0)
    }
  })

  it('sin workspace ofrece inicializar y compilar adaptadores', () => {
    expect(toolItems(false).map((item) => item.command)).toEqual(['specatlas.init', 'specatlas.adapters'])
  })
})