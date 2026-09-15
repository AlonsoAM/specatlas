import path from 'node:path'
import { stringify as stringifyYaml } from 'yaml'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { readTextIfExists, toPosix, writeText } from './fsx.js'
import { artifactHash } from './hash.js'
import type { Approval } from './model.js'
import { parseApprovals } from './parse/meta.js'

export interface SignApprovalOptions {
  root: string
  artifact: string
  by: string
  channel?: Approval['channel']
  note?: string
  now?: Date
  dryRun?: boolean
}

export interface SignApprovalResult {
  approval?: Approval
  file: string
  diagnostics: Diagnostic[]
}

function normalizeArtifact(sddDir: string, artifact: string): { rel: string; abs: string } {
  const abs = path.isAbsolute(artifact) ? artifact : path.resolve(sddDir, artifact)
  const rel = toPosix(path.relative(sddDir, abs))
  return { rel, abs }
}

export async function signApproval(opts: SignApprovalOptions): Promise<SignApprovalResult> {
  const root = path.resolve(opts.root)
  const sddDir = path.join(root, '.sdd')
  const file = path.join(sddDir, 'approvals.yaml')
  const diagnostics: Diagnostic[] = []
  const { rel, abs } = normalizeArtifact(sddDir, opts.artifact)

  if (!opts.by.trim()) {
    diagnostics.push(diag('ATLAS-APPROVE-001', 'error', 'La aprobación requiere el nombre de quien aprueba (--by)', { suggestion: 'Ejemplo: satlas approve changes/x/spec.md --by "María Pérez"`' }))
    return { file, diagnostics }
  }

  const content = await readTextIfExists(abs)
  if (content === undefined) {
    diagnostics.push(diag('ATLAS-APPROVE-002', 'error', `No existe el artefacto a aprobar: ${rel}`, { path: abs }))
    return { file, diagnostics }
  }

  const existing = await readTextIfExists(file)
  let approvals: Approval[] = []
  if (existing !== undefined) {
    const parsed = parseApprovals(existing, file)
    diagnostics.push(...parsed.diagnostics)
    approvals = parsed.approvals?.approvals ?? []
  }

  const now = opts.now ?? new Date()
  const approval: Approval = {
    artifact: rel,
    artifactHash: artifactHash(content),
    approvedBy: opts.by.trim(),
    approvedAt: now.toISOString(),
    channel: opts.channel ?? 'cli',
  }
  if (opts.note) approval.note = opts.note

  approvals = approvals.filter((a) => a.artifact !== rel)
  approvals.push(approval)

  const doc = {
    schema_version: 1,
    approvals: approvals.map((a) => {
      const row: Record<string, unknown> = {
        artifact: a.artifact,
        artifact_hash: a.artifactHash,
        approved_by: a.approvedBy,
        approved_at: a.approvedAt,
        channel: a.channel,
      }
      if (a.note) row['note'] = a.note
      return row
    }),
  }

  if (!opts.dryRun) {
    await writeText(file, stringifyYaml(doc, { lineWidth: 120 }))
  }
  return { approval, file, diagnostics }
}
