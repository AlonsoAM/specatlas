import { evaluateChange } from '../../evaluate.js'
import { errorResult, jsonResult, noWorkspaceResult, stringArg, type McpHost, type ToolResult } from '../protocol.js'

export async function runAtlasValidate(args: unknown, host: McpHost): Promise<ToolResult> {
  const slug = stringArg(args, 'slug')
  if (!slug) {
    return errorResult('ATLAS-MCP-VALIDATE-001', 'Falta el nombre del cambio', { action: 'atlas_validate con el argumento slug' })
  }

  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()
  const { workspace, config, approvals } = resolved

  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return errorResult('ATLAS-MCP-VALIDATE-002', `El cambio "${slug}" no existe`, {
      available: workspace.changes.map((c) => c.slug),
    })
  }

  const evaluation = await evaluateChange(workspace, config, change, approvals)
  const findings = [...evaluation.lintFindings, ...evaluation.trace.findings].map((d) => ({
    code: d.code,
    severity: d.severity,
    message: d.message,
    path: d.path,
    line: d.line,
    suggestion: d.suggestion,
  }))

  if (findings.length === 0) {
    return jsonResult({ slug, conforming: true, message: 'Sin hallazgos: el cambio está conforme.', findings: [] })
  }

  return jsonResult({
    slug,
    conforming: findings.every((f) => f.severity !== 'error'),
    findings,
    summary: evaluation.trace.summary,
  })
}
