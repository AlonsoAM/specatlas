import { impactOfFile, impactOfRequirement, loadAllAnchors, type ImpactReport } from '@specatlas/core'
import { errorResult, jsonResult, noWorkspaceResult, stringArg, type McpHost, type ToolResult } from '../protocol.js'

const REQ_TARGET_RE = /^REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}(?:-S\d+)?$/i

export async function runAtlasImpact(args: unknown, host: McpHost): Promise<ToolResult> {
  const target = stringArg(args, 'target')
  if (!target) {
    return errorResult('ATLAS-MCP-IMPACT-001', 'Falta el requisito o el archivo a consultar', {
      action: 'atlas_impact con el argumento target (REQ-… o ruta de archivo)',
    })
  }

  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()
  const { workspace } = resolved
  // Las anclas de las specs vivas responden aunque no haya cambios activos.
  const anchors = await loadAllAnchors(workspace.root)

  let report: ImpactReport
  if (REQ_TARGET_RE.test(target)) {
    const reqId = target.toUpperCase().replace(/-S\d+$/, '')
    report = impactOfRequirement(workspace, reqId, anchors)
  } else {
    report = impactOfFile(workspace, target, anchors)
  }

  if (!report.exists) {
    return jsonResult({ target, exists: false, message: `Sin relaciones registradas para "${target}".` })
  }

  return jsonResult(report)
}
