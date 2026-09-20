import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createHost, handleRequest, WorkspaceCache } from '../src/mcp/server'
import { parseMessage, type JsonRpcResponse, type McpHost } from '../src/mcp/protocol'
import { listTools, READ_ONLY_TOOL_NAMES } from '../src/mcp/tools/list'
import { runApprove } from '../src/commands/approve'
import { runInit } from '../src/commands/init'
import { runNew } from '../src/commands/new'
import { runStatus } from '../src/commands/status'
import type { CliContext } from '../src/cli'

const DELTA = `# Delta — Restablecer contraseña

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

- Regla BR-AUTH-001: El enlace vence a los 30 minutos.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** el usuario solicita restablecer con un email registrado
- **ENTONCES** recibe un enlace de un solo uso

#### Escenario: REQ-AUTH-001-S2 — Email no registrado
- **CUANDO** el usuario solicita restablecer con un email no registrado
- **ENTONCES** recibe una respuesta que no revela si el email existe
`

const VAGUE_DELTA = `# Delta — Contraseña

## Requisitos agregados

### Requisito: REQ-AUTH-002 — Restablecer rápido
El sistema DEBE restablecer la contraseña de forma rápida.

#### Escenario: REQ-AUTH-002-S1 — Solicitud válida
- **CUANDO** el usuario pide restablecer
- **ENTONCES** recibe un enlace
`

const TASKS = `# Tareas

## Bloque 1 — API

- [ ] T1.1 Endpoint de solicitud · Archivos: src/reset.ts · Cubre: REQ-AUTH-001-S1
`

function ctx(cwd: string, flags: Record<string, string | boolean> = {}, positionals: string[] = []): CliContext {
  return { cwd, json: true, language: 'es', flags, positionals }
}

async function newRoot(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

function hostFor(cwd: string): McpHost {
  return createHost(cwd, new WorkspaceCache())
}

async function callTool(host: McpHost, name: string, args: unknown = {}): Promise<JsonRpcResponse> {
  const response = await handleRequest(
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
    host,
  )
  return response as JsonRpcResponse
}

function toolData(response: JsonRpcResponse): { result: { content: Array<{ type: string; text: string }>; isError?: boolean } } {
  return response as unknown as { result: { content: Array<{ type: string; text: string }>; isError?: boolean } }
}

function toolJson(response: JsonRpcResponse): Record<string, unknown> {
  return JSON.parse(toolData(response).result.content[0]!.text)
}

async function initWorkspace(): Promise<string> {
  const root = await newRoot('atlas-mcp-')
  const init = await runInit(ctx(root))
  expect(init.exitCode).toBe(0)
  return root
}

async function initChange(root: string, slug: string, delta: string, tasks?: string): Promise<void> {
  const created = await runNew(ctx(root, { lane: 'standard', domain: 'auth' }, [slug]))
  expect(created.exitCode).toBe(0)
  const changeDir = path.join(root, '.sdd', 'changes', slug)
  await fs.writeFile(path.join(changeDir, 'spec.md'), delta, 'utf8')
  if (tasks) await fs.writeFile(path.join(changeDir, 'tasks.md'), tasks, 'utf8')
}

async function snapshotHashes(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  async function rec(dir: string): Promise<void> {
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
        await rec(full)
      } else {
        const content = await fs.readFile(full)
        out.set(path.relative(root, full), createHash('sha256').update(content).digest('hex'))
      }
    }
  }
  await rec(root)
  return out
}

describe('MCP: protocolo', () => {
  it('responde initialize con el protocolo, capacidades y nombre', async () => {
    const host = hostFor(await newRoot('atlas-mcp-proto-'))
    const response = (await handleRequest({ jsonrpc: '2.0', id: 7, method: 'initialize' }, host)) as JsonRpcResponse
    const result = response.result as { protocolVersion: string; serverInfo: { name: string } }
    expect(result.protocolVersion).toBe('2024-11-05')
    expect(result.serverInfo.name).toBe('specatlas')
    expect(response.id).toBe(7)
  })

  it('responde ping y método desconocido con el error correcto', async () => {
    const host = hostFor(await newRoot('atlas-mcp-proto-'))
    const ping = (await handleRequest({ jsonrpc: '2.0', id: 2, method: 'ping' }, host)) as JsonRpcResponse
    expect(ping.result).toEqual({})
    const unknown = (await handleRequest({ jsonrpc: '2.0', id: 3, method: 'no/existe' }, host)) as JsonRpcResponse
    expect(unknown.error?.code).toBe(-32601)
  })

  it('detecta JSON inválido como error de parseo', () => {
    const parsed = parseMessage('no es json')
    expect(parsed.error?.code).toBe(-32700)
  })
})

describe('MCP: atlas_status (REQ-MCP-001)', () => {
  it('S1: el estado general coincide con el que reporta la herramienta', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA)
    const host = hostFor(root)

    const cli = await runStatus(ctx(root))
    const cliChanges = (cli.data as { changes: Array<{ slug: string; state: string; blocking: number; progress: { tasksDone: number } }> }).changes

    const response = await callTool(host, 'atlas_status')
    expect(toolData(response).result.isError).toBeUndefined()
    const data = toolJson(response) as { changes: Array<{ slug: string; state: string; blocking: number; progress: { tasksDone: number } }> }
    expect(data.changes.map((c) => ({ slug: c.slug, state: c.state, blocking: c.blocking, tasksDone: c.progress.tasksDone }))).toEqual(
      cliChanges.map((c) => ({ slug: c.slug, state: c.state, blocking: c.blocking, tasksDone: c.progress.tasksDone })),
    )
  })

  it('S2: sin cambios activos informa y sugiere crear uno', async () => {
    const root = await initWorkspace()
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_status')
    const data = toolJson(response) as { changes: unknown[]; message: string; action: string }
    expect(data.changes).toHaveLength(0)
    expect(data.message).toContain('Sin cambios activos')
    expect(data.action).toBe('satlas new <slug>')
  })

  it('S3: con slug informa solo de ese cambio', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA)
    await initChange(root, 'otro-cambio', DELTA)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_status', { slug: 'reset-password' })
    const data = toolJson(response) as { changes: Array<{ slug: string }> }
    expect(data.changes.map((c) => c.slug)).toEqual(['reset-password'])
  })

  it('S4: cambio inexistente devuelve aviso explícito y la lista disponible', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_status', { slug: 'no-existe' })
    expect(toolData(response).result.isError).toBe(true)
    const data = toolJson(response) as { error: string; available: string[] }
    expect(data.error).toBe('ATLAS-MCP-STATUS-001')
    expect(data.available).toEqual(['reset-password'])
  })

  it('S5: sin proyecto inicializado devuelve el aviso y la acción', async () => {
    const root = await newRoot('atlas-mcp-nows-')
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_status')
    expect(toolData(response).result.isError).toBe(true)
    const data = toolJson(response) as { error: string; action: string }
    expect(data.error).toBe('ATLAS-MCP-WS-001')
    expect(data.action).toBe('satlas init')
  })
})

describe('MCP: atlas_next (REQ-MCP-002)', () => {
  it('S1: paso sin intervención humana (fase del asistente)', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA)
    const approved = await runApprove(ctx(root, { by: 'Maria Perez' }, ['reset-password']))
    expect(approved.exitCode).toBe(0)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_next', { slug: 'reset-password' })
    const data = toolJson(response) as { next: { command: string; requiresAgent: boolean }; requiresPerson: boolean }
    expect(data.next.requiresAgent).toBe(true)
    expect(data.requiresPerson).toBe(false)
    expect(data.next.command).toContain('reset-password')
  })

  it('S2: paso que requiere una persona se señala explícitamente', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_next', { slug: 'reset-password' })
    const data = toolJson(response) as { state: string; requiresPerson: boolean; next: { command: string } }
    expect(data.state).toBe('awaiting_approval')
    expect(data.requiresPerson).toBe(true)
  })

  it('S3: cambio bloqueado informa qué lo bloquea', async () => {
    const root = await initWorkspace()
    await initChange(root, 'rapido', VAGUE_DELTA)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_next', { slug: 'rapido' })
    const data = toolJson(response) as { blockedBy: string[] }
    expect(data.blockedBy.length).toBeGreaterThan(0)
    expect(data.blockedBy[0]).toContain('hallazgo')
  })

  it('S4: cambio pausado informa motivo y acción de reanudar', async () => {
    const root = await initWorkspace()
    await initChange(root, 'pausado', DELTA)
    const metaPath = path.join(root, '.sdd', 'changes', 'pausado', 'meta.yaml')
    await fs.appendFile(
      metaPath,
      'paused:\n  reason: esperando revisión legal\n  at: 2026-09-19T10:00:00-05:00\n  by: ana\n',
      'utf8',
    )
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_next', { slug: 'pausado' })
    const data = toolJson(response) as { blockedBy: string[]; next: { command: string }; requiresPerson: boolean }
    expect(data.blockedBy.join(' ')).toContain('pausado')
    expect(data.next.command).toContain('resume')
    expect(data.requiresPerson).toBe(true)
  })
})

describe('MCP: atlas_validate y atlas_trace (REQ-MCP-003)', () => {
  it('S1: devuelve los hallazgos vigentes con código, severidad y ubicación', async () => {
    const root = await initWorkspace()
    await initChange(root, 'rapido', VAGUE_DELTA)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_validate', { slug: 'rapido' })
    const data = toolJson(response) as { conforming: boolean; findings: Array<{ code: string; severity: string }> }
    expect(data.conforming).toBe(false)
    expect(data.findings.some((f) => f.code === 'LINT-BIZ-002' && f.severity === 'error')).toBe(true)
  })

  it('S2: cambio conforme responde sin hallazgos inventados', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_validate', { slug: 'reset-password' })
    const data = toolJson(response) as { conforming: boolean; findings: unknown[] }
    expect(data.conforming).toBe(true)
    expect(data.findings).toHaveLength(0)
  })

  it('S3: la cobertura informa por escenario su tarea y los huecos', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA, TASKS)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_trace', { slug: 'reset-password' })
    const data = toolJson(response) as {
      changes: Array<{ scenarios: Array<{ id: string; coveredBy: string[]; evidence: string | null }>; gaps: string[] }>
    }
    const change = data.changes[0]!
    const s1 = change.scenarios.find((s) => s.id === 'REQ-AUTH-001-S1')!
    const s2 = change.scenarios.find((s) => s.id === 'REQ-AUTH-001-S2')!
    expect(s1.coveredBy).toEqual(['T1.1'])
    expect(s2.coveredBy).toHaveLength(0)
    expect(change.gaps.length).toBeGreaterThan(0)
    expect(change.gaps.join(' ')).toContain('REQ-AUTH-001-S2')
  })
})

describe('MCP: atlas_impact y atlas_glossary (REQ-MCP-004, REQ-MCP-005)', () => {
  it('impacto por requisito: devuelve escenarios, tareas, cambios, archivos y evidencia', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA, TASKS)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_impact', { target: 'REQ-AUTH-001' })
    const data = toolJson(response) as { exists: boolean; scenarios: string[]; tasks: Array<{ id: string }>; changes: string[] }
    expect(data.exists).toBe(true)
    expect(data.scenarios).toEqual(['REQ-AUTH-001-S1', 'REQ-AUTH-001-S2'])
    expect(data.tasks.map((t) => t.id)).toEqual(['T1.1'])
    expect(data.changes).toEqual(['reset-password'])
  })

  it('impacto por archivo: devuelve las tareas y requisitos que lo mencionan', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA, TASKS)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_impact', { target: 'src/reset.ts' })
    const data = toolJson(response) as { exists: boolean; tasks: Array<{ id: string }>; requirements: string[] }
    expect(data.exists).toBe(true)
    expect(data.tasks.map((t) => t.id)).toEqual(['T1.1'])
    expect(data.requirements).toEqual(['REQ-AUTH-001'])
  })

  it('impacto sin relaciones: responde que no hay, sin suponer', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA)
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_impact', { target: 'src/desconocido.ts' })
    const data = toolJson(response) as { exists: boolean; message: string }
    expect(data.exists).toBe(false)
    expect(data.message).toContain('Sin relaciones')
  })

  it('glosario: devuelve los términos vigentes con definición y sinónimos', async () => {
    const root = await initWorkspace()
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_glossary')
    const data = toolJson(response) as { terms: Array<{ term: string; definition: string; synonyms: string[] }> }
    expect(data.terms.length).toBeGreaterThan(0)
    expect(data.terms[0]).toHaveProperty('term')
    expect(data.terms[0]).toHaveProperty('definition')
  })

  it('glosario vacío: informa y sugiere definir, sin inventar', async () => {
    const root = await initWorkspace()
    await fs.writeFile(path.join(root, '.sdd', 'glossary.md'), '# Glosario\n\nSin términos.\n', 'utf8')
    const host = hostFor(root)
    const response = await callTool(host, 'atlas_glossary')
    const data = toolJson(response) as { terms: unknown[]; message: string; action: string }
    expect(data.terms).toHaveLength(0)
    expect(data.message).toContain('no tiene términos')
    expect(data.action).toBeDefined()
  })
})

describe('MCP: atlas_fixes (REQ-FIXES-005)', () => {
  async function writeLivingFix(root: string, name: string, content: string): Promise<void> {
    const dir = path.join(root, '.sdd', 'fixes')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, name), content, 'utf8')
  }

  it('S2: devuelve cada fix vivo con identidad, contenido y requisitos declarados', async () => {
    const root = await initWorkspace()
    await writeLivingFix(
      root,
      '2026-09-arreglo.md',
      `---\nslug: arreglo\ndate: 2026-09-20\nresult: pass\ndomain: auth\ncovers:\n  - REQ-AUTH-001\n---\n\n# Fix — Arreglo\n\n## Causa raíz\nComparación sin zona horaria.\n`,
    )

    const data = toolJson(await callTool(hostFor(root), 'atlas_fixes')) as {
      fixes: Array<{ slug: string; date: string; result: string; domain?: string; covers: string[]; content: string }>
    }
    expect(data.fixes).toHaveLength(1)
    expect(data.fixes[0]?.slug).toBe('arreglo')
    expect(data.fixes[0]?.date).toBe('2026-09-20')
    expect(data.fixes[0]?.result).toBe('pass')
    expect(data.fixes[0]?.domain).toBe('auth')
    expect(data.fixes[0]?.covers).toEqual(['REQ-AUTH-001'])
    expect(data.fixes[0]?.content).toContain('Causa raíz')
  })

  it('S2: un fix archivado antes de la función también se informa', async () => {
    const root = await initWorkspace()
    const created = await runNew(ctx(root, { lane: 'fix', domain: 'auth' }, ['heredado']))
    expect(created.exitCode).toBe(0)
    const dir = path.join(root, '.sdd', 'changes', 'heredado')
    await fs.writeFile(
      path.join(dir, 'fix.md'),
      `# Fix — Heredado\n\n## Causa raíz\nZona horaria.\n\n## Evidencia\n\n### REQ-AUTH-001-S1\n\n\`\`\`evidence\nmethod: manual\nresult: pass\ndate: 2026-08-01 10:00:00 -05:00\nby: Prueba\n\`\`\`\n`,
      'utf8',
    )
    await fs.mkdir(path.join(root, '.sdd', 'changes', 'archive'), { recursive: true })
    await fs.cp(dir, path.join(root, '.sdd', 'changes', 'archive', '2026-08-heredado'), { recursive: true })
    await fs.rm(dir, { recursive: true, force: true })

    const data = toolJson(await callTool(hostFor(root), 'atlas_fixes')) as { fixes: Array<{ slug: string; source: string; result: string }> }
    const legacy = data.fixes.find((fix) => fix.slug === 'heredado')
    expect(legacy?.source).toBe('archive')
    expect(legacy?.result).toBe('pass')
  })

  it('S3: sin fixes vivos informa y sugiere crear uno', async () => {    const root = await initWorkspace()
    const data = toolJson(await callTool(hostFor(root), 'atlas_fixes')) as { fixes: unknown[]; message: string; action: string }
    expect(data.fixes).toHaveLength(0)
    expect(data.message).toContain('No hay fixes vivos')
    expect(data.action).toBe('satlas new <slug> --lane fix')
  })

  it('S3: con un fix activo sugiere archivarlo', async () => {
    const root = await initWorkspace()
    const created = await runNew(ctx(root, { lane: 'fix', domain: 'auth' }, ['arreglo-pendiente']))
    expect(created.exitCode).toBe(0)
    const data = toolJson(await callTool(hostFor(root), 'atlas_fixes')) as { action: string }
    expect(data.action).toBe('satlas archive arreglo-pendiente')
  })
})

describe('MCP: solo lectura (REQ-MCP-006)', () => {
  it('S1: el catálogo expone únicamente operaciones de consulta', async () => {
    const host = hostFor(await newRoot('atlas-mcp-ro-'))
    const response = (await handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, host)) as JsonRpcResponse
    const result = response.result as { tools: Array<{ name: string }> }
    const names = result.tools.map((t) => t.name).sort()
    expect(names).toEqual([...READ_ONLY_TOOL_NAMES].sort())
    for (const tool of listTools()) {
      expect(tool.inputSchema.additionalProperties).toBe(false)
    }
  })

  it('S2: tras ejecutar todas las operaciones el proyecto queda intacto', async () => {
    const root = await initWorkspace()
    await initChange(root, 'reset-password', DELTA, TASKS)
    const host = hostFor(root)
    const before = await snapshotHashes(root)

    await callTool(host, 'atlas_status')
    await callTool(host, 'atlas_status', { slug: 'reset-password' })
    await callTool(host, 'atlas_next', { slug: 'reset-password' })
    await callTool(host, 'atlas_validate', { slug: 'reset-password' })
    await callTool(host, 'atlas_trace', { slug: 'reset-password' })
    await callTool(host, 'atlas_impact', { target: 'REQ-AUTH-001' })
    await callTool(host, 'atlas_impact', { target: 'src/reset.ts' })
    await callTool(host, 'atlas_glossary')
    await callTool(host, 'atlas_fixes')
    await handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, host)

    const after = await snapshotHashes(root)
    expect(after.size).toBe(before.size)
    for (const [file, hash] of before) {
      expect(after.get(file), `el archivo ${file} cambió`).toBe(hash)
    }
  })
})
