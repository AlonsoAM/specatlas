import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createChange } from '../src/new'
import { initWorkspace } from '../src/init'
import { signApproval } from '../src/approvals'
import { loadApprovals, loadChange, loadWorkspace } from '../src/workspace'
import { deriveState, verifyApproval } from '../src/lifecycle'
import { parseDelta } from '../src/parse/delta'
import { contractCoverage, contractsAdvisory, loadContracts, parseContract } from '../src/contracts'
import { defaultConfig } from '../src/config'

const DELTA = `# Delta — Gestionar tareas

## Requisitos agregados

### Requisito: REQ-TAREA-001 — Gestionar tareas
El sistema DEBE permitir gestionar tareas.

#### Escenario: REQ-TAREA-001-S1 — Listar tareas
- **CUANDO** el equipo pide la lista de tareas
- **ENTONCES** recibe las tareas
- **Contrato**: GET /tareas
`

const TASKS = `# Tareas

## Bloque 1 — API

- [x] T1.1 Listar tareas · Archivos: src/tareas.ts · Cubre: REQ-TAREA-001-S1
`

const VERIFY = `# Verificación

### REQ-TAREA-001-S1

\`\`\`evidence
method: executable
command: node -e ok
result: pass
date: 2026-09-20 10:00:00 -05:00
by: Prueba
\`\`\`
`

const OPENAPI = `openapi: 3.0.0
info:
  title: Tareas
  version: 1.0.0
paths:
  /tareas:
    get:
      responses:
        '200':
          description: ok
    post:
      responses:
        '201':
          description: creada
`

const GRAPHQL = `type Query {
  tareas: [Tarea]
}

type Mutation {
  crearTarea(titulo: String!): Tarea
}
`

const PROTO = `syntax = "proto3";

message Tarea {
  string titulo = 1;
}

service TareasServicio {
  rpc Crear (Tarea) returns (Tarea);
}
`

async function writeArtifact(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, '.sdd', ...rel.split('/'))
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

async function makeChange(contracts: Record<string, string> = {}, delta = DELTA): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-contracts-'))
  await initWorkspace({ root, name: 'contratos', language: 'es' })
  await createChange({ root, slug: 'gestion-tareas', lane: 'standard', domain: 'tareas', title: 'Gestionar tareas' })
  await writeArtifact(root, 'changes/gestion-tareas/spec.md', delta)
  await writeArtifact(root, 'changes/gestion-tareas/tasks.md', TASKS)
  await writeArtifact(root, 'changes/gestion-tareas/verify.md', VERIFY)
  for (const [name, content] of Object.entries(contracts)) {
    await writeArtifact(root, `changes/gestion-tareas/contracts/${name}`, content)
  }
  await signApproval({ root, artifact: 'changes/gestion-tareas/spec.md', by: 'Maria Perez' })
  return root
}

describe('referencia de contrato en escenarios', () => {
  it('el escenario declara la operación del contrato (REQ-INTEGRACIONES-002-S1)', () => {
    const delta = parseDelta(DELTA, 'spec.md')
    const scenario = delta.added[0]?.scenarios[0]
    expect(scenario?.contracts).toEqual(['GET /tareas'])
  })
})

describe('lectura y forma de contratos', () => {
  it('extrae operaciones de OpenAPI (REQ-INTEGRACIONES-001-S1)', async () => {
    const root = await makeChange({ 'openapi.yaml': OPENAPI })
    const change = await loadChange(root, 'gestion-tareas')
    expect(change.contracts?.files).toHaveLength(1)
    expect(change.contracts?.files[0]?.format).toBe('openapi')
    expect(change.contracts?.operations.map((operation) => operation.id).sort()).toEqual(['GET /tareas', 'POST /tareas'])
    expect(change.contracts?.findings).toEqual([])
  })

  it('extrae operaciones de GraphQL y protobuf (REQ-INTEGRACIONES-001-S1)', async () => {
    const root = await makeChange({ 'schema.graphql': GRAPHQL, 'tareas.proto': PROTO })
    const change = await loadChange(root, 'gestion-tareas')
    const ids = change.contracts?.operations.map((operation) => operation.id).sort()
    expect(ids).toEqual(['Mutation.crearTarea', 'Query.tareas', 'TareasServicio.Crear'])
  })

  it('reporta un contrato mal formado sin inventar lo que falta (REQ-INTEGRACIONES-001-S2)', async () => {
    const root = await makeChange({ 'openapi.yaml': 'openapi: 3.0.0\ninfo:\n  title: X\n' })
    const change = await loadChange(root, 'gestion-tareas')
    expect(change.contracts?.operations).toEqual([])
    expect(change.contracts?.findings.some((finding) => finding.code === 'ATLAS-CONTRACT-001')).toBe(true)
  })

  it('un formato no soportado se avisa y el archivo no se toca (REQ-INTEGRACIONES-001-S4)', async () => {
    const root = await makeChange({ 'servicio.wsdl': '<definitions />' })
    const file = path.join(root, '.sdd', 'changes', 'gestion-tareas', 'contracts', 'servicio.wsdl')
    const before = await fs.readFile(file, 'utf8')
    const change = await loadChange(root, 'gestion-tareas')
    expect(change.contracts?.findings.some((finding) => finding.code === 'ATLAS-CONTRACT-002')).toBe(true)
    expect(change.contracts?.operations).toEqual([])
    expect(await fs.readFile(file, 'utf8')).toBe(before)
  })

  it('sin contratos declarados no hay nada que comprobar (REQ-INTEGRACIONES-001-S3)', async () => {
    const root = await makeChange()
    const change = await loadChange(root, 'gestion-tareas')
    expect(change.contracts).toBeUndefined()
    expect(contractCoverage(change, 'advisory')).toEqual([])
  })

  it('parsea un contrato suelto con su formato', () => {
    const parsed = parseContract('x.graphql', GRAPHQL)
    expect(parsed.format).toBe('graphql')
    expect(parsed.findings).toEqual([])
  })
})

describe('cobertura cruzada escenario ↔ contrato', () => {
  it('la operación referenciada no genera hallazgo (REQ-INTEGRACIONES-002-S1)', async () => {
    const root = await makeChange({ 'openapi.yaml': OPENAPI })
    const change = await loadChange(root, 'gestion-tareas')
    const findings = contractCoverage(change, 'advisory')
    expect(findings.filter((finding) => finding.message.includes('GET /tareas'))).toEqual([])
  })

  it('la operación sin escenario se reporta con su identificador (REQ-INTEGRACIONES-002-S2)', async () => {
    const root = await makeChange({ 'openapi.yaml': OPENAPI })
    const change = await loadChange(root, 'gestion-tareas')
    const findings = contractCoverage(change, 'advisory')
    const uncovered = findings.find((finding) => finding.code === 'ATLAS-CONTRACT-003')
    expect(uncovered?.message).toContain('POST /tareas')
  })

  it('la referencia rota se reporta con el identificador declarado (REQ-INTEGRACIONES-002-S3)', async () => {
    const root = await makeChange({ 'openapi.yaml': OPENAPI }, DELTA.replace('GET /tareas', 'GET /no-existe'))
    const change = await loadChange(root, 'gestion-tareas')
    const findings = contractCoverage(change, 'advisory')
    const broken = findings.find((finding) => finding.code === 'ATLAS-CONTRACT-004')
    expect(broken?.message).toContain('GET /no-existe')
    expect(broken?.message).toContain('REQ-TAREA-001-S1')
  })

  it('el modo apagado no emite hallazgos de cobertura (REQ-INTEGRACIONES-002-S5)', async () => {
    const root = await makeChange({ 'openapi.yaml': OPENAPI })
    const change = await loadChange(root, 'gestion-tareas')
    expect(contractCoverage(change, 'off')).toEqual([])
  })

  it('el aviso de forma se expone aunque el modo esté apagado', async () => {
    const root = await makeChange({ 'openapi.yaml': 'openapi: 3.0.0\n' })
    const change = await loadChange(root, 'gestion-tareas')
    const cfg = defaultConfig()
    cfg.gates.contracts.mode = 'off'
    const advisories = contractsAdvisory(change, cfg)
    expect(advisories.some((finding) => finding.code === 'ATLAS-CONTRACT-001')).toBe(true)
  })
})

describe('gate de contratos en el ciclo de vida', () => {
  async function stateOf(root: string, mode: 'off' | 'advisory' | 'blocking'): Promise<ReturnType<typeof deriveState>> {
    const { workspace } = await loadWorkspace(root)
    const change = await loadChange(root, 'gestion-tareas')
    const delta = await fs.readFile(path.join(change.dir, 'spec.md'), 'utf8')
    const approvals = await loadApprovals(workspace.sddDir)
    const cfg = defaultConfig()
    cfg.gates.contracts.mode = mode
    const approval = verifyApproval(change, approvals.byArtifact, cfg, delta)
    return deriveState({ change, cfg, approval, blockingFindings: 0 })
  }

  it('el modo bloqueante detiene el archivado con huecos o roturas (REQ-INTEGRACIONES-002-S4)', async () => {
    const root = await makeChange({ 'openapi.yaml': OPENAPI })
    const state = await stateOf(root, 'blocking')
    expect(state.state).toBe('verified')
    expect(state.blockedBy.join(' ')).toContain('contratos con hallazgos (1)')
    expect(state.nextAction.command).toContain('satlas contracts')
  })

  it('el modo aviso no bloquea el archivado', async () => {
    const root = await makeChange({ 'openapi.yaml': OPENAPI })
    const state = await stateOf(root, 'advisory')
    expect(state.state).toBe('ready')
    expect(state.nextAction.command).toContain('satlas archive')
  })
})

describe('carga de contratos en el cambio', () => {
  it('sin carpeta de contratos no se carga nada', async () => {
    const root = await makeChange()
    const contracts = await loadContracts(path.join(root, '.sdd', 'changes', 'gestion-tareas'))
    expect(contracts.files).toEqual([])
    expect(contracts.findings).toEqual([])
  })
})
