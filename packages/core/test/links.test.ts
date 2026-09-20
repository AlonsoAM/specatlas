import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createChange } from '../src/new'
import { initWorkspace } from '../src/init'
import { loadChange, loadWorkspace } from '../src/workspace'
import { checkTrace } from '../src/trace'
import { impactOfRequirement } from '../src/impact'
import { addLink, linkedRequirementIds, linkedTraceInput, loadLinks, removeLink } from '../src/links'

const LINKED_SPEC = `---
domain: externo
title: Contrato externo
version: 1
updated: 2026-09-20
---

# Contrato externo

### Requisito: REQ-EXT-001 — Servicio de terceros
El sistema DEBE consumir el servicio de terceros.

#### Escenario: REQ-EXT-001-S1 — Consumo válido
- **CUANDO** el sistema consume el servicio
- **ENTONCES** recibe la respuesta
`

const LOCAL_DELTA = `# Delta — Integrar servicio

## Requisitos agregados

### Requisito: REQ-LOCAL-001 — Integrar
El sistema DEBE integrar el servicio externo.

#### Escenario: REQ-LOCAL-001-S1 — Integración
- **CUANDO** el sistema integra el servicio
- **ENTONCES** queda integrado
`

const LOCAL_TASKS = `# Tareas

## Bloque 1 — Integración

- [ ] T1.1 Consumir el servicio externo · Archivos: src/integracion.ts · Cubre: REQ-EXT-001
`

async function writeArtifact(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, '.sdd', ...rel.split('/'))
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

async function makeLinked(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-linked-'))
  await initWorkspace({ root, name: 'externo', language: 'es' })
  await writeArtifact(root, 'specs/externo/spec.md', LINKED_SPEC)
  return root
}

async function makeLocal(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-local-'))
  await initWorkspace({ root, name: 'local', language: 'es' })
  await createChange({ root, slug: 'integracion', lane: 'standard', domain: 'integracion', title: 'Integrar servicio' })
  await writeArtifact(root, 'changes/integracion/spec.md', LOCAL_DELTA)
  await writeArtifact(root, 'changes/integracion/tasks.md', LOCAL_TASKS)
  return root
}

async function hashes(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  async function rec(dir: string): Promise<void> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await rec(full)
      else out.set(full, await fs.readFile(full, 'utf8'))
    }
  }
  await rec(root)
  return out
}

describe('registro de enlaces', () => {
  it('registra, lista y quita un enlace (REQ-INTEGRACIONES-003-S1, REQ-INTEGRACIONES-003-S2, REQ-INTEGRACIONES-003-S3)', async () => {
    const linked = await makeLinked()
    const local = await makeLocal()

    const added = await addLink(local, { path: linked })
    expect(added.diagnostics).toEqual([])
    expect(added.entry?.name).toBe('externo')

    const state = await loadLinks(local)
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]?.available).toBe(true)
    expect(state.entries[0]?.requirements).toBe(1)
    expect(state.entries[0]?.domains).toEqual(['externo'])
    expect(linkedRequirementIds(state)).toEqual(['REQ-EXT-001'])

    const removed = await removeLink(local, 'externo')
    expect(removed.removed).toBe('externo')
    expect((await loadLinks(local)).entries).toEqual([])
  })

  it('un enlace que no es proyecto se rechaza con aviso (REQ-INTEGRACIONES-003-S4)', async () => {
    const local = await makeLocal()
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-empty-'))
    const result = await addLink(local, { path: empty })
    expect(result.entry).toBeUndefined()
    expect(result.diagnostics.some((finding) => finding.code === 'ATLAS-LINK-002')).toBe(true)
  })

  it('un enlace no disponible se informa sin romper el trabajo (REQ-INTEGRACIONES-003-S4)', async () => {
    const linked = await makeLinked()
    const local = await makeLocal()
    await addLink(local, { path: linked })
    await fs.rm(linked, { recursive: true, force: true })

    const state = await loadLinks(local)
    expect(state.entries[0]?.available).toBe(false)
    expect(state.unavailable).toEqual(['externo'])
    expect(state.specs).toEqual([])
  })

  it('la consulta de enlaces no modifica el proyecto enlazado (REQ-INTEGRACIONES-003-S5)', async () => {
    const linked = await makeLinked()
    const local = await makeLocal()
    await addLink(local, { path: linked })
    const before = await hashes(linked)
    await loadLinks(local)
    const workspace = await loadWorkspace(local)
    expect(workspace.workspace.links?.entries).toHaveLength(1)
    const after = await hashes(linked)
    expect(after).toEqual(before)
  })

  it('quitar un enlace inexistente avisa sin efectos (REQ-INTEGRACIONES-005-S4)', async () => {
    const local = await makeLocal()
    const result = await removeLink(local, 'no-existe')
    expect(result.removed).toBeUndefined()
    expect(result.diagnostics.some((finding) => finding.code === 'ATLAS-LINK-003')).toBe(true)
  })
})

describe('requisitos enlazados en trazabilidad e impacto', () => {
  it('una tarea que cubre un requisito externo resuelve (REQ-INTEGRACIONES-004-S1)', async () => {
    const linked = await makeLinked()
    const local = await makeLocal()
    await addLink(local, { path: linked })

    const { workspace } = await loadWorkspace(local)
    const change = await loadChange(local, 'integracion')
    const result = checkTrace({ specs: workspace.specs, change, requireEvidence: false, linked: linkedTraceInput(workspace) })
    expect(result.findings.filter((finding) => finding.code === 'TRACE-003')).toEqual([])
  })

  it('el impacto de un requisito externo lo marca con su origen (REQ-INTEGRACIONES-004-S1, REQ-INTEGRACIONES-004-S3)', async () => {
    const linked = await makeLinked()
    const local = await makeLocal()
    await addLink(local, { path: linked })

    const { workspace } = await loadWorkspace(local)
    const report = impactOfRequirement(workspace, 'REQ-EXT-001')
    expect(report.exists).toBe(true)
    expect(report.external).toBe(true)
    expect(report.origin).toBe('externo')
    expect(report.scenarios).toEqual(['REQ-EXT-001-S1'])
    expect(report.tasks.map((task) => task.id)).toEqual(['T1.1'])

    const localReport = impactOfRequirement(workspace, 'REQ-LOCAL-001')
    expect(localReport.exists).toBe(true)
    expect(localReport.external).toBeUndefined()
  })

  it('una referencia a un enlace no disponible se reporta como no resuelta (REQ-INTEGRACIONES-004-S2)', async () => {
    const linked = await makeLinked()
    const local = await makeLocal()
    await addLink(local, { path: linked })
    await fs.rm(linked, { recursive: true, force: true })

    const { workspace } = await loadWorkspace(local)
    const change = await loadChange(local, 'integracion')
    const result = checkTrace({ specs: workspace.specs, change, requireEvidence: false, linked: linkedTraceInput(workspace) })
    expect(result.findings.some((finding) => finding.code === 'TRACE-003')).toBe(true)
    const unresolved = result.findings.find((finding) => finding.code === 'ATLAS-LINK-003')
    expect(unresolved?.message).toContain('externo')
  })

  it('sin enlaces las consultas funcionan igual (REQ-INTEGRACIONES-004-S4)', async () => {
    const local = await makeLocal()
    const { workspace } = await loadWorkspace(local)
    expect(workspace.links).toBeUndefined()
    const change = await loadChange(local, 'integracion')
    const result = checkTrace({ specs: workspace.specs, change, requireEvidence: false, linked: linkedTraceInput(workspace) })
    expect(result.findings.some((finding) => finding.code === 'ATLAS-LINK-003')).toBe(false)
  })
})
