import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { explainDiagnostic, familyOf, listExplanations, parseTasksFile } from '@specatlas/core'
import type { CliContext } from '../src/cli'
import { isHumanAction, tokenize } from '../src/run-next'
import { runExplain } from '../src/commands/explain'
import { runInit } from '../src/commands/init'
import { runNew } from '../src/commands/new'
import { runNext } from '../src/commands/next'

const NL = String.fromCharCode(10)

function ctx(cwd: string, positionals: string[] = [], flags: Record<string, string | boolean> = {}): CliContext {
  return { cwd, json: false, language: 'es', flags, positionals }
}

describe('las tareas se pueden escribir como sub-viñetas', () => {
  it('lee los metadatos de debajo de la tarea igual que los de la misma línea', () => {
    const tasks = parseTasksFile(
      [
        '## Bloque 1 — Acceso',
        '',
        '- [ ] T1.1 Formulario de acceso',
        '  - Archivos: src/login.js, src/api.js',
        '  - Cubre: REQ-AUTH-001-S1, REQ-AUTH-001-S2',
        '  - Reversión: revertir commit',
        '',
        '- [x] T1.2 Otra · Archivos: src/b.ts · Cubre: REQ-AUTH-001-S1',
      ].join(NL),
      'tasks.md',
    )

    const [primera, segunda] = tasks.blocks[0]!.tasks
    expect(primera!.text).toBe('Formulario de acceso')
    expect(primera!.files).toEqual(['src/login.js', 'src/api.js'])
    expect(primera!.covers).toEqual(['REQ-AUTH-001-S1', 'REQ-AUTH-001-S2'])
    expect(primera!.rollback).toBe('revertir commit')
    expect(segunda!.covers).toEqual(['REQ-AUTH-001-S1'])
    expect(tasks.diagnostics).toHaveLength(0)
    expect(tasks.counts).toEqual({ done: 1, total: 2 })
  })

  it('una sub-viñeta que no es metadato no se traga la siguiente tarea', () => {
    const tasks = parseTasksFile(
      ['## Bloque 1 — X', '', '- [ ] T1.1 Uno · Archivos: a.ts · Cubre: REQ-A-001-S1', '  - una nota cualquiera', '- [ ] T1.2 Dos · Archivos: b.ts · Cubre: REQ-A-001-S2'].join(NL),
      'tasks.md',
    )
    expect(tasks.counts.total).toBe(2)
    expect(tasks.blocks[0]!.tasks[1]!.id).toBe('T1.2')
  })

  it('sin Cubre ni Archivos, la sugerencia nombra los dos formatos', () => {
    const tasks = parseTasksFile(['## Bloque 1 — X', '- [ ] T1.1 Sin nada'].join(NL), 'tasks.md')
    const trace = tasks.diagnostics.find((d) => d.code === 'TRACE-004')
    expect(trace?.suggestion).toContain('sub-viñeta')
    expect(tasks.diagnostics.find((d) => d.code === 'LINT-TSK-001')?.suggestion).toContain('sub-viñeta')
  })
})

describe('explicación de los códigos de diagnóstico', () => {
  it('explica un código con ficha propia', async () => {
    const result = await runExplain(ctx(process.cwd(), ['trace-002']))
    const text = (result.text ?? []).join(NL)
    expect(result.exitCode).toBe(0)
    expect(text).toContain('TRACE-002')
    expect(text).toContain('Por qué importa')
    expect(text).toContain('Cómo se cierra')
  })

  it('un código sin ficha responde por familia', () => {
    const { explanation, family } = explainDiagnostic('ATLAS-GH-007')
    expect(explanation).toBeUndefined()
    expect(family?.prefix).toBe('ATLAS')
    expect(familyOf('LINT-BIZ-003')?.prefix).toBe('LINT-BIZ')
  })

  it('sin argumento lista familias y fichas', async () => {
    const result = await runExplain(ctx(process.cwd()))
    const text = (result.text ?? []).join(NL)
    expect(text).toContain('Familias:')
    expect(listExplanations().length).toBeGreaterThan(20)
  })

  it('un código inventado se rechaza con su código de uso', async () => {
    const result = await runExplain(ctx(process.cwd(), ['NO-EXISTE-999']))
    expect(result.exitCode).toBe(2)
    expect(result.diagnostics[0]?.code).toBe('ATLAS-EXPLAIN-001')
  })
})

describe('ejecutar la siguiente acción', () => {
  it('reconoce lo que decide una persona', () => {
    expect(isHumanAction('satlas approve login --by "Alonso"')).toBe(true)
    expect(isHumanAction('satlas archive login')).toBe(true)
    expect(isHumanAction('satlas validate --change login')).toBe(false)
  })

  it('separa la instrucción respetando las comillas', () => {
    expect(tokenize('satlas verify login --command "npm test -- auth" --by "Alonso Anchante"')).toEqual([
      'satlas',
      'verify',
      'login',
      '--command',
      'npm test -- auth',
      '--by',
      'Alonso Anchante',
    ])
  })

  it('`next --run` ejecuta el comando determinista del cambio', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'satlas-next-run-'))
    await runInit(ctx(root, [], { name: 'demo' }))
    await runNew(ctx(root, ['login'], { domain: 'auth', title: 'Iniciar sesión' }))
    await fs.writeFile(
      path.join(root, '.sdd', 'changes', 'login', 'spec.md'),
      [
        '# Delta — Iniciar sesión',
        '',
        '## Requisitos agregados',
        '',
        '### Requisito: REQ-AUTH-001 — Iniciar sesión',
        'El solicitante accede con sus credenciales vigentes.',
        '',
        '- Regla BR-AUTH-001: la sesión caduca a los 30 minutos sin actividad',
        '',
        '#### Escenario: REQ-AUTH-001-S1 — Credenciales válidas',
        '- **CUANDO** el solicitante envía credenciales vigentes',
        '- **ENTONCES** obtiene acceso y ve su panel inicial',
      ].join(NL),
      'utf8',
    )

    // El cambio está sin aprobar: la siguiente acción es generar la propuesta.
    const result = await runNext(ctx(root, ['login'], { run: true }))
    expect((result.text ?? [])[0]).toContain('satlas present login')
    expect(await fs.stat(path.join(root, '.sdd', 'changes', 'login', 'presentation', 'index.html'))).toBeTruthy()
  })

  it('no dispara solo lo que firma una persona', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'satlas-next-human-'))
    await runInit(ctx(root, [], { name: 'demo' }))
    await runNew(ctx(root, ['arreglo'], { domain: 'auth', lane: 'fix', title: 'Arreglo' }))
    await fs.writeFile(
      path.join(root, '.sdd', 'changes', 'arreglo', 'fix.md'),
      ['# Fix — Arreglo', '', '## Evidencia', '', '```evidence', 'method: manual', 'result: pass', 'date: 2026-01-01T00:00:00Z', 'by: Alonso', 'scenario: REQ-AUTH-001-S1', '```'].join(NL),
      'utf8',
    )

    const result = await runNext(ctx(root, ['arreglo'], { run: true }))
    const text = (result.text ?? []).join(NL)
    expect(text).toContain('satlas archive arreglo')
    expect(text).toContain('acto humano')
    expect((result.data as { ran: boolean }).ran).toBe(false)
  })
})
