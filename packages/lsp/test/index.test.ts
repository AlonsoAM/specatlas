import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createChange, initWorkspace } from '@specatlas/core'
import {
  buildIndex,
  codeLenses,
  documentSymbols,
  findOccurrences,
  hoverFor,
  locationOf,
  quickFixes,
  tokenAtPosition,
} from '../src/index'

const DELTA = `# Delta — Restablecer contraseña

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

- Regla BR-AUTH-001: El enlace vence a los 30 minutos.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** el usuario solicita restablecer con un email registrado
- **ENTONCES** recibe un enlace de un solo uso

#### Escenario: REQ-AUTH-001-S2 — Correo no registrado
- **CUANDO** el usuario usa un correo no registrado
- **ENTONCES** recibe el mismo mensaje

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados
`

const TASKS = `# Tareas

## Bloque 1 — API

- [x] T1.1 Endpoint · Archivos: src/reset.ts · Cubre: REQ-AUTH-001-S1
- [ ] T1.2 Mensaje uniforme · Archivos: src/reset.ts
`

const VERIFY = `# Verificación

### REQ-AUTH-001-S1 — Solicitud válida

\`\`\`evidence
method: executable
command: npm test
result: pass
date: 2026-09-15T18:00:00Z
by: Ana
\`\`\`
`

interface Fixture {
  root: string
  changeDir: string
  deltaPath: string
  tasksPath: string
  verifyPath: string
}

async function makeFixture(): Promise<Fixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-lsp-'))
  await initWorkspace({ root, name: 'lsp-demo', language: 'es' })
  await createChange({ root, slug: 'reset-password', lane: 'standard', domain: 'auth', title: 'Restablecer contraseña' })
  const changeDir = path.join(root, '.sdd', 'changes', 'reset-password')
  await fs.writeFile(path.join(changeDir, 'spec.md'), DELTA, 'utf8')
  await fs.writeFile(path.join(changeDir, 'tasks.md'), TASKS, 'utf8')
  await fs.writeFile(path.join(changeDir, 'verify.md'), VERIFY, 'utf8')
  return {
    root,
    changeDir,
    deltaPath: path.join(changeDir, 'spec.md'),
    tasksPath: path.join(changeDir, 'tasks.md'),
    verifyPath: path.join(changeDir, 'verify.md'),
  }
}

describe('buildIndex', () => {
  it('indexa requisitos, escenarios, tareas, evidencia y olas', async () => {
    const fixture = await makeFixture()
    const index = await buildIndex(fixture.root)
    expect(index.requirements.get('REQ-AUTH-001')?.living).toBe(false)
    expect(index.requirements.get('REQ-AUTH-001')?.scenarios).toEqual(['REQ-AUTH-001-S1', 'REQ-AUTH-001-S2'])
    expect(index.scenarios.get('REQ-AUTH-001-S1')?.reqId).toBe('REQ-AUTH-001')
    expect(index.tasks.get('T1.1')?.done).toBe(true)
    expect(index.tasks.get('T1.1')?.wave).toBeUndefined()
    expect(index.tasks.get('T1.2')?.wave).toBe(1)
    expect(index.evidence.get('REQ-AUTH-001-S1')?.[0]?.result).toBe('pass')
    expect(index.files.size).toBeGreaterThan(0)
  })

  it('detecta huecos de trazabilidad en los diagnósticos', async () => {
    const fixture = await makeFixture()
    const index = await buildIndex(fixture.root)
    expect(index.diagnostics.some((d) => d.code === 'TRACE-002' && d.message.includes('REQ-AUTH-001-S2'))).toBe(true)
  })
})

describe('navegación', () => {
  it('tokenAtPosition reconoce ids y locationOf los resuelve', async () => {
    const fixture = await makeFixture()
    const index = await buildIndex(fixture.root)
    const line = '- [x] T1.1 Endpoint · Archivos: src/reset.ts · Cubre: REQ-AUTH-001-S1'
    const token = tokenAtPosition(line, line.indexOf('REQ-AUTH'))
    expect(token?.token).toBe('REQ-AUTH-001-S1')
    const location = locationOf(index, 'REQ-AUTH-001-S1')
    expect(location?.file).toBe(fixture.deltaPath)
    expect(location?.line).toBeGreaterThan(0)
  })

  it('findOccurrences encuentra el id en delta, tareas y verificación', async () => {
    const fixture = await makeFixture()
    const index = await buildIndex(fixture.root)
    const occurrences = findOccurrences(index, 'REQ-AUTH-001-S1')
    const files = new Set(occurrences.map((o) => o.file))
    expect(files.has(fixture.deltaPath)).toBe(true)
    expect(files.has(fixture.tasksPath)).toBe(true)
    expect(files.has(fixture.verifyPath)).toBe(true)
  })

  it('hoverFor describe requisito, escenario y tarea', async () => {
    const fixture = await makeFixture()
    const index = await buildIndex(fixture.root)
    expect(hoverFor(index, 'REQ-AUTH-001')?.markdown).toContain('Tareas: T1.1')
    expect(hoverFor(index, 'REQ-AUTH-001-S1')?.markdown).toContain('pass')
    expect(hoverFor(index, 'T1.1')?.markdown).toContain('hecha')
    expect(hoverFor(index, 'NO-EXISTE')).toBeUndefined()
  })
})

describe('símbolos, lentes y quick fixes', () => {
  it('documentSymbols cubre spec, tareas y verificación', async () => {
    const fixture = await makeFixture()
    const deltaSymbols = documentSymbols(DELTA, fixture.deltaPath)
    expect(deltaSymbols[0]?.name).toContain('REQ-AUTH-001')
    expect(deltaSymbols[0]?.children).toHaveLength(2)

    const taskSymbols = documentSymbols(TASKS, fixture.tasksPath)
    expect(taskSymbols[0]?.kind).toBe('block')
    expect(taskSymbols[0]?.children).toHaveLength(2)

    const verifySymbols = documentSymbols(VERIFY, fixture.verifyPath)
    expect(verifySymbols[0]?.name).toBe('REQ-AUTH-001-S1')
  })

  it('codeLenses muestra olas, cobertura y evidencia', async () => {
    const fixture = await makeFixture()
    const index = await buildIndex(fixture.root)
    const taskLenses = codeLenses(index, fixture.tasksPath, TASKS)
    expect(taskLenses.some((l) => l.title === 'ola 1 · pendiente')).toBe(true)
    expect(taskLenses.some((l) => l.title === 'hecha')).toBe(true)

    const specLenses = codeLenses(index, fixture.deltaPath, DELTA)
    expect(specLenses.some((l) => l.title.includes('1 tarea(s) · evidencia 1/2'))).toBe(true)
    expect(specLenses.some((l) => l.title.includes('evidencia: pass'))).toBe(true)
    expect(specLenses.some((l) => l.title.includes('pendiente'))).toBe(true)
  })

  it('quickFix añade Cubre al escenario sin cubrir y copia el bloque vivo', async () => {
    const fixture = await makeFixture()
    const index = await buildIndex(fixture.root)
    const lines = TASKS.split('\n')
    const taskLine = lines.findIndex((l) => l.includes('T1.2'))
    const actions = quickFixes(index, fixture.tasksPath, taskLine, TASKS, [])
    expect(actions.some((a) => a.title.includes('Cubre: REQ-AUTH-001-S2'))).toBe(true)

    const livingDir = path.join(fixture.root, '.sdd', 'specs', 'auth')
    await fs.mkdir(livingDir, { recursive: true })
    await fs.writeFile(
      path.join(livingDir, 'spec.md'),
      `---\ndomain: auth\ntitle: Auth\nversion: 1\n---\n\n# Auth\n\n### Requisito: REQ-AUTH-001 — Restablecer contraseña\nProsa viva.\n\n#### Escenario: REQ-AUTH-001-S1 — Solicitud válida\n- **CUANDO** a\n- **ENTONCES** b\n`,
      'utf8',
    )
    const index2 = await buildIndex(fixture.root)
    const deltaWithoutScenarios = `# Delta\n\n## Requisitos modificados\n\n### Requisito: REQ-AUTH-001 — Restablecer contraseña\nProsa incompleta.\n`
    const line = deltaWithoutScenarios.split('\n').findIndex((l) => l.includes('### Requisito: REQ-AUTH-001'))
    const copyActions = quickFixes(index2, fixture.deltaPath, line, deltaWithoutScenarios, [])
    const copy = copyActions.find((a) => a.title.includes('bloque completo'))
    expect(copy?.edit?.newText).toContain('#### Escenario: REQ-AUTH-001-S1')
  })
})
