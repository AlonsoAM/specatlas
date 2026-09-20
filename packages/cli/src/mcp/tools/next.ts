import { stateLabel } from '@specatlas/core'
import { evaluateChange } from '../../evaluate.js'
import { errorResult, jsonResult, noWorkspaceResult, stringArg, type McpHost, type ToolResult } from '../protocol.js'

const HUMAN_COMMANDS = [/^satlas approve/, /^satlas archive/, /^satlas resume/, /^satlas present/]

function requiresPerson(nextCommand: string, state: string): boolean {
  if (state === 'awaiting_approval' || state === 'ready') return true
  return HUMAN_COMMANDS.some((re) => re.test(nextCommand))
}

export async function runAtlasNext(args: unknown, host: McpHost): Promise<ToolResult> {
  const slug = stringArg(args, 'slug')
  if (!slug) {
    return errorResult('ATLAS-MCP-NEXT-001', 'Falta el nombre del cambio', { action: 'atlas_next con el argumento slug' })
  }

  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()
  const { workspace, config, approvals } = resolved

  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return errorResult('ATLAS-MCP-NEXT-002', `El cambio "${slug}" no existe`, {
      available: workspace.changes.map((c) => c.slug),
    })
  }

  const evaluation = await evaluateChange(workspace, config, change, approvals)
  const { state, nextAction, blockedBy } = evaluation.state
  const humanRequired = requiresPerson(nextAction.command, state)

  return jsonResult({
    slug,
    state,
    label: stateLabel(state),
    next: { command: nextAction.command, description: nextAction.description, requiresAgent: nextAction.requiresAgent },
    requiresPerson: humanRequired,
    blockedBy,
  })
}
