import { describe, expect, it } from 'vitest'
import type { Change, Delta, Evidence, Requirement, SpecFile, SpecRef, TasksFile, Workspace } from '../src/model'
import { impactOfFile, impactOfRequirement } from '../src/impact'
import { parseGlossary } from '../src/parse/glossary'

function requirement(id: string, scenarios: string[]): Requirement {
  return {
    id,
    title: `Requisito ${id}`,
    prose: 'Necesidad de negocio.',
    rules: [],
    scenarios: scenarios.map((sid, i) => ({ id: sid, title: `Escenario ${sid}`, reqId: id, when: ['CUANDO ocurre'], then: ['ENTONCES pasa'], line: 10 + i })),
    line: 5,
  }
}

function specRef(domain: string, reqs: Requirement[]): SpecRef {
  const spec: SpecFile = { path: `specs/${domain}/spec.md`, frontmatter: { domain }, requirements: reqs, diagnostics: [] }
  return { domain, path: spec.path, spec }
}

function changeWith(slug: string, delta?: Delta, tasks?: TasksFile, verify?: { evidence: Evidence[] }): Change {
  const change: Change = { slug, dir: `.sdd/changes/${slug}`, diagnostics: [] }
  if (delta) change.delta = delta
  if (tasks) change.tasks = tasks
  if (verify) change.verify = { path: `.sdd/changes/${slug}/verify.md`, evidence: verify.evidence, diagnostics: [] }
  return change
}

function deltaWith(reqs: Requirement[]): Delta {
  return { path: 'changes/demo/spec.md', added: reqs, modified: [], removed: [], renamed: [], sectionsFound: ['added'], diagnostics: [] }
}

function workspace(changes: Change[], specs: SpecRef[]): Workspace {
  return { root: '/repo', sddDir: '/repo/.sdd', specs, changes, diagnostics: [] }
}

const GLOSSARY_MD = `# Glosario de negocio

> Términos con el significado que les da el negocio.

| Término | Definición | Sinónimos aceptados |
|---|---|---|
| Cliente | Persona u organización que contrata el servicio | Usuario, Consumidor |
| Solicitud | Pedido formal de un cliente | Ticket |
`

describe('parseGlossary', () => {
  it('extrae términos, definiciones y sinónimos de la tabla', () => {
    const parsed = parseGlossary(GLOSSARY_MD, 'glossary.md')
    expect(parsed.terms).toHaveLength(2)
    expect(parsed.terms[0]).toEqual({ term: 'Cliente', definition: 'Persona u organización que contrata el servicio', synonyms: ['Usuario', 'Consumidor'] })
    expect(parsed.terms[1]).toEqual({ term: 'Solicitud', definition: 'Pedido formal de un cliente', synonyms: ['Ticket'] })
    expect(parsed.diagnostics).toHaveLength(0)
  })

  it('devuelve vacío y sin diagnósticos con contenido sin tabla', () => {
    const parsed = parseGlossary('', 'glossary.md')
    expect(parsed.terms).toHaveLength(0)
    expect(parsed.diagnostics).toHaveLength(0)
  })

  it('ignora el encabezado y el separador, y avisa de filas inválidas', () => {
    const parsed = parseGlossary(`| Término | Definición |\n|---|---|\n| Cliente |\n`, 'glossary.md')
    expect(parsed.terms).toHaveLength(0)
    expect(parsed.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('impactOfRequirement', () => {
  it('encuentra escenarios, tareas, cambios, archivos y evidencia de un requisito vivo', () => {
    const req = requirement('REQ-AUTH-001', ['REQ-AUTH-001-S1', 'REQ-AUTH-001-S2'])
    const change = changeWith(
      'reset-password',
      undefined,
      {
        path: 'changes/reset-password/tasks.md',
        blocks: [
          {
            id: '1',
            title: 'API',
            line: 3,
            tasks: [
              { id: 'T1.1', block: '1', text: 'Endpoint', done: true, files: ['src/reset.ts'], covers: ['REQ-AUTH-001-S1'], dependsOn: [], infra: false, line: 5 },
              { id: 'T1.2', block: '1', text: 'Pruebas', done: true, files: ['test/reset.test.ts'], covers: ['REQ-AUTH-001-S1', 'REQ-AUTH-001-S2'], dependsOn: ['T1.1'], infra: false, line: 6 },
            ],
          },
        ],
        diagnostics: [],
        counts: { done: 2, total: 2 },
      },
      { evidence: [{ scenario: 'REQ-AUTH-001-S1', method: 'executable', result: 'pass', date: '2026-09-15', by: 'ana', line: 5 }] },
    )
    const report = impactOfRequirement(workspace([change], [specRef('auth', [req])]), 'req-auth-001')
    expect(report.exists).toBe(true)
    expect(report.scenarios).toEqual(['REQ-AUTH-001-S1', 'REQ-AUTH-001-S2'])
    expect(report.tasks.map((t) => t.id)).toEqual(['T1.1', 'T1.2'])
    expect(report.changes).toEqual(['reset-password'])
    expect(report.files).toEqual(['src/reset.ts', 'test/reset.test.ts'])
    expect(report.evidence).toEqual([{ scenario: 'REQ-AUTH-001-S1', result: 'pass', change: 'reset-password' }])
    expect(report.requirements).toContain('REQ-AUTH-001')
  })

  it('encuentra un requisito que solo existe en un delta activo', () => {
    const req = requirement('REQ-MCP-001', ['REQ-MCP-001-S1'])
    const change = changeWith('mcp-server', deltaWith([req]))
    const report = impactOfRequirement(workspace([change], []), 'REQ-MCP-001')
    expect(report.exists).toBe(true)
    expect(report.scenarios).toEqual(['REQ-MCP-001-S1'])
    expect(report.tasks).toHaveLength(0)
  })

  it('indica que no existe cuando no hay relaciones registradas', () => {
    const report = impactOfRequirement(workspace([], []), 'REQ-NADA-001')
    expect(report.exists).toBe(false)
    expect(report.tasks).toHaveLength(0)
    expect(report.evidence).toHaveLength(0)
  })
})

describe('impactOfFile', () => {
  it('encuentra las tareas y requisitos que mencionan el archivo (exacto, sufijo y nombre base)', () => {
    const reqA = requirement('REQ-AUTH-001', ['REQ-AUTH-001-S1'])
    const reqB = requirement('REQ-BIZ-002', ['REQ-BIZ-002-S1'])
    const tasks: TasksFile = {
      path: 'changes/demo/tasks.md',
      blocks: [
        {
          id: '1',
          title: 'Núcleo',
          line: 3,
          tasks: [
            { id: 'T1.1', block: '1', text: 'Módulo', done: true, files: ['packages/core/src/impact.ts'], covers: ['REQ-AUTH-001-S1'], dependsOn: [], infra: false, line: 5 },
            { id: 'T1.2', block: '1', text: 'Pruebas', done: true, files: ['packages/core/test/impact.test.ts'], covers: ['REQ-BIZ-002-S1'], dependsOn: [], infra: false, line: 6 },
          ],
        },
      ],
      diagnostics: [],
      counts: { done: 2, total: 2 },
    }
    const change = changeWith('demo', undefined, tasks)
    const ws = workspace([change], [specRef('auth', [reqA]), specRef('biz', [reqB])])

    const exact = impactOfFile(ws, 'packages/core/src/impact.ts')
    expect(exact.exists).toBe(true)
    expect(exact.tasks.map((t) => t.id)).toEqual(['T1.1'])
    expect(exact.requirements).toEqual(['REQ-AUTH-001'])
    expect(exact.changes).toEqual(['demo'])

    const byBasename = impactOfFile(ws, 'impact.ts')
    expect(byBasename.exists).toBe(true)
    expect(byBasename.tasks.map((t) => t.id)).toEqual(['T1.1'])

    const bySuffix = impactOfFile(ws, './core/test/impact.test.ts')
    expect(bySuffix.exists).toBe(true)
    expect(bySuffix.requirements).toEqual(['REQ-BIZ-002'])
  })

  it('indica que no hay relaciones para un archivo desconocido', () => {
    const report = impactOfFile(workspace([], []), 'src/no-existe.ts')
    expect(report.exists).toBe(false)
    expect(report.tasks).toHaveLength(0)
    expect(report.requirements).toHaveLength(0)
  })
})
