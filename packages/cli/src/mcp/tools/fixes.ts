import { loadLivingFixes } from '@specatlas/core'
import { jsonResult, noWorkspaceResult, type McpHost, type ToolResult } from '../protocol.js'

export async function runAtlasFixes(_args: unknown, host: McpHost): Promise<ToolResult> {
  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()

  const fixes = await loadLivingFixes(resolved.root)
  if (fixes.length === 0) {
    const activeFix = resolved.workspace.changes.find((change) => change.meta?.lane === 'fix')
    return jsonResult({
      fixes: [],
      message: 'No hay fixes vivos registrados.',
      action: activeFix ? `satlas archive ${activeFix.slug}` : 'satlas new <slug> --lane fix',
    })
  }

  return jsonResult({
    fixes: fixes.map((fix) => ({
      slug: fix.slug,
      date: fix.date,
      result: fix.result,
      source: fix.source,
      domain: fix.domain,
      title: fix.title,
      covers: fix.covers,
      content: fix.content,
    })),
  })
}
