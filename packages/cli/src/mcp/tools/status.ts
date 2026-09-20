import { stateLabel } from '@specatlas/core'
import { evaluateChange } from '../../evaluate.js'
import { errorResult, jsonResult, noWorkspaceResult, stringArg, type McpHost, type ToolResult } from '../protocol.js'

export async function runAtlasStatus(args: unknown, host: McpHost): Promise<ToolResult> {
  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()
  const { workspace, config, approvals } = resolved

  const slug = stringArg(args, 'slug')
  if (slug && !workspace.changes.some((c) => c.slug === slug)) {
    return errorResult('ATLAS-MCP-STATUS-001', `El cambio "${slug}" no existe`, {
      available: workspace.changes.map((c) => c.slug),
    })
  }

  const changes = []
  for (const change of workspace.changes) {
    if (slug && change.slug !== slug) continue
    const evaluation = await evaluateChange(workspace, config, change, approvals)
    const { state, progress, nextAction, blockedBy } = evaluation.state
    changes.push({
      slug: change.slug,
      lane: change.meta?.lane ?? config.lanes.default,
      domain: change.meta?.domain,
      state,
      label: stateLabel(state),
      progress,
      blocking: evaluation.blocking,
      blockedBy,
      next: { command: nextAction.command, description: nextAction.description, requiresAgent: nextAction.requiresAgent },
    })
  }

  if (changes.length === 0) {
    return jsonResult({
      changes: [],
      specs: workspace.specs.map((s) => ({ domain: s.domain, requirements: s.spec.requirements.length })),
      message: 'Sin cambios activos.',
      action: 'satlas new <slug>',
    })
  }

  return jsonResult({
    changes,
    specs: workspace.specs.map((s) => ({ domain: s.domain, requirements: s.spec.requirements.length })),
  })
}
