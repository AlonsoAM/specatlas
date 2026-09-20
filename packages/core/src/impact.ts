import type { Workspace } from './model.js'
import { toPosix } from './fsx.js'

export interface ImpactTask {
  id: string
  change: string
  text: string
  files: string[]
  covers: string[]
}

export interface ImpactEvidence {
  scenario: string
  result: string
  change: string
}

export interface ImpactReport {
  target: string
  kind: 'requirement' | 'file'
  exists: boolean
  external?: boolean
  origin?: string
  scenarios: string[]
  tasks: ImpactTask[]
  requirements: string[]
  changes: string[]
  files: string[]
  evidence: ImpactEvidence[]
}

function normalizePath(p: string): string {
  return toPosix(p.trim()).replace(/^\.\//, '').replace(/\/+$/, '').toLowerCase()
}

function fileMatches(query: string, candidate: string): boolean {
  if (query === candidate) return true
  return candidate.endsWith(`/${query}`)
}

function scenarioToReq(workspace: Workspace): Map<string, string> {
  const map = new Map<string, string>()
  for (const spec of workspace.specs) {
    for (const req of spec.spec.requirements) {
      for (const sc of req.scenarios) map.set(sc.id, req.id)
    }
  }
  for (const change of workspace.changes) {
    for (const req of [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])]) {
      for (const sc of req.scenarios) map.set(sc.id, req.id)
    }
  }
  return map
}

function emptyReport(target: string, kind: 'requirement' | 'file'): ImpactReport {
  return { target, kind, exists: false, scenarios: [], tasks: [], requirements: [], changes: [], files: [], evidence: [] }
}

function collect(workspace: Workspace, report: ImpactReport, covers: Set<string>, reqOf: Map<string, string>): void {
  const requirements = new Set<string>()
  for (const change of workspace.changes) {
    let changeMatches = false
    for (const block of change.tasks?.blocks ?? []) {
      for (const task of block.tasks) {
        const hit = task.covers.some((c) => covers.has(c.toUpperCase()))
        if (!hit) continue
        changeMatches = true
        report.tasks.push({ id: task.id, change: change.slug, text: task.text, files: task.files, covers: task.covers })
        for (const c of task.covers) {
          const upper = c.toUpperCase()
          if (covers.has(upper)) {
            const req = reqOf.get(upper) ?? upper
            requirements.add(req)
          }
        }
        for (const f of task.files) report.files.push(f)
      }
    }
    if (changeMatches) report.changes.push(change.slug)
    for (const ev of change.verify?.evidence ?? []) {
      if (covers.has(ev.scenario.toUpperCase())) {
        report.evidence.push({ scenario: ev.scenario, result: ev.result, change: change.slug })
      }
    }
  }
  report.requirements = [...requirements].sort()
  report.changes = [...new Set(report.changes)].sort()
  report.files = [...new Set(report.files)].sort()
  report.evidence.sort((a, b) => a.scenario.localeCompare(b.scenario))
}

export function impactOfRequirement(workspace: Workspace, reqId: string): ImpactReport {
  const id = reqId.toUpperCase()
  const scenarios = new Set<string>()
  let exists = false
  let origin: string | undefined

  for (const spec of workspace.specs) {
    for (const req of spec.spec.requirements) {
      if (req.id !== id) continue
      exists = true
      for (const sc of req.scenarios) scenarios.add(sc.id)
    }
  }
  for (const change of workspace.changes) {
    for (const req of [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])]) {
      if (req.id !== id) continue
      exists = true
      for (const sc of req.scenarios) scenarios.add(sc.id)
    }
    if ((change.delta?.removed ?? []).some((r) => r.id === id)) exists = true
    if ((change.delta?.renamed ?? []).some((r) => r.from.id === id || r.to.id === id)) exists = true
  }
  if (!exists) {
    for (const link of workspace.links?.entries ?? []) {
      const spec = workspace.links?.specs.find((candidate) => candidate.spec.requirements.some((req) => req.id === id))
      if (!spec) continue
      const requirement = spec.spec.requirements.find((candidate) => candidate.id === id)
      if (!requirement) continue
      exists = true
      origin = link.name
      for (const sc of requirement.scenarios) scenarios.add(sc.id)
      break
    }
  }

  const report = emptyReport(id, 'requirement')
  if (!exists) return report
  report.exists = true
  report.scenarios = [...scenarios].sort()
  const reqOf = scenarioToReq(workspace)
  collect(workspace, report, new Set([id, ...scenarios]), reqOf)
  if (!report.requirements.includes(id)) report.requirements.unshift(id)
  if (origin !== undefined) {
    report.external = true
    report.origin = origin
  }
  return report
}

export function impactOfFile(workspace: Workspace, file: string): ImpactReport {
  const query = normalizePath(file)
  const report = emptyReport(file, 'file')
  const covers = new Set<string>()
  const matched = new Set<string>()
  const changes = new Set<string>()

  for (const change of workspace.changes) {
    for (const block of change.tasks?.blocks ?? []) {
      for (const task of block.tasks) {
        if (!task.files.some((f) => fileMatches(query, normalizePath(f)))) continue
        changes.add(change.slug)
        for (const f of task.files) matched.add(f)
        for (const c of task.covers) covers.add(c.toUpperCase())
        report.tasks.push({ id: task.id, change: change.slug, text: task.text, files: task.files, covers: task.covers })
      }
    }
  }

  if (matched.size === 0) return report
  report.exists = true
  report.files = [...matched].sort()
  report.changes = [...changes].sort()
  const reqOf = scenarioToReq(workspace)
  const requirements = new Set<string>()
  for (const c of covers) requirements.add(reqOf.get(c) ?? c)
  report.requirements = [...requirements].sort()
  return report
}
