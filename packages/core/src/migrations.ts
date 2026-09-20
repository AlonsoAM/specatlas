import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, listDirs, readTextIfExists, toPosix, writeText } from './fsx.js'
import { localCompact, localOffset, localStamp } from './time.js'

export const SCHEMA_VERSION = 1
export const BACKUP_DIRNAME = '.backup'
export const BACKUP_POINTER = '.latest'

export interface MigrationSpec {
  id: string
  description: string
  from: number
  to: number
}

export const SCHEMA_MIGRATIONS: MigrationSpec[] = [
  {
    id: '0001-sellar-version-de-esquema',
    description: 'Sella la versión de esquema vigente en los elementos que no la declaran',
    from: 0,
    to: SCHEMA_VERSION,
  },
]

export interface UpgradeItem {
  artifact: string
  path: string
  from: number
  to: number
  migration: string
  summary: string
}

export interface UpgradeIssue {
  artifact: string
  path: string
  reason: string
}

export interface UpgradePlan {
  root: string
  currentVersion: number
  pending: UpgradeItem[]
  newer: UpgradeIssue[]
  unreadable: UpgradeIssue[]
  upToDate: boolean
}

const FIXED_ARTIFACTS: string[] = ['config.yaml', 'approvals.yaml', path.join('profiles', 'detected.yaml')]
const CHANGE_ARTIFACTS: string[] = ['meta.yaml', path.join('mockups', 'manifest.yaml')]

interface FoundArtifact {
  artifact: string
  path: string
}

async function pushChangeArtifacts(out: FoundArtifact[], sddDir: string, relDir: string): Promise<void> {
  for (const rel of CHANGE_ARTIFACTS) {
    const abs = path.join(sddDir, relDir, rel)
    if (await exists(abs)) out.push({ artifact: toPosix(path.join(relDir, rel)), path: abs })
  }
}

export async function collectVersionedArtifacts(root: string): Promise<FoundArtifact[]> {
  const sddDir = path.join(root, '.sdd')
  const out: FoundArtifact[] = []
  for (const rel of FIXED_ARTIFACTS) {
    const abs = path.join(sddDir, rel)
    if (await exists(abs)) out.push({ artifact: toPosix(rel), path: abs })
  }
  const changesDir = path.join(sddDir, 'changes')
  for (const slug of await listDirs(changesDir)) {
    if (slug === 'archive') continue
    await pushChangeArtifacts(out, sddDir, path.join('changes', slug))
  }
  for (const entry of await listDirs(path.join(changesDir, 'archive'))) {
    await pushChangeArtifacts(out, sddDir, path.join('changes', 'archive', entry))
  }
  return out
}

type ArtifactVersionState = { state: 'ok'; version: number } | { state: 'absent' } | { state: 'unreadable'; reason: string }

export function readArtifactVersion(content: string): ArtifactVersionState {
  let data: unknown
  try {
    data = parseYaml(content)
  } catch (err) {
    return { state: 'unreadable', reason: `YAML inválido (${(err as Error).message})` }
  }
  if (data === null || data === undefined) return { state: 'absent' }
  if (typeof data !== 'object' || Array.isArray(data)) return { state: 'unreadable', reason: 'la raíz no es un mapa de claves y valores' }
  const raw = (data as Record<string, unknown>)['schema_version']
  if (raw === undefined) return { state: 'absent' }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) return { state: 'unreadable', reason: `schema_version con valor no válido: ${String(raw)}` }
  return { state: 'ok', version: raw }
}

export function stampSchemaVersion(content: string, version: number): string | undefined {
  const line = `schema_version: ${version}`
  const bom = content.startsWith('\uFEFF') ? '\uFEFF' : ''
  const body = bom ? content.slice(1) : content
  if (body.trim() === '') return `${bom}${line}\n`
  const eol = body.includes('\r\n') ? '\r\n' : '\n'
  const lines = body.split(/\r?\n/)
  const trailing = lines.length > 1 && lines[lines.length - 1] === ''
  let index = 0
  while (index < lines.length) {
    const trimmed = (lines[index] ?? '').trim()
    if (trimmed === '' || trimmed.startsWith('#')) {
      index += 1
      continue
    }
    break
  }
  if ((lines[index] ?? '').trim() === '---') index += 1
  const insertAt = trailing ? Math.min(index, lines.length - 1) : index
  lines.splice(insertAt, 0, line)
  const next = bom + lines.join(eol)
  const check = readArtifactVersion(next)
  if (check.state !== 'ok' || check.version !== version) return undefined
  return next
}

export async function planUpgrade(root: string): Promise<UpgradePlan> {
  const artifacts = await collectVersionedArtifacts(root)
  const pending: UpgradeItem[] = []
  const newer: UpgradeIssue[] = []
  const unreadable: UpgradeIssue[] = []

  for (const found of artifacts) {
    const content = await readTextIfExists(found.path)
    if (content === undefined) continue
    const state = readArtifactVersion(content)
    if (state.state === 'unreadable') {
      unreadable.push({ ...found, reason: state.reason })
      continue
    }
    if (state.state === 'ok') {
      if (state.version > SCHEMA_VERSION) {
        newer.push({ ...found, reason: `produce la versión ${state.version}, más nueva que la vigente (${SCHEMA_VERSION})` })
        continue
      }
      if (state.version === SCHEMA_VERSION) continue
    }
    const from = state.state === 'ok' ? state.version : 0
    const migration = SCHEMA_MIGRATIONS.find((m) => m.from === from)
    if (!migration) {
      unreadable.push({ ...found, reason: `no hay migración registrada desde la versión ${from}` })
      continue
    }
    const stamped = stampSchemaVersion(content, migration.to)
    if (stamped === undefined) {
      unreadable.push({ ...found, reason: 'no se pudo sellar con seguridad sin alterar el resto del contenido' })
      continue
    }
    pending.push({ ...found, from, to: migration.to, migration: migration.id, summary: migration.description })
  }

  return { root, currentVersion: SCHEMA_VERSION, pending, newer, unreadable, upToDate: pending.length === 0 }
}

export interface UpgradeBackupInfo {
  name: string
  dir: string
  relativeDir: string
  createdAt: string
  files: string[]
}

export interface UpgradeApplyReport {
  status: 'applied' | 'up-to-date' | 'failed'
  plan: UpgradePlan
  applied: UpgradeItem[]
  backup?: UpgradeBackupInfo
  failure?: { artifact: string; message: string }
}

async function removeDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    // la limpieza es best-effort
  }
}

async function removeFile(file: string): Promise<void> {
  try {
    await fs.rm(file, { force: true })
  } catch {
    // la limpieza es best-effort
  }
}

function backupName(now: Date): string {
  return `${localCompact(now)}${localOffset(now).replace(':', '')}`
}

export async function applyUpgrade(root: string, now: Date = new Date()): Promise<UpgradeApplyReport> {
  const plan = await planUpgrade(root)
  if (plan.pending.length === 0) return { status: 'up-to-date', plan, applied: [] }

  const sddDir = path.join(root, '.sdd')
  const backupRoot = path.join(sddDir, BACKUP_DIRNAME)
  const name = backupName(now)
  const backupDir = path.join(backupRoot, name)
  const pointerFile = path.join(backupRoot, BACKUP_POINTER)
  const previous: { item: UpgradeItem; contents: string }[] = []

  try {
    for (const item of plan.pending) {
      const content = await readTextIfExists(item.path)
      if (content === undefined) throw new Error('el elemento desapareció mientras se respaldaba')
      previous.push({ item, contents: content })
      await writeText(path.join(backupDir, 'files', ...item.artifact.split('/')), content)
    }
    await writeText(
      path.join(backupDir, 'backup.yaml'),
      stringifyYaml(
        {
          schema_version: SCHEMA_VERSION,
          created_at: localStamp(now),
          to_version: SCHEMA_VERSION,
          files: plan.pending.map((i) => ({ artifact: i.artifact, from: i.from, to: i.to, migration: i.migration })),
        },
        { lineWidth: 120 },
      ),
    )
    await writeText(pointerFile, `${name}\n`)
  } catch (err) {
    await removeDir(backupDir)
    await removeFile(pointerFile)
    return { status: 'failed', plan, applied: [], failure: { artifact: '(respaldo)', message: (err as Error).message } }
  }

  const written: UpgradeItem[] = []
  for (const { item, contents } of previous) {
    try {
      const next = stampSchemaVersion(contents, item.to)
      if (next === undefined) throw new Error('no se pudo sellar con seguridad')
      await writeText(item.path, next)
      written.push(item)
    } catch (err) {
      for (const w of written) {
        const prev = previous.find((p) => p.item.artifact === w.artifact)
        if (prev) {
          try {
            await writeText(prev.item.path, prev.contents)
          } catch {
            // si la restauración falla, el respaldo queda en disco para recuperarla a mano
          }
        }
      }
      await removeFile(pointerFile)
      await removeDir(backupDir)
      return { status: 'failed', plan, applied: [], failure: { artifact: item.artifact, message: (err as Error).message } }
    }
  }

  for (const dir of await listDirs(backupRoot)) {
    if (dir !== name) await removeDir(path.join(backupRoot, dir))
  }

  return {
    status: 'applied',
    plan,
    applied: written,
    backup: {
      name,
      dir: backupDir,
      relativeDir: toPosix(path.relative(root, backupDir)),
      createdAt: localStamp(now),
      files: plan.pending.map((i) => i.artifact),
    },
  }
}

export interface UpgradeRollbackReport {
  status: 'restored' | 'no-backup' | 'failed'
  restored: string[]
  backup?: string
  failure?: { artifact: string; message: string }
}

export async function rollbackUpgrade(root: string): Promise<UpgradeRollbackReport> {
  const sddDir = path.join(root, '.sdd')
  const backupRoot = path.join(sddDir, BACKUP_DIRNAME)
  const pointerFile = path.join(backupRoot, BACKUP_POINTER)
  const name = (await readTextIfExists(pointerFile))?.trim()
  if (!name) return { status: 'no-backup', restored: [] }

  const backupDir = path.join(backupRoot, name)
  const manifestRaw = await readTextIfExists(path.join(backupDir, 'backup.yaml'))
  if (manifestRaw === undefined) return { status: 'no-backup', restored: [] }

  let files: { artifact: string }[] = []
  try {
    const parsed = parseYaml(manifestRaw) as { files?: { artifact?: unknown }[] } | null
    files = (parsed?.files ?? []).filter((f): f is { artifact: string } => typeof f?.artifact === 'string')
  } catch {
    return { status: 'no-backup', restored: [] }
  }

  const restored: string[] = []
  for (const file of files) {
    const from = path.join(backupDir, 'files', ...file.artifact.split('/'))
    const to = path.join(sddDir, ...file.artifact.split('/'))
    const content = await readTextIfExists(from)
    if (content === undefined) continue
    try {
      await writeText(to, content)
      restored.push(file.artifact)
    } catch (err) {
      return { status: 'failed', restored, backup: name, failure: { artifact: file.artifact, message: (err as Error).message } }
    }
  }

  await removeDir(backupDir)
  await removeFile(pointerFile)
  return { status: 'restored', restored, backup: name }
}

export interface UpgradeAdvisory {
  plan: UpgradePlan
  diagnostics: Diagnostic[]
}

export async function upgradeAdvisory(root: string): Promise<UpgradeAdvisory> {
  const plan = await planUpgrade(root)
  const diagnostics: Diagnostic[] = []
  if (plan.pending.length > 0) {
    diagnostics.push(
      diag('ATLAS-UPGRADE-001', 'warning', `El estado del proyecto no corresponde a la versión vigente: ${plan.pending.length} elemento(s) por actualizar`, {
        suggestion: 'Vista previa: `satlas upgrade` · Aplicar: `satlas upgrade --apply`',
      }),
    )
  }
  for (const item of plan.newer) {
    diagnostics.push(
      diag('ATLAS-UPGRADE-002', 'warning', `El proyecto fue producido por una versión más nueva: "${item.artifact}" (${item.reason})`, {
        path: item.path,
        suggestion: 'Actualiza la herramienta; no se actualiza hacia atrás',
      }),
    )
  }
  for (const item of plan.unreadable) {
    diagnostics.push(
      diag('ATLAS-UPGRADE-003', 'warning', `No se pudo interpretar "${item.artifact}": ${item.reason}`, {
        path: item.path,
        suggestion: 'Revisa el elemento; no se modificará',
      }),
    )
  }
  return { plan, diagnostics }
}
