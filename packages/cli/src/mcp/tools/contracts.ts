import path from 'node:path'
import { contractCoverage } from '@specatlas/core'
import { errorResult, jsonResult, noWorkspaceResult, stringArg, type McpHost, type ToolResult } from '../protocol.js'

export async function runAtlasContracts(args: unknown, host: McpHost): Promise<ToolResult> {
  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()
  const slug = stringArg(args, 'slug')
  if (!slug) return errorResult('ATLAS-MCP-CONTRACTS-001', 'Falta el nombre del cambio', { usage: 'atlas_contracts { slug }' })

  const change = resolved.workspace.changes.find((candidate) => candidate.slug === slug)
  if (!change) {
    return errorResult('ATLAS-MCP-CONTRACTS-002', `El cambio "${slug}" no existe`, { available: resolved.workspace.changes.map((candidate) => candidate.slug) })
  }

  const mode = resolved.config.gates.contracts.mode
  const state = change.contracts
  if (!state || state.files.length === 0) {
    return jsonResult({ slug, mode, contracts: [], findings: [], message: 'El cambio no declara contratos.' })
  }

  const findings = [...state.findings, ...contractCoverage(change, mode)]
  return jsonResult({
    slug,
    mode,
    contracts: state.files.map((file) => ({
      path: path.relative(resolved.root, file.path),
      format: file.format,
      operations: file.operations.map((operation) => operation.id),
    })),
    findings,
  })
}
