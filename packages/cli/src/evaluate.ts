import path from 'node:path'
import {
  checkTrace,
  clarifyAdvisory,
  contractsAdvisory,
  deriveState,
  docsAdvisory,
  reviewAdvisory,
  linkedTraceInput,
  lintDelta,
  mockupsReady,
  readTextIfExists,
  requiresMockups,
  verifyApproval,
  type AtlasConfig,
  type ApprovalStatus,
  type Change,
  type DerivedState,
  type Diagnostic,
  type Requirement,
  type TraceResult,
  type Workspace,
} from '@specatlas/core'

export interface ChangeEvaluation {
  change: Change
  approval: ApprovalStatus
  lintFindings: Diagnostic[]
  trace: TraceResult
  blocking: number
  state: DerivedState
}

export function livingRequirementsMap(specs: Workspace['specs']): Map<string, Requirement> {
  const map = new Map<string, Requirement>()
  for (const spec of specs) {
    for (const req of spec.spec.requirements) map.set(req.id, req)
  }
  return map
}

export async function evaluateChange(
  workspace: Workspace,
  config: AtlasConfig,
  change: Change,
  approvals: Map<string, { hash: string; by: string; at: string }>,
): Promise<ChangeEvaluation> {
  const deltaPath = path.join(change.dir, 'spec.md')
  const deltaContent = await readTextIfExists(deltaPath)
  const approval = verifyApproval(change, approvals, config, deltaContent ?? undefined)

  const living = livingRequirementsMap(workspace.specs)
  const lintFindings = change.delta ? lintDelta(change.delta, living, deltaPath, { language: config.spec.language }) : []

  const trace = checkTrace({
    specs: workspace.specs,
    change,
    requireEvidence: config.gates.verify.mode !== 'off' && config.gates.verify.require_evidence,
    linked: linkedTraceInput(workspace),
  })

  const blocking =
    lintFindings.filter((d) => d.severity === 'error').length + trace.findings.filter((d) => d.severity === 'error').length

  const mockupsAreReady = requiresMockups(change.meta, config) ? await mockupsReady(workspace.root, change.slug, change) : undefined
  const state = deriveState({
    change,
    cfg: config,
    approval,
    blockingFindings: change.delta ? blocking : 0,
    ...(mockupsAreReady !== undefined ? { mockupsReady: mockupsAreReady } : {}),
  })

  const phaseAdvisories = [...clarifyAdvisory(change, config), ...reviewAdvisory(change, config), ...docsAdvisory(change, config), ...contractsAdvisory(change, config)]

  return { change, approval, lintFindings: [...lintFindings, ...phaseAdvisories], trace, blocking, state }
}
