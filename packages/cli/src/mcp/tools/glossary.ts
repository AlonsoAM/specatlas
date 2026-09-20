import path from 'node:path'
import { parseGlossary, readTextIfExists } from '@specatlas/core'
import { jsonResult, noWorkspaceResult, type McpHost, type ToolResult } from '../protocol.js'

export async function runAtlasGlossary(_args: unknown, host: McpHost): Promise<ToolResult> {
  const resolved = await host.getWorkspace()
  if (!resolved) return noWorkspaceResult()
  const { root, config } = resolved

  const glossaryPath = path.resolve(root, config.spec.glossary)
  const raw = await readTextIfExists(glossaryPath)
  if (raw === undefined) {
    return jsonResult({
      terms: [],
      message: 'El glosario no tiene términos definidos.',
      action: 'Define los términos del negocio en el glosario del proyecto.',
    })
  }

  const parsed = parseGlossary(raw, glossaryPath)
  if (parsed.terms.length === 0) {
    return jsonResult({
      terms: [],
      message: 'El glosario no tiene términos definidos.',
      action: 'Define los términos del negocio en el glosario del proyecto.',
    })
  }

  return jsonResult({ terms: parsed.terms })
}
