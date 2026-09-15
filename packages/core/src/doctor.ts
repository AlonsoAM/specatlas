import path from 'node:path'
import type { Diagnostic } from './diagnostics.js'
import { countBySeverity, diag } from './diagnostics.js'
import { artifactHash } from './hash.js'
import { readTextIfExists } from './fsx.js'
import { loadApprovals, loadWorkspace } from './workspace.js'
import { verifyApproval } from './lifecycle.js'

export interface DoctorReport {
  findings: Diagnostic[]
  summary: { errors: number; warnings: number; infos: number }
}

export async function runDoctor(root: string): Promise<DoctorReport> {
  const findings: Diagnostic[] = []
  const { workspace, config } = await loadWorkspace(root)
  findings.push(...workspace.diagnostics)

  const approvals = await loadApprovals(workspace.sddDir)
  findings.push(...approvals.diagnostics)

  for (const change of workspace.changes) {
    const deltaPath = path.join(change.dir, 'spec.md')
    const deltaContent = await readTextIfExists(deltaPath)
    const approval = verifyApproval(change, approvals.byArtifact, config, deltaContent ?? undefined)

    if ((change.planPath || change.tasks) && (approval.status === 'missing' || approval.status === 'stale')) {
      findings.push(
        diag('ATLAS-LIFECYCLE-001', 'error', `El cambio "${change.slug}" tiene plan/tareas sin una firma vigente de la spec`, {
          path: deltaPath,
          suggestion: 'Firma la spec (`satlas approve`) o rehaz la aprobación si la spec cambió',
        }),
      )
    }

    const failing = (change.verify?.evidence ?? []).filter((e) => e.result === 'fail')
    if (failing.length > 0) {
      findings.push(
        diag('ATLAS-LIFECYCLE-002', 'error', `El cambio "${change.slug}" tiene ${failing.length} evidencia(s) con result: fail`, {
          path: change.verify?.path,
          suggestion: 'Corrige y vuelve a registrar la evidencia antes de archivar',
        }),
      )
    }

    for (const override of change.meta?.overrides ?? []) {
      if (!override.reason.trim() || !override.by.trim()) {
        findings.push(diag('ATLAS-LIFECYCLE-004', 'error', `Override del gate "${override.gate}" sin motivo o autor`, { path: path.join(change.dir, 'meta.yaml') }))
      }
    }
  }

  const seen = new Map<string, string>()
  for (const specRef of workspace.specs) {
    for (const req of specRef.spec.requirements) {
      const owner = seen.get(req.id)
      if (owner && owner !== specRef.domain) {
        findings.push(diag('ATLAS-TRACE-008', 'error', `El requisito ${req.id} está duplicado en "${owner}" y "${specRef.domain}"`, { path: specRef.path }))
      }
      seen.set(req.id, specRef.domain)
    }
  }

  return { findings, summary: countBySeverity(findings) }
}

export async function specHashOf(filePath: string): Promise<string | undefined> {
  const content = await readTextIfExists(filePath)
  if (content === undefined) return undefined
  return artifactHash(content)
}
