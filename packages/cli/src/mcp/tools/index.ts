import { errorResult, type McpHost, type ToolHandler, type ToolResult } from '../protocol.js'
import { runAtlasFixes } from './fixes.js'
import { runAtlasGlossary } from './glossary.js'
import { runAtlasImpact } from './impact.js'
import { runAtlasNext } from './next.js'
import { runAtlasStatus } from './status.js'
import { runAtlasTrace } from './trace.js'
import { runAtlasValidate } from './validate.js'

const HANDLERS: Record<string, ToolHandler> = {
  atlas_status: runAtlasStatus,
  atlas_next: runAtlasNext,
  atlas_validate: runAtlasValidate,
  atlas_trace: runAtlasTrace,
  atlas_impact: runAtlasImpact,
  atlas_glossary: runAtlasGlossary,
  atlas_fixes: runAtlasFixes,
}

export async function runToolByName(name: string, args: unknown, host: McpHost): Promise<ToolResult> {
  const handler = HANDLERS[name]
  if (!handler) {
    return errorResult('ATLAS-MCP-TOOL-002', `Operación desconocida: ${name}`, { available: Object.keys(HANDLERS).sort() })
  }
  return handler(args, host)
}
