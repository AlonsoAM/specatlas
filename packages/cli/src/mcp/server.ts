import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Readable, Writable } from 'node:stream'
import { createInterface } from 'node:readline/promises'
import { findWorkspaceRoot, loadApprovals, loadWorkspace } from '@specatlas/core'
import {
  INTERNAL_ERROR,
  METHOD_NOT_FOUND,
  isObject,
  makeError,
  makeResult,
  parseMessage,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type McpHost,
  type ResolvedMcpWorkspace,
} from './protocol.js'
import { runToolByName } from './tools/index.js'
import { listTools } from './tools/list.js'
import { cliVersion } from '../version.js'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_NAME = 'specatlas'

interface CacheEntry {
  mtimeMs: number
  value: ResolvedMcpWorkspace
}

export class WorkspaceCache {
  private entries = new Map<string, CacheEntry>()

  get(root: string): CacheEntry | undefined {
    return this.entries.get(root)
  }

  set(root: string, mtimeMs: number, value: ResolvedMcpWorkspace): void {
    this.entries.set(root, { mtimeMs, value })
  }
}

async function workspaceStamp(root: string): Promise<number> {
  const sddDir = path.join(root, '.sdd')
  const markers = [sddDir, path.join(sddDir, 'config.yaml'), path.join(sddDir, 'changes'), path.join(sddDir, 'specs'), path.join(sddDir, 'approvals.yaml')]
  let stamp = 0
  for (const marker of markers) {
    try {
      const st = await fs.stat(marker)
      stamp = Math.max(stamp, st.mtimeMs)
    } catch {
      // el marcador puede no existir; se ignora
    }
  }
  return stamp
}

export async function resolveMcpWorkspace(cwd: string, cache: WorkspaceCache): Promise<ResolvedMcpWorkspace | undefined> {
  const root = await findWorkspaceRoot(cwd)
  if (!root) return undefined
  const stamp = await workspaceStamp(root)
  const cached = cache.get(root)
  if (cached && cached.mtimeMs === stamp) return cached.value
  const { workspace, config } = await loadWorkspace(root)
  const approvals = await loadApprovals(path.join(root, '.sdd'))
  const value: ResolvedMcpWorkspace = { root, workspace, config, approvals: approvals.byArtifact }
  cache.set(root, stamp, value)
  return value
}

export function createHost(cwd: string, cache: WorkspaceCache): McpHost {
  return {
    cwd,
    language: 'es',
    getWorkspace: () => resolveMcpWorkspace(cwd, cache),
  }
}

export async function handleRequest(req: JsonRpcRequest, host: McpHost): Promise<JsonRpcResponse | undefined> {
  const id = req.id

  if (req.method === 'initialize') {
    return makeResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: SERVER_NAME, version: cliVersion() },
    })
  }

  if (req.method === 'ping') {
    return makeResult(id, {})
  }

  if (req.method === 'tools/list') {
    return makeResult(id, { tools: listTools() })
  }

  if (req.method === 'tools/call') {
    const params = isObject(req.params) ? req.params : {}
    const name = typeof params['name'] === 'string' ? params['name'] : ''
    if (name === '') {
      return makeResult(id, {
        content: [{ type: 'text', text: JSON.stringify({ error: 'ATLAS-MCP-TOOL-001', message: 'Falta el nombre de la operación' }, null, 2) }],
        isError: true,
      })
    }
    try {
      const result = await runToolByName(name, params['arguments'], host)
      return makeResult(id, result)
    } catch (err) {
      return makeError(id, INTERNAL_ERROR, 'Error interno al ejecutar la operación', { message: err instanceof Error ? err.message : String(err) })
    }
  }

  if (req.method.startsWith('notifications/')) {
    return undefined
  }

  return makeError(id, METHOD_NOT_FOUND, `Método desconocido: ${req.method}`)
}

export interface McpServerOptions {
  cwd: string
  stdin: Readable
  stdout: Writable
  stderr: Writable
}

export function log(stderr: Writable, message: string): void {
  stderr.write(`[specatlas mcp] ${message}\n`)
}

export async function runMcpServer(opts: McpServerOptions): Promise<void> {
  const { cwd, stdin, stdout, stderr } = opts
  const cache = new WorkspaceCache()
  const host = createHost(cwd, cache)
  log(stderr, 'vía de consulta iniciada (solo lectura)')

  const rl = createInterface({ input: stdin, crlfDelay: Infinity })
  for await (const line of rl) {
    if (line.trim() === '') continue
    const parsed = parseMessage(line)
    if (parsed.error) {
      const response = makeError(null, parsed.error.code, parsed.error.message)
      stdout.write(`${JSON.stringify(response)}\n`)
      continue
    }
    const request = parsed.request as JsonRpcRequest
    try {
      const response = await handleRequest(request, host)
      if (response) stdout.write(`${JSON.stringify(response)}\n`)
    } catch (err) {
      log(stderr, err instanceof Error ? err.message : String(err))
      stdout.write(`${JSON.stringify(makeError(request.id, INTERNAL_ERROR, 'Error interno'))}\n`)
    }
  }
}
