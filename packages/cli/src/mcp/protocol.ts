import type { AtlasConfig, Workspace } from '@specatlas/core'

export const JSONRPC_VERSION = '2.0'

export const PARSE_ERROR = -32700
export const INVALID_REQUEST = -32600
export const METHOD_NOT_FOUND = -32601
export const INVALID_PARAMS = -32602
export const INTERNAL_ERROR = -32603

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

export interface JsonRpcRequest {
  jsonrpc: string
  id: number | string | null
  method: string
  params?: unknown
}

export interface JsonRpcResponse {
  jsonrpc: string
  id: number | string | null
  result?: unknown
  error?: JsonRpcError
}

export interface ParsedMessage {
  request?: JsonRpcRequest
  error?: JsonRpcError
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function makeResult(id: number | string | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: JSONRPC_VERSION, id, result }
}

export function makeError(id: number | string | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  const error: JsonRpcError = { code, message }
  if (data !== undefined) error.data = data
  return { jsonrpc: JSONRPC_VERSION, id, error }
}

export function parseMessage(line: string): ParsedMessage {
  let value: unknown
  try {
    value = JSON.parse(line)
  } catch {
    return { error: { code: PARSE_ERROR, message: 'El mensaje no es JSON válido' } }
  }
  if (!isObject(value) || value['jsonrpc'] !== JSONRPC_VERSION) {
    return { error: { code: INVALID_REQUEST, message: 'Mensaje no es una petición JSON-RPC 2.0 válida' } }
  }
  if (typeof value['method'] !== 'string') {
    return { error: { code: INVALID_REQUEST, message: 'El mensaje no declara un método' } }
  }
  const idValue = value['id'] ?? null
  const id = typeof idValue === 'number' || typeof idValue === 'string' || idValue === null ? idValue : null
  const request: JsonRpcRequest = { jsonrpc: JSONRPC_VERSION, id, method: value['method'] }
  if (value['params'] !== undefined) request.params = value['params']
  return { request }
}

export interface ToolContentText {
  type: 'text'
  text: string
}

export interface ToolResult {
  content: ToolContentText[]
  isError?: boolean
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: string; description?: string }>
    required?: string[]
    additionalProperties: boolean
  }
}

export interface ResolvedMcpWorkspace {
  root: string
  workspace: Workspace
  config: AtlasConfig
  approvals: Map<string, { hash: string; by: string; at: string }>
}

export interface McpHost {
  cwd: string
  language: 'es' | 'en'
  getWorkspace(): Promise<ResolvedMcpWorkspace | undefined>
}

export type ToolHandler = (args: unknown, host: McpHost) => Promise<ToolResult>

export function jsonResult(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

export function errorResult(code: string, message: string, extra?: Record<string, unknown>): ToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: code, message, ...extra }, null, 2) }],
  }
}

export function noWorkspaceResult(): ToolResult {
  return errorResult(
    'ATLAS-MCP-WS-001',
    'El proyecto no está inicializado: no se encontró el estado del proyecto en esta carpeta.',
    { action: 'satlas init' },
  )
}

export function stringArg(args: unknown, key: string): string | undefined {
  if (!isObject(args)) return undefined
  const value = args[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}
