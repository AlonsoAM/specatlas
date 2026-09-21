import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { initWorkspace } from '../src/init'
import { createChange } from '../src/new'
import { collectMetrics } from '../src/metrics'
import { recordEvidence } from '../src/evidence'
import { signApproval } from '../src/approvals'

const DELTA = `# Delta — Reset

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Reset
Prosa.

#### Escenario: REQ-AUTH-001-S1 — Caso
- **CUANDO** a
- **ENTONCES** b

#### Escenario: REQ-AUTH-001-S2 — Error
- **CUANDO** a
- **ENTONCES** b
`

const TASKS = `# Tareas

## Bloque 1 — API

- [x] T1.1 Uno · Archivos: src/a.ts · Cubre: REQ-AUTH-001-S1
- [ ] T1.2 Dos · Archivos: src/b.ts · Cubre: REQ-AUTH-001-S2
`

async function makeWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-metrics-'))
  await initWorkspace({ root, name: 'metrics-demo', language: 'es' })
  await createChange({ root, slug: 'reset-password', lane: 'standard', domain: 'auth', title: 'Reset' })
  const dir = path.join(root, '.sdd', 'changes', 'reset-password')
  await fs.writeFile(path.join(dir, 'spec.md'), DELTA, 'utf8')
  await fs.writeFile(path.join(dir, 'tasks.md'), TASKS, 'utf8')
  await recordEvidence({ root, slug: 'reset-password', scenario: 'REQ-AUTH-001-S1', method: 'manual', result: 'pass', by: 'Ana' })
  await signApproval({ root, artifact: 'changes/reset-password/spec.md', by: 'Ana', channel: 'editor' })
  return root
}

describe('collectMetrics', () => {
  it('agrega progreso, hallazgos, evidencia y WIP por estado', async () => {
    const root = await makeWorkspace()
    const metrics = await collectMetrics(root)
    expect(metrics.project).toBe('metrics-demo')
    expect(metrics.totals).toMatchObject({
      changes: 1,
      tasks: 2,
      tasksDone: 1,
      scenarios: 2,
      scenariosPassed: 1,
      errors: 0,
      archived: 0,
    })
    const change = metrics.changes[0]!
    expect(change.state).toBe('building')
    expect(metrics.evidenceByMethod['manual']).toBe(1)
    expect(metrics.wipByState['building']).toEqual({ label: 'construyendo', count: 1 })
  })

  it('cuenta archivados por mes y bloqueos', async () => {
    const root = await makeWorkspace()
    const archive = path.join(root, '.sdd', 'changes', 'archive')
    await fs.mkdir(path.join(archive, '2026-08-cambio-viejo'), { recursive: true })
    await fs.mkdir(path.join(archive, '2026-09-otro'), { recursive: true })
    const metrics = await collectMetrics(root)
    expect(metrics.totals.archived).toBe(2)
    expect(metrics.throughputByMonth).toEqual({ '2026-08': 1, '2026-09': 1 })
  })

  it('expone la siguiente acción por cambio', async () => {
    const root = await makeWorkspace()
    const metrics = await collectMetrics(root)
    expect(metrics.changes[0]!.next).toContain('/satlas-build')
  })

  it('calcula antigüedad, carriles y puntos de atención', async () => {
    const root = await makeWorkspace()
    const metrics = await collectMetrics(root)
    expect(metrics.aging.buckets).toHaveLength(4)
    expect(metrics.aging.buckets.reduce((acc, bucket) => acc + bucket.value, 0)).toBe(1)
    expect(metrics.aging.averageDays).toBeDefined()
    expect(metrics.byLane).toEqual([{ label: 'standard', value: 1 }])
    expect(metrics.attention).toEqual([])

    // Sin firma, el cambio queda bloqueado y aparece en atención
    await fs.rm(path.join(root, '.sdd', 'approvals.yaml'))
    const blockedMetrics = await collectMetrics(root)
    expect(blockedMetrics.attention.some((item) => item.kind === 'blocked')).toBe(true)
  })
})
