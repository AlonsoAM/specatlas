import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { initWorkspace } from '../src/init'
import { createChange } from '../src/new'
import { signApproval } from '../src/approvals'
import {
  applyUpgrade,
  collectVersionedArtifacts,
  planUpgrade,
  readArtifactVersion,
  rollbackUpgrade,
  SCHEMA_VERSION,
  stampSchemaVersion,
  upgradeAdvisory,
} from '../src/migrations'

const OLD_CONFIG = `# Configuración de SpecAtlas
# Los gates aceptan: off | advisory | blocking

project:
  name: legacy
  language: es
`

const OLD_META = `# Estado del cambio
slug: alta
lane: standard
domain: altas
`

const OLD_APPROVALS = `approvals: []
`

const OLD_MANIFEST = `version: 1
screens: []
`

const OLD_DETECTED = `best: node-ts
`

async function makeLegacyWorkspace(): Promise<{ root: string; files: Record<string, string> }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-mig-'))
  const files: Record<string, string> = {
    'config.yaml': OLD_CONFIG,
    'approvals.yaml': OLD_APPROVALS,
    'profiles/detected.yaml': OLD_DETECTED,
    'changes/alta/meta.yaml': OLD_META,
    'changes/alta/mockups/manifest.yaml': OLD_MANIFEST,
  }
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, '.sdd', ...rel.split('/'))
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content, 'utf8')
  }
  return { root, files }
}

async function readArtifacts(root: string, files: Record<string, string>): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const rel of Object.keys(files)) {
    out[rel] = await fs.readFile(path.join(root, '.sdd', ...rel.split('/')), 'utf8')
  }
  return out
}

describe('migraciones: detección y vista previa', () => {
  it('detecta los elementos sin versión y no escribe nada al planificar (REQ-ESQUEMA-002-S4)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const before = await readArtifacts(root, files)

    const plan = await planUpgrade(root)
    expect(plan.pending).toHaveLength(5)
    expect(plan.pending.every((i) => i.from === 0 && i.to === SCHEMA_VERSION)).toBe(true)
    expect(plan.upToDate).toBe(false)
    expect(plan.unreadable).toEqual([])
    expect(plan.newer).toEqual([])

    expect(await readArtifacts(root, files)).toEqual(before)
  })

  it('un proyecto al día no tiene pendientes (REQ-ESQUEMA-001-S2, REQ-ESQUEMA-005-S1)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-mig-'))
    await initWorkspace({ root, name: 'al-dia', language: 'es' })

    const plan = await planUpgrade(root)
    expect(plan.pending).toEqual([])
    expect(plan.upToDate).toBe(true)

    const advisory = await upgradeAdvisory(root)
    expect(advisory.diagnostics).toEqual([])
  })

  it('reporta elementos ilegibles sin tocarlos (REQ-ESQUEMA-002-S3)', async () => {
    const { root } = await makeLegacyWorkspace()
    const broken = path.join(root, '.sdd', 'changes', 'alta', 'meta.yaml')
    await fs.writeFile(broken, 'slug: [sin cerrar\n', 'utf8')

    const plan = await planUpgrade(root)
    expect(plan.unreadable.map((u) => u.artifact)).toContain('changes/alta/meta.yaml')
    expect(plan.pending.map((i) => i.artifact)).not.toContain('changes/alta/meta.yaml')

    const advisory = await upgradeAdvisory(root)
    expect(advisory.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-003')).toBe(true)
  })

  it('no degrada un proyecto producido por una versión más nueva (REQ-ESQUEMA-001-S4, REQ-ESQUEMA-001-S5)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const next = path.join(root, '.sdd', 'config.yaml')
    await fs.writeFile(next, `${OLD_CONFIG}schema_version: 99\n`, 'utf8')
    const before = await fs.readFile(next, 'utf8')

    const plan = await planUpgrade(root)
    expect(plan.newer.map((n) => n.artifact)).toContain('config.yaml')
    expect(plan.pending.map((i) => i.artifact)).not.toContain('config.yaml')

    const advisory = await upgradeAdvisory(root)
    expect(advisory.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-002')).toBe(true)
    expect(await fs.readFile(next, 'utf8')).toBe(before)

    const report = await applyUpgrade(root)
    expect(report.applied.map((i) => i.artifact)).not.toContain('config.yaml')
    expect(await fs.readFile(next, 'utf8')).toBe(before)
  })

  it('el aviso de desactualización es de solo lectura (REQ-ESQUEMA-001-S1, REQ-ESQUEMA-001-S3)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const before = await readArtifacts(root, files)
    const advisory = await upgradeAdvisory(root)
    expect(advisory.diagnostics.some((d) => d.code === 'ATLAS-UPGRADE-001')).toBe(true)
    expect(await readArtifacts(root, files)).toEqual(before)
  })
})

describe('migraciones: sellado por líneas', () => {
  it('inserta la versión tras los comentarios sin tocar el resto', () => {
    const next = stampSchemaVersion(OLD_CONFIG, 1)
    expect(next).toBe(`# Configuración de SpecAtlas\n# Los gates aceptan: off | advisory | blocking\n\nschema_version: 1\nproject:\n  name: legacy\n  language: es\n`)
  })

  it('preserva BOM y fin de línea CRLF', () => {
    const crlf = `\uFEFF# Estado del cambio\r\nslug: alta\r\nlane: standard\r\n`
    const next = stampSchemaVersion(crlf, 1)
    expect(next?.startsWith('\uFEFF# Estado del cambio\r\nschema_version: 1\r\nslug: alta\r\n')).toBe(true)
    expect(readArtifactVersion(next ?? '')).toEqual({ state: 'ok', version: 1 })
  })

  it('sella tras el marcador de documento y en archivos vacíos', () => {
    expect(stampSchemaVersion('---\nslug: alta\n', 1)).toBe('---\nschema_version: 1\nslug: alta\n')
    expect(stampSchemaVersion('', 1)).toBe('schema_version: 1\n')
    expect(stampSchemaVersion('# solo comentarios\n', 1)).toBe('# solo comentarios\nschema_version: 1\n')
  })
})

describe('migraciones: aplicación con respaldo', () => {
  it('aplica con respaldo y sella todos los elementos (REQ-ESQUEMA-003-S1, REQ-ESQUEMA-003-S6)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const before = await readArtifacts(root, files)

    const report = await applyUpgrade(root)
    expect(report.status).toBe('applied')
    expect(report.applied).toHaveLength(5)
    expect(report.backup).toBeDefined()

    for (const rel of Object.keys(files)) {
      const content = await fs.readFile(path.join(root, '.sdd', ...rel.split('/')), 'utf8')
      expect(readArtifactVersion(content)).toEqual({ state: 'ok', version: SCHEMA_VERSION })
    }

    const backupDir = report.backup?.dir ?? ''
    expect(await fs.stat(backupDir)).toBeDefined()
    for (const [rel, content] of Object.entries(before)) {
      const backed = await fs.readFile(path.join(backupDir, 'files', ...rel.split('/')), 'utf8')
      expect(backed).toBe(content)
    }
    const manifest = await fs.readFile(path.join(backupDir, 'backup.yaml'), 'utf8')
    expect(manifest).toContain('schema_version: 1')
    expect(manifest).toContain('config.yaml')
  })

  it('es idempotente y no crea respaldos de más (REQ-ESQUEMA-003-S2, REQ-ESQUEMA-003-S5)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const first = await applyUpgrade(root)
    expect(first.status).toBe('applied')
    const afterFirst = await readArtifacts(root, files)

    const second = await applyUpgrade(root)
    expect(second.status).toBe('up-to-date')
    expect(second.applied).toEqual([])
    expect(second.backup).toBeUndefined()
    expect(await readArtifacts(root, files)).toEqual(afterFirst)

    const backups = await fs.readdir(path.join(root, '.sdd', '.backup'))
    expect(backups.filter((b) => b !== '.latest')).toHaveLength(1)
  })

  it('si falla a mitad, restaura lo escrito y deja el proyecto intacto (REQ-ESQUEMA-003-S3)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const before = await readArtifacts(root, files)
    const target = path.join(root, '.sdd', 'changes', 'alta', 'meta.yaml')
    await fs.chmod(target, 0o444)

    try {
      const report = await applyUpgrade(root)
      expect(report.status).toBe('failed')
      expect(report.failure?.artifact).toBe('changes/alta/meta.yaml')
      expect(await readArtifacts(root, files)).toEqual(before)
    } finally {
      await fs.chmod(target, 0o666)
    }
  })

  it('cuando el primer elemento no se puede escribir, no modifica nada (REQ-ESQUEMA-003-S4)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const before = await readArtifacts(root, files)
    const target = path.join(root, '.sdd', 'config.yaml')
    await fs.chmod(target, 0o444)

    try {
      const report = await applyUpgrade(root)
      expect(report.status).toBe('failed')
      expect(report.failure?.artifact).toBe('config.yaml')
      expect(await readArtifacts(root, files)).toEqual(before)
    } finally {
      await fs.chmod(target, 0o666)
    }
  })
})

describe('migraciones: reversión', () => {
  it('restaura el estado previo, consume el respaldo y no revierte dos veces (REQ-ESQUEMA-004-S1, REQ-ESQUEMA-004-S3, REQ-ESQUEMA-004-S4)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const before = await readArtifacts(root, files)
    const applied = await applyUpgrade(root)
    expect(applied.status).toBe('applied')

    const rollback = await rollbackUpgrade(root)
    expect(rollback.status).toBe('restored')
    expect(rollback.restored).toHaveLength(5)
    expect(await readArtifacts(root, files)).toEqual(before)
    await expect(fs.stat(applied.backup?.dir ?? '')).rejects.toThrow()

    const second = await rollbackUpgrade(root)
    expect(second.status).toBe('no-backup')
    expect(await readArtifacts(root, files)).toEqual(before)
  })

  it('sin respaldo no toca nada (REQ-ESQUEMA-004-S2)', async () => {
    const { root, files } = await makeLegacyWorkspace()
    const before = await readArtifacts(root, files)
    const rollback = await rollbackUpgrade(root)
    expect(rollback.status).toBe('no-backup')
    expect(await readArtifacts(root, files)).toEqual(before)
  })
})

describe('migraciones: el proyecto nuevo nace al día', () => {
  it('un cambio y su aprobación quedan en la versión vigente (REQ-ESQUEMA-005-S2)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-mig-'))
    await initWorkspace({ root, name: 'nuevo', language: 'es' })
    await createChange({ root, slug: 'alta-tareas', lane: 'standard', domain: 'tareas', title: 'Alta de tareas' })
    await signApproval({ root, artifact: 'changes/alta-tareas/spec.md', by: 'Alonso Anchante' })

    const artifacts = await collectVersionedArtifacts(root)
    const names = artifacts.map((a) => a.artifact)
    expect(names).toContain('config.yaml')
    expect(names).toContain('approvals.yaml')
    expect(names).toContain('changes/alta-tareas/meta.yaml')
    for (const found of artifacts) {
      const content = await fs.readFile(found.path, 'utf8')
      expect(readArtifactVersion(content)).toEqual({ state: 'ok', version: SCHEMA_VERSION })
    }
    const plan = await planUpgrade(root)
    expect(plan.pending).toEqual([])
  })
})
