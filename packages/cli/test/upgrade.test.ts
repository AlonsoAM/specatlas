import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CliError, type CliContext } from '../src/cli'
import { runDoctorCommand } from '../src/commands/doctor'
import { runStatus } from '../src/commands/status'
import { runUpgrade } from '../src/commands/upgrade'
import { runValidate } from '../src/commands/validate'

const DELTA = `# Delta — Alta de tareas

## Requisitos agregados

### Requisito: REQ-TAREA-001 — Registrar una tarea
El equipo DEBE poder registrar una tarea con su título.

- Regla BR-TAREA-001: Toda tarea registrada queda con su título y su fecha.

#### Escenario: REQ-TAREA-001-S1 — Registro válido
- **CUANDO** el equipo registra una tarea con título válido
- **ENTONCES** la tarea queda registrada con su fecha
`

const OLD_CONFIG = `# Configuración de SpecAtlas

project:
  name: legacy
  language: es
`

const OLD_META = `# Estado del cambio
slug: alta
lane: standard
domain: altas
title: Alta de tareas
`

function ctx(cwd: string, flags: Record<string, string | boolean> = {}): CliContext {
  return { cwd, json: true, language: 'es', flags, positionals: [] }
}

async function writeArtifact(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, '.sdd', ...rel.split('/'))
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

async function readArtifact(root: string, rel: string): Promise<string> {
  return fs.readFile(path.join(root, '.sdd', ...rel.split('/')), 'utf8')
}

const VERSIONED = ['config.yaml', 'changes/alta/meta.yaml'] as const

async function makeLegacyWorkspace(overrides: Record<string, string> = {}): Promise<{ root: string; before: Record<string, string> }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-upgrade-'))
  const files: Record<string, string> = {
    'config.yaml': overrides['config.yaml'] ?? OLD_CONFIG,
    'changes/alta/meta.yaml': overrides['changes/alta/meta.yaml'] ?? OLD_META,
  }
  for (const [rel, content] of Object.entries(files)) await writeArtifact(root, rel, content)
  await writeArtifact(root, 'changes/alta/spec.md', DELTA)
  const before: Record<string, string> = {}
  for (const rel of VERSIONED) before[rel] = files[rel] ?? ''
  return { root, before }
}

async function makeCurrentWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-upgrade-'))
  await writeArtifact(
    root,
    'config.yaml',
    `# Configuración de SpecAtlas\n\nschema_version: 1\nproject:\n  name: al-dia\n  language: es\n`,
  )
  return root
}

describe('satlas upgrade: aviso pasivo', () => {
  it('el estado avisa de la desactualización sin escribir (REQ-ESQUEMA-001-S1, REQ-ESQUEMA-001-S5)', async () => {
    const { root, before } = await makeLegacyWorkspace()
    const result = await runStatus(ctx(root))
    expect(result.exitCode).toBe(0)
    expect(result.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-001')).toBe(true)
    expect((result.data as { upgrade: { pending: number } }).upgrade.pending).toBe(2)
    expect(await readArtifact(root, 'config.yaml')).toBe(before['config.yaml'])
    expect(await readArtifact(root, 'changes/alta/meta.yaml')).toBe(before['changes/alta/meta.yaml'])
  })

  it('un proyecto al día no recibe aviso (REQ-ESQUEMA-001-S2, REQ-ESQUEMA-005-S1)', async () => {
    const root = await makeCurrentWorkspace()
    const result = await runStatus(ctx(root))
    expect(result.exitCode).toBe(0)
    expect(result.diagnostics.some((d) => d.code.startsWith('ATLAS-UPGRADE'))).toBe(false)
    expect((result.data as { upgrade: { pending: number; upToDate?: boolean } }).upgrade.pending).toBe(0)
  })

  it('la validación avisa sin romper el modo estricto (REQ-ESQUEMA-001-S1)', async () => {
    const { root } = await makeLegacyWorkspace()
    const result = await runValidate(ctx(root, { strict: true }))
    expect(result.exitCode).toBe(0)
    expect(result.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-001')).toBe(true)
  })

  it('el diagnóstico reporta la desactualización (REQ-ESQUEMA-001-S1)', async () => {
    const { root } = await makeLegacyWorkspace()
    const result = await runDoctorCommand(ctx(root))
    expect(result.exitCode).toBe(0)
    expect(result.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-001')).toBe(true)
    expect((result.data as { summary: { warnings: number } }).summary.warnings).toBeGreaterThanOrEqual(1)
  })

  it('sin proyecto inicializado responde con la acción de inicializar (REQ-ESQUEMA-001-S3)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-upgrade-'))
    await expect(runUpgrade(ctx(root))).rejects.toThrow(CliError)
    try {
      await runUpgrade(ctx(root))
    } catch (err) {
      expect((err as CliError).code).toBe('ATLAS-WS-001')
      expect((err as CliError).message).toContain('satlas init')
    }
  })
})

describe('satlas upgrade: vista previa', () => {
  it('lista lo que cambiaría y deja el proyecto intacto (REQ-ESQUEMA-002-S1, REQ-ESQUEMA-002-S4)', async () => {
    const { root, before } = await makeLegacyWorkspace()
    const result = await runUpgrade(ctx(root))
    expect(result.exitCode).toBe(0)
    const data = result.data as { pending: { artifact: string; from: number; to: number }[] }
    expect(data.pending.map((p) => p.artifact)).toEqual(['config.yaml', 'changes/alta/meta.yaml'])
    expect(data.pending.every((p) => p.from === 0 && p.to === 1)).toBe(true)
    expect(await readArtifact(root, 'config.yaml')).toBe(before['config.yaml'])
    expect(await readArtifact(root, 'changes/alta/meta.yaml')).toBe(before['changes/alta/meta.yaml'])
  })

  it('sin pendientes informa que no hay nada (REQ-ESQUEMA-002-S2)', async () => {
    const root = await makeCurrentWorkspace()
    const result = await runUpgrade(ctx(root))
    expect(result.exitCode).toBe(0)
    expect((result.data as { upToDate: boolean }).upToDate).toBe(true)
  })

  it('reporta un elemento ilegible sin tocarlo (REQ-ESQUEMA-002-S3)', async () => {
    const { root } = await makeLegacyWorkspace({ 'changes/alta/meta.yaml': 'slug: [sin cerrar\n' })
    const brokenBefore = await readArtifact(root, 'changes/alta/meta.yaml')
    const preview = await runUpgrade(ctx(root))
    expect(preview.exitCode).toBe(0)
    expect((preview.data as { unreadable: { artifact: string }[] }).unreadable.map((u) => u.artifact)).toContain('changes/alta/meta.yaml')

    const applied = await runUpgrade(ctx(root, { apply: true }))
    expect(applied.exitCode).toBe(0)
    expect(await readArtifact(root, 'changes/alta/meta.yaml')).toBe(brokenBefore)
    expect(await readArtifact(root, 'config.yaml')).toContain('schema_version: 1')
  })

  it('no propone actualizar hacia atrás un proyecto más nuevo (REQ-ESQUEMA-001-S4)', async () => {
    const { root } = await makeLegacyWorkspace({ 'config.yaml': `${OLD_CONFIG}schema_version: 99\n` })
    const result = await runUpgrade(ctx(root))
    expect(result.exitCode).toBe(0)
    const data = result.data as { newer: { artifact: string }[]; pending: { artifact: string }[] }
    expect(data.newer.map((n) => n.artifact)).toContain('config.yaml')
    expect(data.pending.map((p) => p.artifact)).not.toContain('config.yaml')

    const status = await runStatus(ctx(root))
    expect(status.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-002')).toBe(true)
  })
})

describe('satlas upgrade: aplicar y revertir', () => {
  it('aplica con respaldo, es idempotente y el aviso desaparece (REQ-ESQUEMA-003-S1, REQ-ESQUEMA-003-S2, REQ-ESQUEMA-003-S5)', async () => {
    const { root } = await makeLegacyWorkspace()
    const result = await runUpgrade(ctx(root, { apply: true }))
    expect(result.exitCode).toBe(0)
    const data = result.data as { status: string; applied: string[]; backup: { relativeDir: string } }
    expect(data.status).toBe('applied')
    expect(data.applied).toEqual(['config.yaml', 'changes/alta/meta.yaml'])
    expect(await fs.stat(path.join(root, data.backup.relativeDir.split('/').join(path.sep)))).toBeDefined()

    expect(await readArtifact(root, 'config.yaml')).toContain('schema_version: 1')
    expect(await readArtifact(root, 'changes/alta/meta.yaml')).toContain('schema_version: 1')

    const again = await runUpgrade(ctx(root, { apply: true }))
    expect(again.exitCode).toBe(0)
    expect((again.data as { status: string }).status).toBe('up-to-date')

    const status = await runStatus(ctx(root))
    expect(status.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-001')).toBe(false)
    expect((status.data as { upgrade: { pending: number } }).upgrade.pending).toBe(0)
  })

  it('revierte al estado previo y consume el respaldo (REQ-ESQUEMA-004-S1, REQ-ESQUEMA-004-S2, REQ-ESQUEMA-004-S4)', async () => {
    const { root, before } = await makeLegacyWorkspace()
    const applied = await runUpgrade(ctx(root, { apply: true }))
    expect(applied.exitCode).toBe(0)
    const backupDir = path.join(root, '.sdd', '.backup')

    const rollback = await runUpgrade(ctx(root, { rollback: true }))
    expect(rollback.exitCode).toBe(0)
    expect((rollback.data as { status: string; restored: string[] }).status).toBe('restored')
    expect(await readArtifact(root, 'config.yaml')).toBe(before['config.yaml'])
    expect(await readArtifact(root, 'changes/alta/meta.yaml')).toBe(before['changes/alta/meta.yaml'])
    expect(await fs.readdir(backupDir)).toEqual([])

    const second = await runUpgrade(ctx(root, { rollback: true }))
    expect(second.exitCode).toBe(1)
    expect(second.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-102')).toBe(true)
    expect(await readArtifact(root, 'config.yaml')).toBe(before['config.yaml'])
  })

  it('rechaza aplicar y revertir a la vez', async () => {
    const { root } = await makeLegacyWorkspace()
    const result = await runUpgrade(ctx(root, { apply: true, rollback: true }))
    expect(result.exitCode).toBe(2)
    expect(result.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-CLI-001')).toBe(true)
  })
})
