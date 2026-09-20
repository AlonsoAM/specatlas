import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { artifactHash } from '@specatlas/core'
import { toEnvelope, type CliContext } from '../src/cli'
import { runInit } from '../src/commands/init'
import { runNew } from '../src/commands/new'
import { runValidate } from '../src/commands/validate'
import { runTrace } from '../src/commands/trace'
import { runWaves } from '../src/commands/waves'
import { runStatus } from '../src/commands/status'
import { runDoctorCommand } from '../src/commands/doctor'
import { runAdapters } from '../src/commands/adapters'
import { runAnalyzeCommand } from '../src/commands/analyze'
import { runApprove } from '../src/commands/approve'
import { runArchive } from '../src/commands/archive'
import { runCi } from '../src/commands/ci'
import { runMockup } from '../src/commands/mockup'
import { runPresentCommand } from '../src/commands/present'
import { runProfile } from '../src/commands/profile'
import { runRun } from '../src/commands/run'
import { runVerify } from '../src/commands/verify'

const DELTA = `# Delta — Restablecer contraseña

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

- Regla BR-AUTH-001: El enlace vence a los 30 minutos.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** el usuario solicita restablecer con un email registrado
- **ENTONCES** recibe un enlace de un solo uso
`

const TASKS = `# Tareas

## Bloque 1 — API

- [x] T1.1 Endpoint de solicitud · Archivos: src/reset.ts · Cubre: REQ-AUTH-001-S1
- [x] T1.2 Pruebas del endpoint · Archivos: test/reset.test.ts · Cubre: REQ-AUTH-001-S1 · Depende de: T1.1
`

const VERIFY = `# Verificación

\`\`\`evidence
scenario: REQ-AUTH-001-S1
method: executable
command: npm test -- reset
result: pass
output_hash: sha256:abcdef12
date: 2026-09-15T18:00:00Z
by: aanchante
\`\`\`
`

function ctx(cwd: string, flags: Record<string, string | boolean> = {}, positionals: string[] = []): CliContext {
  return { cwd, json: true, language: 'es', flags, positionals }
}

describe('CLI e2e (F0)', () => {
  it('el carril fix deja un fix vivo y el estado lo lista (REQ-FIXES-005-S1)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cli-fix-'))
    const init = await runInit(ctx(root))
    expect(init.exitCode).toBe(0)

    const created = await runNew(ctx(root, { lane: 'fix', domain: 'auth', title: 'Arreglo de login' }, ['arreglo-login']))
    expect(created.exitCode).toBe(0)
    const fixFile = path.join(root, '.sdd', 'changes', 'arreglo-login', 'fix.md')
    await fs.writeFile(
      fixFile,
      `# Fix — Arreglo de login\n\n## Síntoma\nFalla el ingreso.\n\n## Causa raíz\nZona horaria.\n\n## Cambio\nComparar en local.\n\n## Rollback\nRevertir.\n\n## Evidencia\n\n### REQ-AUTH-001-S1\n\n\`\`\`evidence\nmethod: manual\nresult: pass\ndate: 2026-09-20 10:00:00 -05:00\nby: Prueba\n\`\`\`\n`,
      'utf8',
    )

    const before = await runStatus(ctx(root))
    expect((before.data as { fixes: unknown[] }).fixes).toHaveLength(0)

    const archive = await runArchive(ctx(root, { yes: true }, ['arreglo-login']))
    expect(archive.exitCode).toBe(0)
    expect((archive.data as { livingFix?: string }).livingFix).toBe('.sdd/fixes/2026-09-arreglo-login.md')

    const status = await runStatus(ctx(root))
    const data = status.data as { fixes: Array<{ slug: string; result: string; domain?: string }> }
    expect(data.fixes).toHaveLength(1)
    expect(data.fixes[0]?.slug).toBe('arreglo-login')
    expect(data.fixes[0]?.result).toBe('pass')
    expect(data.fixes[0]?.domain).toBe('auth')
    expect((status.text ?? []).join('\n')).toContain('Fixes vivos: 1')
  })

  it('init → new → validate → trace → waves → status → doctor → archive', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cli-'))

    const init = await runInit(ctx(root))
    expect(init.exitCode).toBe(0)
    expect(await exists(path.join(root, '.sdd', 'config.yaml'))).toBe(true)
    expect(init.data).toBeDefined()

    const created = await runNew(ctx(root, { lane: 'standard', domain: 'auth' }, ['reset-password']))
    expect(created.exitCode).toBe(0)
    expect(toEnvelope('new', created).ok).toBe(true)

    const changeDir = path.join(root, '.sdd', 'changes', 'reset-password')
    await fs.writeFile(path.join(changeDir, 'spec.md'), DELTA, 'utf8')
    await fs.writeFile(path.join(changeDir, 'tasks.md'), TASKS, 'utf8')
    await fs.writeFile(path.join(changeDir, 'verify.md'), VERIFY, 'utf8')

    const validate = await runValidate(ctx(root))
    expect(validate.exitCode).toBe(0)
    expect(validate.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

    const trace = await runTrace(ctx(root))
    expect(trace.exitCode).toBe(0)

    const waves = await runWaves(ctx(root, { change: 'reset-password' }))
    expect(waves.exitCode).toBe(0)
    const plan = waves.data as { blocks: Array<{ waves: unknown[][] }> }
    expect(plan.blocks[0]!.waves).toHaveLength(0) // todas las tareas están hechas

    const approve = await runApprove(ctx(root, { by: 'Maria Perez' }, ['reset-password']))
    expect(approve.exitCode).toBe(0)
    const approvalsFile = await fs.readFile(path.join(root, '.sdd', 'approvals.yaml'), 'utf8')
    expect(approvalsFile).toContain('changes/reset-password/spec.md')
    expect(approvalsFile).toContain(artifactHash(await fs.readFile(path.join(changeDir, 'spec.md'), 'utf8')))

    const status = await runStatus(ctx(root))
    const statusData = status.data as { changes: Array<{ state: string; next: string; progress: { tasksDone: number; scenariosEvidenced: number } }> }
    expect(statusData.changes[0]!.state).toBe('ready')
    expect(statusData.changes[0]!.next).toContain('satlas archive')
    expect(statusData.changes[0]!.progress).toMatchObject({ tasksDone: 2, scenariosEvidenced: 1 })

    const doctor = await runDoctorCommand(ctx(root))
    expect(doctor.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

    const dry = await runArchive(ctx(root, { 'dry-run': true }, ['reset-password']))
    expect(dry.exitCode).toBe(0)
    expect(await exists(path.join(root, '.sdd', 'changes', 'reset-password'))).toBe(true)

    const archive = await runArchive(ctx(root, { yes: true }, ['reset-password']))
    expect(archive.exitCode).toBe(0)
    const archiveData = archive.data as { archivedTo?: string; applied: { added: string[] } }
    expect(archiveData.applied.added).toEqual(['REQ-AUTH-001'])
    expect(await exists(path.join(root, '.sdd', 'changes', 'reset-password'))).toBe(false)

    const living = await fs.readFile(path.join(root, '.sdd', 'specs', 'auth', 'spec.md'), 'utf8')
    expect(living).toContain('REQ-AUTH-001')
    expect(living).toContain('version: 1')

    const index = await fs.readFile(path.join(root, '.sdd', 'INDEX.md'), 'utf8')
    expect(index).toContain('Archivados')
    expect(index).toContain('1 cambio(s)')

    const archivedDirs = await fs.readdir(path.join(root, '.sdd', 'changes', 'archive'))
    expect(archivedDirs).toHaveLength(1)
  })

  it('rechaza aprobar un cambio que exige mockups sin mockups listos', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cli3-'))
    await runInit(ctx(root))
    await runNew(ctx(root, { lane: 'standard', domain: 'frontend' }, ['alta-mockup']))
    const metaFile = path.join(root, '.sdd', 'changes', 'alta-mockup', 'meta.yaml')
    const raw = await fs.readFile(metaFile, 'utf8')
    await fs.writeFile(metaFile, raw.trimEnd() + '\nmockups: required\n', 'utf8')

    const result = await runApprove(ctx(root, { by: 'Ana' }, ['alta-mockup']))
    expect(result.exitCode).toBe(1)
    expect(result.diagnostics[0]!.code).toBe('ATLAS-APPROVE-002')
  })

  it('rechaza archivar sin --yes y sin dry-run', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cli2-'))
    await runInit(ctx(root))
    await runNew(ctx(root, { domain: 'auth' }, ['x']))
    const result = await runArchive(ctx(root, {}, ['x']))
    expect(result.exitCode).toBe(2)
    expect(result.diagnostics[0]!.code).toBe('ATLAS-ARCHIVE-001')
  })
})

describe('F1: verify, mockups, present, analyze, ci, run', () => {
  it('completa el ciclo determinista sin agente', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cli5-'))
    await runInit(ctx(root))
    await runNew(ctx(root, { lane: 'standard', domain: 'auth' }, ['reset-password']))
    const changeDir = path.join(root, '.sdd', 'changes', 'reset-password')
    await fs.writeFile(path.join(changeDir, 'spec.md'), DELTA, 'utf8')
    await fs.writeFile(path.join(changeDir, 'tasks.md'), TASKS, 'utf8')

    const verify = await runVerify(ctx(root, { scenario: 'REQ-AUTH-001-S1', command: 'node --version', by: 'Ana' }, ['reset-password']))
    expect(verify.exitCode).toBe(0)
    const verifyData = verify.data as { evidence?: { result: string; outputHash?: string } }
    expect(verifyData.evidence?.result).toBe('pass')
    expect(verifyData.evidence?.outputHash).toMatch(/^sha256:/)

    const approve = await runApprove(ctx(root, { by: 'Ana' }, ['reset-password']))
    expect(approve.exitCode).toBe(0)

    const plan = await runMockup(ctx(root, {}, ['reset-password']))
    expect(plan.exitCode).toBe(0)
    const planData = plan.data as { plan: { screens: Array<{ file: string }> } }
    const mockupFile = planData.plan.screens[0]!.file
    await fs.writeFile(
      path.join(changeDir, 'mockups', mockupFile),
      '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><p>MOCKUP · NO FUNCIONAL · v1</p><div data-state="default"></div><div data-state="loading"></div><div data-state="error"></div></body></html>',
      'utf8',
    )
    const check = await runMockup(ctx(root, { check: true }, ['reset-password']))
    expect(check.exitCode).toBe(0)

    const present = await runPresentCommand(ctx(root, {}, ['reset-password']))
    expect(present.exitCode).toBe(0)
    const presentPath = (present.data as { path: string }).path
    const html = await fs.readFile(path.join(root, presentPath), 'utf8')
    expect(html).toContain('REQ-AUTH-001')

    const analyze = await runAnalyzeCommand(ctx(root, {}, ['reset-password']))
    expect(analyze.exitCode).toBe(0)

    const runStart = await runRun(ctx(root, { phase: 'build' }, ['start', 'reset-password']))
    expect(runStart.exitCode).toBe(0)
    const runList = await runRun(ctx(root, {}, ['list']))
    expect((runList.data as { runs: unknown[] }).runs.length).toBeGreaterThan(0)

    const ci = await runCi(ctx(root))
    expect(ci.exitCode).toBe(0)
    const ciData = ci.data as { checks: Array<{ name: string; errors: number }> }
    expect(ciData.checks.length).toBeGreaterThanOrEqual(3)
  })
})

describe('adaptadores y perfiles (F0)', () => {
  it('init compila adaptadores, check detecta staleness', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cli3-'))
    const init = await runInit(ctx(root))
    expect(init.exitCode).toBe(0)
    expect(await exists(path.join(root, '.opencode', 'command', 'satlas-specify.md'))).toBe(true)
    expect(await exists(path.join(root, '.opencode', 'skills', 'satlas-build', 'SKILL.md'))).toBe(true)
    expect(await exists(path.join(root, 'AGENTS.md'))).toBe(true)
    expect(await exists(path.join(root, '.sdd', '.generated', 'manifest.json'))).toBe(true)

    const check = await runAdapters(ctx(root, { check: true }))
    expect(check.exitCode).toBe(0)

    await fs.writeFile(path.join(root, '.opencode', 'command', 'satlas-specify.md'), 'mutado a mano', 'utf8')
    const stale = await runAdapters(ctx(root, { check: true }))
    expect(stale.exitCode).toBe(1)
    expect(stale.diagnostics.some((d) => d.code === 'ATLAS-ADAPTERS-001')).toBe(true)

    const recompile = await runAdapters(ctx(root))
    expect(recompile.exitCode).toBe(0)
    const restored = await fs.readFile(path.join(root, '.opencode', 'command', 'satlas-specify.md'), 'utf8')
    expect(restored).toContain('description:')
  })

  it('profile detect y create', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cli4-'))
    await runInit(ctx(root))
    const detect = await runProfile(ctx(root, {}, ['detect']))
    expect(detect.exitCode).toBe(0)
    const create = await runProfile(ctx(root, {}, ['create', 'mi-stack']))
    expect(create.exitCode).toBe(0)
    expect(await exists(path.join(root, '.sdd', 'profiles', 'custom', 'mi-stack.yaml'))).toBe(true)
    const list = await runProfile(ctx(root, {}, ['list']))
    expect(list.exitCode).toBe(0)
    const duplicated = await runProfile(ctx(root, {}, ['create', 'mi-stack']))
    expect(duplicated.exitCode).toBe(2)
  })
})

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
