import { checkTrace } from '@specatlas/core'
import { jsonResult, noWorkspaceResult, stringArg, type McpHost, type ToolResult } from '../protocol.js'

interface ScenarioCoverage {
  id: string
  title: string
  coveredBy: string[]
  evidence: 'pass' | 'fail' | 'skipped' | null
}

export async function runAtlasTrace(args: unknown, host: McpHost): Promise<ToolResult> {
  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()
  const { workspace } = resolved

  const slug = stringArg(args, 'slug')
  const changes = slug ? workspace.changes.filter((c) => c.slug === slug) : workspace.changes

  const result: Array<{
    slug: string
    scenarios: ScenarioCoverage[]
    gaps: string[]
    summary: { errors: number; warnings: number }
  }> = []

  for (const change of changes) {
    const trace = checkTrace({ specs: workspace.specs, change, requireEvidence: false })
    const coversByTask = new Map<string, string[]>()
    for (const block of change.tasks?.blocks ?? []) {
      for (const task of block.tasks) coversByTask.set(task.id, task.covers.map((c) => c.toUpperCase()))
    }
    const evidenceByScenario = new Map<string, string>()
    for (const ev of change.verify?.evidence ?? []) {
      const known = evidenceByScenario.get(ev.scenario)
      if (known === undefined || ev.result === 'pass') evidenceByScenario.set(ev.scenario, ev.result)
    }

    const scenarios: ScenarioCoverage[] = []
    for (const req of [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])]) {
      for (const sc of req.scenarios) {
        const parent = sc.reqId.toUpperCase()
        const coveredBy = [...coversByTask.entries()]
          .filter(([, covers]) => covers.includes(sc.id.toUpperCase()) || covers.includes(parent))
          .map(([taskId]) => taskId)
        const evidence = (evidenceByScenario.get(sc.id) as ScenarioCoverage['evidence']) ?? null
        scenarios.push({ id: sc.id, title: sc.title, coveredBy, evidence })
      }
    }

    const gaps = trace.findings
      .filter((f) => f.code === 'TRACE-002')
      .map((f) => String(f.target ?? f.message))

    result.push({ slug: change.slug, scenarios, gaps, summary: { errors: trace.summary.errors, warnings: trace.summary.warnings } })
  }

  if (changes.length === 0) {
    return jsonResult({ changes: [], message: 'Sin cambios activos.', action: 'satlas new <slug>' })
  }

  return jsonResult({ changes: result })
}
