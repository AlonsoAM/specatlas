import path from 'node:path'
import { linkedRequirementIds } from '@specatlas/core'
import { jsonResult, noWorkspaceResult, type McpHost, type ToolResult } from '../protocol.js'

export async function runAtlasLinks(_args: unknown, host: McpHost): Promise<ToolResult> {
  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()

  const state = resolved.workspace.links
  if (!state || state.entries.length === 0) {
    return jsonResult({ links: [], message: 'El proyecto no tiene enlaces.', action: 'satlas link add <ruta>' })
  }

  return jsonResult({
    links: state.entries.map((entry) => ({
      name: entry.name,
      path: path.relative(resolved.root, entry.path),
      available: entry.available,
      requirements: entry.requirements,
      domains: entry.domains,
    })),
    externalRequirements: linkedRequirementIds(state).length,
    unavailable: state.unavailable,
  })
}
