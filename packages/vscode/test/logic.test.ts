import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveChange, createChange, initWorkspace, signApproval } from '@specatlas/core'
import { buildMatrix, buildSnapshot, escapeHtml, groupTasksByBlock, previewHtml, sortChanges, toFlat, toolGroups, type SnapshotChange } from '../src/logic'
import { buildPanelModel } from '../src/panel/model'
import { flujoSection } from '../src/panel/sections/flujo'
import { trazabilidadSection } from '../src/panel/sections/trazabilidad'
import { metricasSection } from '../src/panel/sections/metricas'
import { renderPanelHtml } from '../src/panel/panel'

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
    expect(change.approval?.by).toBe('Maria Perez')

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

    const metaFile = path.join(dir, 'meta.yaml')
    const metaRaw = await fs.readFile(metaFile, 'utf8')
    await fs.writeFile(metaFile, `${metaRaw.trimEnd()}\nmockups: required\n`, 'utf8')
    const required = await buildSnapshot(root)
    const requiredChange = required!.changes[0]!
    expect(requiredChange.mockups.required).toBe(true)
    expect(requiredChange.mockups.decision).toBe('required')
    expect(requiredChange.state).not.toBe('awaiting_mockups')
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
  it('[REQ-EDITOR-004-S1][REQ-EDITOR-004-S3] buildMatrix detecta huecos de tarea y evidencia', async () => {
    const root = await makeWorkspace(true)
    const matrix = await buildMatrix(root)
    expect(matrix.requirements).toHaveLength(1)
    expect(matrix.requirements[0]!.scenarios[0]!.tasks).toEqual(['T1.1'])
    expect(matrix.requirements[0]!.scenarios[0]!.evidence).toBe('pass')
    expect(matrix.uncoveredScenarios).toEqual([])

    const uncovered = await buildMatrix(root)
    expect(uncovered.pendingEvidence).toEqual([])

    const model = (await buildPanelModel(root))!
    const html = trazabilidadSection(model).html
    expect(html).toContain('Matriz')
    expect(html).toContain('command:specatlas.openAt')
    expect(html).toContain('kpi')
    expect(html).toContain('donut')

    const missing = trazabilidadSection({
      ...model,
      matrix: { requirements: [], uncoveredScenarios: ['REQ-X-001-S1'], pendingEvidence: ['REQ-X-001-S1'], requirementsWithoutTasks: ['REQ-X-001'] },
    }).html
    expect(missing).toContain('Sin requisitos todavía')
  })

  it('[REQ-EDITOR-003-S1][REQ-EDITOR-003-S2] la sección de flujo agrupa por fase con progreso', async () => {
    const root = await makeWorkspace(true)
    const model = (await buildPanelModel(root))!
    const html = flujoSection(model).html
    expect(html).toContain('Listo para archivar')
    expect(html).toContain('Esperando mockups')
    expect(html).toContain('reset-password')
    expect(html).toContain('lane-rail')
    expect(html).toContain('progress')
    const metrics = metricasSection(model).html
    expect(metrics).toContain('class="donut-chart"')
    expect(metrics).toContain('url(#atlas-donut-')
  })

  it('[REQ-EDITOR-003-S3][REQ-EDITOR-004-S4] las secciones del panel traen filtros listos para usar', async () => {
    const root = await makeWorkspace(true)
    const model = await buildPanelModel(root)
    expect(model).toBeDefined()
    const matrix = model!.matrix
    const requirement = matrix.requirements[0]!
    expect(requirement.domain).toBe('auth')
    expect(requirement.changes).toContain('reset-password')

    const traza = trazabilidadSection(model!)
    expect(traza.html).toContain('id="mq"')
    expect(traza.html).toContain('data-group="REQ-AUTH-001"')
    expect(traza.html).toMatch(/data-gap="[01]"/)
    expect(traza.html).toContain('data-changes="reset-password"')
    expect(traza.html).toContain('data-domain="auth"')

    const flujo = flujoSection(model!)
    expect(flujo.html).toContain('id="fq"')
    expect(flujo.html).toContain('data-count="')
    expect(flujo.html).toContain('data-lane="standard"')

    const page = renderPanelHtml(model!, 'flujo', 'nonce2')
    expect(page).toContain('nonce="nonce2"')
    expect(page).toContain('Content-Security-Policy')
    expect(page).toContain('data-section-panel="flujo"')
  })

  it('[REQ-EDITOR-005-S1][REQ-EDITOR-005-S2] la sección de métricas resume totales, WIP y evidencia', async () => {
    const root = await makeWorkspace(true)
    const model = await buildPanelModel(root)
    const html = metricasSection(model!).html
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
  it('[REQ-EDITOR-001-S1] ofrece el panel principal único y las acciones', () => {
    const groups = toolGroups(true)
    expect(groups.map((group) => group.label)).toEqual(['Panel principal', 'Acciones'])
    expect(groups[0]!.items.map((item) => item.command)).toEqual(['specatlas.panel'])
    expect(groups[1]!.items.map((item) => item.command)).toEqual(['specatlas.new', 'specatlas.validate', 'specatlas.ci', 'specatlas.doctor', 'specatlas.adapters'])
    for (const group of groups) {
      expect(group.icon.length, `${group.id} con icono`).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(item.icon.length, `${item.id} con icono`).toBeGreaterThan(0)
        expect(item.label.length, `${item.id} con etiqueta`).toBeGreaterThan(0)
      }
    }
  })

  it('sin workspace ofrece inicializar y compilar adaptadores', () => {
    const groups = toolGroups(false)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.items.map((item) => item.command)).toEqual(['specatlas.init', 'specatlas.adapters'])
  })
})

describe('agrupación de tareas', () => {
  it('agrupa por bloque conservando el orden de aparición', () => {
    const tasks = [
      { id: 'T1.1', title: 'a', block: 'Bloque 1 — X', done: true, line: 1, covers: 0 },
      { id: 'T2.1', title: 'b', block: 'Bloque 2 — Y', done: false, line: 2, covers: 1 },
      { id: 'T1.2', title: 'c', block: 'Bloque 1 — X', done: false, line: 3, covers: 0 },
    ]
    const groups = groupTasksByBlock(tasks)
    expect(groups.map((group) => group.block)).toEqual(['Bloque 1 — X', 'Bloque 2 — Y'])
    expect(groups[0]!.tasks.map((task) => task.id)).toEqual(['T1.1', 'T1.2'])
    expect(groups[1]!.tasks.map((task) => task.id)).toEqual(['T2.1'])
  })
})

describe('colisión de ids de tarea entre cambios', () => {
  it('un cambio nuevo que reutiliza T1.1 no borra la cobertura del cambio archivado', async () => {
    const root = await makeWorkspace(true)
    await archiveChange({ root, slug: 'reset-password' })

    await createChange({ root, slug: 'otra-cosa', lane: 'standard', domain: 'auth', title: 'Otra cosa' })
    const dir = path.join(root, '.sdd', 'changes', 'otra-cosa')
    await fs.writeFile(
      path.join(dir, 'spec.md'),
      `## Requisitos agregados

### Requisito: REQ-AUTH-900 — Otra
El sistema DEBE permitir otra cosa.

#### Escenario: REQ-AUTH-900-S1 — Caso
- **CUANDO** la persona pide otra cosa
- **ENTONCES** ocurre
`,
      'utf8',
    )
    await fs.writeFile(path.join(dir, 'tasks.md'), '## Bloque 1 — X\n\n- [ ] T1.1 Otra tarea · Archivos: src/otra.ts · Cubre: REQ-AUTH-900-S1 · Reversión: borrar\n', 'utf8')

    const matrix = await buildMatrix(root)
    const archivedRequirement = matrix.requirements.find((requirement) => requirement.id === 'REQ-AUTH-001')!
    expect(archivedRequirement.scenarios[0]!.tasks.length).toBeGreaterThan(0)
    const nuevo = matrix.requirements.find((requirement) => requirement.id === 'REQ-AUTH-900')!
    expect(nuevo.scenarios[0]!.tasks).toContain('T1.1')
  })

  it('dos cambios archivados que reutilizan T1.1 conservan ambas coberturas en la matriz', async () => {
    const root = await makeWorkspace(true)
    await archiveChange({ root, slug: 'reset-password' })

    await createChange({ root, slug: 'otro-cambio', lane: 'standard', domain: 'auth', title: 'Otro cambio' })
    const dir = path.join(root, '.sdd', 'changes', 'otro-cambio')
    await fs.writeFile(
      path.join(dir, 'spec.md'),
      `## Requisitos agregados

### Requisito: REQ-AUTH-002 — Otra cosa
El sistema DEBE permitir otra cosa.

#### Escenario: REQ-AUTH-002-S1 — Caso
- **CUANDO** la persona pide otra cosa
- **ENTONCES** ocurre
`,
      'utf8',
    )
    await fs.writeFile(path.join(dir, 'tasks.md'), '## Bloque 1 — X\n\n- [x] T1.1 Otra tarea · Archivos: src/otra.ts · Cubre: REQ-AUTH-002-S1 · Reversión: borrar\n', 'utf8')
    await signApproval({ root, artifact: 'changes/otro-cambio/spec.md', by: 'Maria Perez', channel: 'editor' })
    await archiveChange({ root, slug: 'otro-cambio' })

    const matrix = await buildMatrix(root)
    const primero = matrix.requirements.find((requirement) => requirement.id === 'REQ-AUTH-001')!
    const segundo = matrix.requirements.find((requirement) => requirement.id === 'REQ-AUTH-002')!
    expect(primero.scenarios[0]!.tasks).toContain('T1.1')
    expect(segundo.scenarios[0]!.tasks).toContain('T1.1')
  })
})

describe('artefactos de aclaración y documentación', () => {
  it('aparecen entre los archivos del cambio con su existencia (REQ-FASES-003-S1)', async () => {
    const root = await makeWorkspace(true)
    const dir = path.join(root, '.sdd', 'changes', 'reset-password')
    await fs.writeFile(path.join(dir, 'clarify.md'), '# Aclaraciones\n\n- [ ] ¿Algo pendiente?\n', 'utf8')
    await fs.mkdir(path.join(dir, 'docs'), { recursive: true })
    await fs.writeFile(path.join(dir, 'docs', 'tecnica.md'), '# Técnica\n', 'utf8')
    await fs.writeFile(path.join(dir, 'docs', 'manual.md'), '# Manual\n', 'utf8')

    const snapshot = await buildSnapshot(root)
    const files = snapshot!.changes[0]!.files
    expect(files.filter((file) => file.kind === 'clarify')).toHaveLength(1)
    expect(files.filter((file) => file.kind === 'docs')).toHaveLength(2)
    const byLabel = new Map(files.map((file) => [file.label, file.exists]))
    expect(byLabel.get('Aclaraciones')).toBe(true)
    expect(byLabel.get('Documentación técnica')).toBe(true)
    expect(byLabel.get('Manual')).toBe(true)
  })
})

describe('fixes vivos y procedencia', () => {
  const FIX = `# Fix — Arreglo de login

## Síntoma
Falla el ingreso.

## Causa raíz
Zona horaria.

## Cambio
Comparar en local.

## Rollback
Revertir.

Cubre: REQ-AUTH-001

## Evidencia

### REQ-AUTH-001-S1

\`\`\`evidence
method: manual
result: pass
date: 2026-09-20 10:00:00 -05:00
by: Prueba
\`\`\`
`

  async function makeArchivedPair(): Promise<string> {
    const root = await makeWorkspace(true)
    await createChange({ root, slug: 'arreglo', lane: 'fix', domain: 'auth', title: 'Arreglo de login' })
    await fs.writeFile(path.join(root, '.sdd', 'changes', 'arreglo', 'fix.md'), FIX, 'utf8')
    await archiveChange({ root, slug: 'arreglo' })
    await archiveChange({ root, slug: 'reset-password' })
    return root
  }

  it('el snapshot incluye fixes vivos e histórico sin fixes (REQ-FIXES-002-S1, REQ-FIXES-002-S2, REQ-FIXES-002-S3)', async () => {
    const root = await makeArchivedPair()
    const snapshot = await buildSnapshot(root)
    expect(snapshot!.fixes.map((fix) => fix.slug)).toEqual(['arreglo'])
    expect(snapshot!.fixes[0]?.domain).toBe('auth')
    expect(snapshot!.fixes[0]?.result).toBe('pass')
    expect(snapshot!.fixes[0]?.covers).toEqual(['REQ-AUTH-001'])
    expect(await fs.stat(snapshot!.fixes[0]!.path)).toBeDefined()
    expect(snapshot!.archived.map((entry) => entry.slug)).toEqual(['reset-password'])
    expect(snapshot!.archived[0]?.lane).toBe('standard')
    expect(await fs.stat(snapshot!.archived[0]!.file)).toBeDefined()
    expect(snapshot!.summary.fixes).toBe(1)
  })

  it('sin historial no hay fixes ni cambios archivados (REQ-FIXES-002-S4)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-vscode-'))
    await initWorkspace({ root, name: 'vscode-demo', language: 'es' })
    const snapshot = await buildSnapshot(root)
    expect(snapshot!.fixes).toEqual([])
    expect(snapshot!.archived).toEqual([])
    expect(snapshot!.summary.fixes).toBe(0)
  })

  it('un fix archivado antes de la función aparece igualmente (REQ-FIXES-001-S1)', async () => {
    const root = await makeWorkspace(true)
    await createChange({ root, slug: 'heredado', lane: 'fix', domain: 'auth', title: 'Heredado' })
    await fs.writeFile(path.join(root, '.sdd', 'changes', 'heredado', 'fix.md'), FIX, 'utf8')
    await fs.mkdir(path.join(root, '.sdd', 'changes', 'archive'), { recursive: true })
    await fs.cp(path.join(root, '.sdd', 'changes', 'heredado'), path.join(root, '.sdd', 'changes', 'archive', '2026-08-heredado'), { recursive: true })
    await fs.rm(path.join(root, '.sdd', 'changes', 'heredado'), { recursive: true, force: true })

    const snapshot = await buildSnapshot(root)
    const legacy = snapshot!.fixes.find((fix) => fix.slug === 'heredado')
    expect(legacy?.source).toBe('archive')
    expect(legacy?.domain).toBe('auth')
    expect(snapshot!.archived.map((entry) => entry.slug)).not.toContain('heredado')
  })

  it('la matriz muestra la procedencia de cambios archivados y fixes (REQ-FIXES-003-S1, REQ-FIXES-003-S3, REQ-FIXES-004-S1)', async () => {
    const root = await makeArchivedPair()
    const matrix = await buildMatrix(root)
    const requirement = matrix.requirements.find((r) => r.id === 'REQ-AUTH-001')!
    expect(requirement.changes).toContain('reset-password')
    expect(requirement.fixes).toContain('arreglo')

    const html = trazabilidadSection((await buildPanelModel(root))!).html
    expect(html).toContain('modificado por reset-password')
    expect(html).toContain('corregido por arreglo')
    expect(html).toContain('data-has-fixes="1"')
    expect(html).toContain('data-has-changes="1"')
    expect(html).toContain('id="mtipo"')
    expect(html).toContain('Con fixes')
    expect(html).toContain('Sin procedencia')
  })

  it('un requisito vivo sin procedencia lo dice expresamente (REQ-FIXES-003-S2)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-vscode-'))
    await initWorkspace({ root, name: 'vscode-demo', language: 'es' })
    await fs.mkdir(path.join(root, '.sdd', 'specs', 'otro'), { recursive: true })
    await fs.writeFile(
      path.join(root, '.sdd', 'specs', 'otro', 'spec.md'),
      `---\ndomain: otro\ntitle: Otro\nversion: 1\nupdated: 2026-09-20\n---\n\n# Otro\n\n### Requisito: REQ-OTRO-001 — Algo\nEl sistema DEBE hacer algo.\n\n#### Escenario: REQ-OTRO-001-S1 — Caso\n- **CUANDO** pasa algo\n- **ENTONCES** ocurre\n`,
      'utf8',
    )

    const matrix = await buildMatrix(root)
    const requirement = matrix.requirements.find((r) => r.id === 'REQ-OTRO-001')!
    expect(requirement.changes).toBeUndefined()
    expect(requirement.fixes).toBeUndefined()
    expect(trazabilidadSection((await buildPanelModel(root))!).html).toContain('sin procedencia registrada')
  })
})