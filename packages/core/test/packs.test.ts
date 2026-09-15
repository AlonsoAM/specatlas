import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { initWorkspace } from '../src/init'
import { createChange } from '../src/new'
import { loadConfig, writeConfig } from '../src/config'
import { loadWorkspace } from '../src/workspace'
import { recordEvidence } from '../src/evidence'
import { evaluatePacks, loadProjectPacks, packFindings, resolvePacks } from '../src/packs'
import { runAnalyze } from '../src/analyze'

const DELTA = `# Delta — Reset

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Reset
El sistema DEBE permitir restablecer la contraseña por email con consentimiento del titular.

- Regla BR-AUTH-001: El enlace vence a los 30 minutos.

#### Escenario: REQ-AUTH-001-S1 — Caso
- **CUANDO** el usuario usa un email registrado
- **ENTONCES** recibe un enlace
`

const TASKS_WITH_ROLLBACK = `# Tareas

## Bloque 1 — API

- [x] T1.1 Endpoint · Archivos: src/a.ts · Cubre: REQ-AUTH-001-S1 · Reversión: revertir el commit
`

const TASKS_WITHOUT_ROLLBACK = `# Tareas

## Bloque 1 — API

- [x] T1.1 Endpoint · Archivos: src/a.ts · Cubre: REQ-AUTH-001-S1
`

async function makeWorkspace(packs: string[], tasks: string, domain = 'backend'): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-packs-'))
  await initWorkspace({ root, name: 'packs-demo', language: 'es' })
  const loaded = await loadConfig(path.join(root, '.sdd'))
  await writeConfig(path.join(root, '.sdd'), { ...loaded.config, packs })
  await createChange({ root, slug: 'reset-password', lane: 'standard', domain, title: 'Reset' })
  const dir = path.join(root, '.sdd', 'changes', 'reset-password')
  await fs.writeFile(path.join(dir, 'spec.md'), DELTA, 'utf8')
  await fs.writeFile(path.join(dir, 'tasks.md'), tasks, 'utf8')
  return root
}

describe('packs de cumplimiento', () => {
  it('seguridad exige Reversión en cada tarea', async () => {
    const without = await makeWorkspace(['seguridad'], TASKS_WITHOUT_ROLLBACK)
    const loaded = await loadWorkspace(without)
    const resolved = await resolvePacks(loaded.workspace.sddDir, loaded.config)
    const change = loaded.workspace.changes[0]!
    const failing = evaluatePacks(resolved.packs, change, loaded.config)
    expect(failing[0]!.status).toBe('fail')
    expect(failing[0]!.results.some((result) => result.checkId === 'SEG-1' && result.status === 'fail')).toBe(true)
    expect(packFindings(failing, change).some((finding) => finding.code === 'PACK-SEGURIDAD-SEG-1')).toBe(true)

    const withRollback = await makeWorkspace(['seguridad'], TASKS_WITH_ROLLBACK)
    const ok = await loadWorkspace(withRollback)
    const evaluations = evaluatePacks((await resolvePacks(ok.workspace.sddDir, ok.config)).packs, ok.workspace.changes[0]!, ok.config)
    expect(evaluations[0]!.results.find((result) => result.checkId === 'SEG-1')?.status).toBe('ok')
  })

  it('auditoría exige evidencia ejecutable y aprobación activa', async () => {
    const root = await makeWorkspace(['auditoria'], TASKS_WITH_ROLLBACK)
    await recordEvidence({ root, slug: 'reset-password', scenario: 'REQ-AUTH-001-S1', method: 'manual', result: 'pass', by: 'Ana' })
    const loaded = await loadWorkspace(root)
    const change = loaded.workspace.changes[0]!
    const evaluations = evaluatePacks((await resolvePacks(loaded.workspace.sddDir, loaded.config)).packs, change, loaded.config)
    expect(evaluations[0]!.results.find((result) => result.checkId === 'AUD-2')?.status).toBe('fail')

    // aprobación desactivada → AUD-4 falla
    const disabled = { ...loaded.config, gates: { ...loaded.config.gates, approval: 'none' as const } }
    const withDisabled = evaluatePacks((await resolvePacks(loaded.workspace.sddDir, disabled)).packs, change, disabled)
    expect(withDisabled[0]!.results.find((result) => result.checkId === 'AUD-4')?.status).toBe('fail')
  })

  it('los controles se marcan n/a cuando el pack no aplica al dominio', async () => {
    const root = await makeWorkspace(['accesibilidad'], TASKS_WITH_ROLLBACK, 'backend')
    const loaded = await loadWorkspace(root)
    const evaluations = evaluatePacks((await resolvePacks(loaded.workspace.sddDir, loaded.config)).packs, loaded.workspace.changes[0]!, loaded.config)
    expect(evaluations[0]!.status).toBe('n/a')
    expect(evaluations[0]!.results.every((result) => result.status === 'n/a')).toBe(true)
  })

  it('carga packs del proyecto y avisa de packs inexistentes', async () => {
    const root = await makeWorkspace(['custom', 'no-existe'], TASKS_WITH_ROLLBACK)
    await fs.mkdir(path.join(root, '.sdd', 'packs'), { recursive: true })
    await fs.writeFile(
      path.join(root, '.sdd', 'packs', 'custom.yaml'),
      'id: custom\ntitle: Pack propio\ndescription: prueba\nchecks:\n  - id: CUS-1\n    title: Debe nombrar el enlace\n    type: spec-terms\n    severity: warning\n    params:\n      terms: [enlace]\n',
      'utf8',
    )
    const loaded = await loadWorkspace(root)
    const projectPacks = await loadProjectPacks(loaded.workspace.sddDir)
    expect(projectPacks.packs.map((pack) => pack.id)).toContain('custom')
    const resolved = await resolvePacks(loaded.workspace.sddDir, loaded.config)
    expect(resolved.packs.map((pack) => pack.id)).toEqual(['custom'])
    expect(resolved.diagnostics.some((finding) => finding.code === 'PACK-001')).toBe(true)

    const evaluations = evaluatePacks(resolved.packs, loaded.workspace.changes[0]!, loaded.config)
    expect(evaluations[0]!.results[0]!.status).toBe('ok')
  })

  it('analyze incluye los packs activos en el informe', async () => {
    const root = await makeWorkspace(['seguridad'], TASKS_WITHOUT_ROLLBACK)
    const result = await runAnalyze({ root, slug: 'reset-password' })
    expect(result.packs).toHaveLength(1)
    expect(result.packs![0]!.status).toBe('fail')
    const content = await fs.readFile(result.path!, 'utf8')
    expect(content).toContain('## Packs de cumplimiento')
    expect(content).toContain('Seguridad de la información')
  })
})
