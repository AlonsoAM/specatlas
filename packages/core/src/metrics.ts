import path from 'node:path'
import { localStamp } from './time.js'
import { countBySeverity } from './diagnostics.js'
import { listDirs } from './fsx.js'
import { lintDelta } from './lint.js'
import { checkTrace } from './trace.js'
import { deriveState, stateLabel, verifyApproval, type ChangeState } from './lifecycle.js'
import { loadApprovals, loadWorkspace } from './workspace.js'
import type { Diagnostic } from './diagnostics.js'
import type { Change, Requirement } from './model.js'

export interface ChangeMetrics {
  slug: string
  title?: string
  domain?: string
  lane: string
  state: ChangeState
  stateLabel: string
  tasksDone: number
  tasksTotal: number
  scenariosTotal: number
  scenariosPassed: number
  findingsErrors: number
  findingsWarnings: number
  blockedBy: string[]
  next: string
  ageDays?: number
}

export interface AgingBucket {
  label: string
  value: number
}

export interface AttentionItem {
  slug: string
  kind: 'blocked' | 'aging' | 'missing-evidence'
  detail: string
}

export interface WorkspaceMetrics {
  generatedAt: string
  project: string
  root: string
  changes: ChangeMetrics[]
  totals: {
    changes: number
    tasks: number
    tasksDone: number
    scenarios: number
    scenariosPassed: number
    errors: number
    warnings: number
    archived: number
  }
  wipByState: Record<string, { label: string; count: number }>
  throughputByMonth: Record<string, number>
  evidenceByMethod: Record<string, number>
  blocked: Array<{ slug: string; reason: string }>
  aging: {
    averageDays?: number
    oldest?: { slug: string; ageDays: number }
    buckets: AgingBucket[]
  }
  byLane: Array<{ label: string; value: number }>
  attention: AttentionItem[]
}

export async function collectMetrics(root: string, now: Date = new Date()): Promise<WorkspaceMetrics> {
  const resolved = path.resolve(root)
  const { workspace, config } = await loadWorkspace(resolved)
  const approvals = await loadApprovals(workspace.sddDir)

  const living = new Map<string, Requirement>()
  for (const spec of workspace.specs) {
    for (const requirement of spec.spec.requirements) living.set(requirement.id, requirement)
  }

  const changes: ChangeMetrics[] = []
  const evidenceByMethod: Record<string, number> = {}
  const wipByState: Record<string, { label: string; count: number }> = {}
  const blocked: Array<{ slug: string; reason: string }> = []

  for (const change of workspace.changes as Change[]) {
    const deltaContent = await readDelta(change)
    const approval = verifyApproval(change, approvals.byArtifact, config, deltaContent)
    const findings: Diagnostic[] = []
    if (change.delta) findings.push(...lintDelta(change.delta, living, path.join(change.dir, 'spec.md'), { language: config.spec.language }))
    const trace = checkTrace({
      specs: workspace.specs,
      change,
      requireEvidence: config.gates.verify.mode !== 'off' && config.gates.verify.require_evidence,
    })
    findings.push(...trace.findings)
    const state = deriveState({ change, cfg: config, approval, blockingFindings: change.delta ? countBySeverity(findings).errors : 0 })

    const scenarios = [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])].flatMap((req) => req.scenarios)
    const passed = scenarios.filter((scenario) => (change.verify?.evidence ?? []).some((e) => e.scenario === scenario.id && e.result === 'pass'))
    for (const entry of [...(change.verify?.evidence ?? []), ...(change.fix?.evidence ?? [])]) {
      evidenceByMethod[entry.method] = (evidenceByMethod[entry.method] ?? 0) + 1
    }

    const summary = countBySeverity(findings)
    const ageDays = change.meta?.created ? Math.max(0, Math.round((now.getTime() - Date.parse(change.meta.created)) / 86_400_000)) : undefined

    const metric: ChangeMetrics = {
      slug: change.slug,
      ...(change.meta?.title !== undefined ? { title: change.meta.title } : {}),
      ...(change.meta?.domain !== undefined ? { domain: change.meta.domain } : {}),
      lane: change.meta?.lane ?? config.lanes.default,
      state: state.state,
      stateLabel: stateLabel(state.state),
      tasksDone: state.progress.tasksDone,
      tasksTotal: state.progress.tasksTotal,
      scenariosTotal: scenarios.length,
      scenariosPassed: passed.length,
      findingsErrors: summary.errors,
      findingsWarnings: summary.warnings,
      blockedBy: state.blockedBy,
      next: state.nextAction.command,
      ...(ageDays !== undefined ? { ageDays } : {}),
    }
    changes.push(metric)

    const bucket = wipByState[state.state] ?? { label: stateLabel(state.state), count: 0 }
    bucket.count += 1
    wipByState[state.state] = bucket
    if (state.blockedBy.length > 0) blocked.push({ slug: change.slug, reason: state.blockedBy.join('; ') })
  }

  changes.sort((a, b) => a.slug.localeCompare(b.slug))

  const ages = changes.map((change) => change.ageDays).filter((age): age is number => age !== undefined)
  const averageDays = ages.length > 0 ? Math.round((ages.reduce((acc, age) => acc + age, 0) / ages.length) * 10) / 10 : undefined
  const oldestChange = changes
    .filter((change) => change.ageDays !== undefined)
    .sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0))[0]
  const agingBuckets: AgingBucket[] = [
    { label: '0-3 días', value: ages.filter((age) => age <= 3).length },
    { label: '4-7 días', value: ages.filter((age) => age >= 4 && age <= 7).length },
    { label: '8-14 días', value: ages.filter((age) => age >= 8 && age <= 14).length },
    { label: '15+ días', value: ages.filter((age) => age >= 15).length },
  ]

  const laneCounts = new Map<string, number>()
  for (const change of changes) laneCounts.set(change.lane, (laneCounts.get(change.lane) ?? 0) + 1)
  const byLane = [...laneCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

  const attention: AttentionItem[] = []
  for (const change of changes) {
    if (change.blockedBy.length > 0) {
      attention.push({ slug: change.slug, kind: 'blocked', detail: change.blockedBy.join('; ') })
      continue
    }
    if (change.ageDays !== undefined && change.ageDays >= 15) {
      attention.push({ slug: change.slug, kind: 'aging', detail: `lleva ${change.ageDays} días sin cerrarse` })
      continue
    }
    if (change.state === 'built' && change.scenariosTotal > 0 && change.scenariosPassed < change.scenariosTotal) {
      attention.push({ slug: change.slug, kind: 'missing-evidence', detail: `evidencia ${change.scenariosPassed}/${change.scenariosTotal}` })
    }
  }

  const archiveDir = path.join(workspace.sddDir, 'changes', 'archive')
  const archivedEntries = await listDirs(archiveDir)
  const throughputByMonth: Record<string, number> = {}
  for (const entry of archivedEntries) {
    const month = /^(\d{4}-\d{2})/.exec(entry)?.[1]
    if (month) throughputByMonth[month] = (throughputByMonth[month] ?? 0) + 1
  }

  const totals = {
    changes: changes.length,
    tasks: changes.reduce((acc, c) => acc + c.tasksTotal, 0),
    tasksDone: changes.reduce((acc, c) => acc + c.tasksDone, 0),
    scenarios: changes.reduce((acc, c) => acc + c.scenariosTotal, 0),
    scenariosPassed: changes.reduce((acc, c) => acc + c.scenariosPassed, 0),
    errors: changes.reduce((acc, c) => acc + c.findingsErrors, 0),
    warnings: changes.reduce((acc, c) => acc + c.findingsWarnings, 0),
    archived: archivedEntries.length,
  }

  return {
    generatedAt: localStamp(now),
    project: config.project.name,
    root: resolved,
    changes,
    totals,
    wipByState,
    throughputByMonth,
    evidenceByMethod,
    blocked,
    aging: {
      ...(averageDays !== undefined ? { averageDays } : {}),
      ...(oldestChange && oldestChange.ageDays !== undefined ? { oldest: { slug: oldestChange.slug, ageDays: oldestChange.ageDays } } : {}),
      buckets: agingBuckets,
    },
    byLane,
    attention,
  }
}

async function readDelta(change: Change): Promise<string | undefined> {
  const { readTextIfExists } = await import('./fsx.js')
  return readTextIfExists(path.join(change.dir, 'spec.md'))
}
