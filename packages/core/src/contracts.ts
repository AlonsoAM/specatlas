import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { Change, ContractFile, ContractFormat, ContractOperation, ContractsState } from './model.js'
import type { AtlasConfig } from './config.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { listDir, readTextIfExists } from './fsx.js'

export const CONTRACTS_DIR = 'contracts'

const OPENAPI_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
const SUPPORTED_HINT = 'Formatos esperados: OpenAPI 3.x (.yaml/.json), GraphQL SDL (.graphql/.gql) y protobuf (.proto)'

function lineOf(content: string, needle: string): number {
  const index = content.indexOf(needle)
  if (index < 0) return 1
  return content.slice(0, index).split('\n').length
}

export function formatOf(file: string, content: string): ContractFormat {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.proto') return 'protobuf'
  if (ext === '.graphql' || ext === '.gql') return 'graphql'
  if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
    return /(^|\n)\s*openapi\s*:/.test(content) || /"openapi"\s*:/.test(content) ? 'openapi' : 'unsupported'
  }
  return 'unsupported'
}

function parseOpenApi(file: string, content: string): { operations: ContractOperation[]; findings: Diagnostic[] } {
  const findings: Diagnostic[] = []
  let data: unknown
  try {
    data = parseYaml(content)
  } catch (error) {
    return { operations: [], findings: [diag('ATLAS-CONTRACT-001', 'error', `Contrato OpenAPI ilegible: ${(error as Error).message}`, { path: file })] }
  }
  const doc = data as { openapi?: unknown; info?: { title?: unknown }; paths?: unknown } | null
  if (!doc || typeof doc !== 'object' || typeof doc.openapi !== 'string' || typeof doc.paths !== 'object' || doc.paths === null || Array.isArray(doc.paths)) {
    return {
      operations: [],
      findings: [diag('ATLAS-CONTRACT-001', 'error', 'Contrato OpenAPI inválido: faltan la versión (openapi) o los caminos (paths)', { path: file, line: lineOf(content, 'paths'), suggestion: SUPPORTED_HINT })],
    }
  }
  const operations: ContractOperation[] = []
  for (const [route, value] of Object.entries(doc.paths as Record<string, unknown>)) {
    if (!route.startsWith('/') || typeof value !== 'object' || value === null) continue
    for (const method of OPENAPI_METHODS) {
      if (method in (value as Record<string, unknown>)) {
        operations.push({ id: `${method.toUpperCase()} ${route}`, kind: 'openapi', file, line: lineOf(content, route) })
      }
    }
  }
  return { operations, findings }
}

function parseGraphql(file: string, content: string): { operations: ContractOperation[]; findings: Diagnostic[] } {
  const operations: ContractOperation[] = []
  const blockRe = /type\s+(Query|Mutation|Subscription)\s*\{([\s\S]*?)\}/g
  for (const match of content.matchAll(blockRe)) {
    const typeName = match[1] ?? ''
    const body = match[2] ?? ''
    for (const field of body.split('\n')) {
      const fieldMatch = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(\(|:)/.exec(field)
      if (fieldMatch) operations.push({ id: `${typeName}.${fieldMatch[1]}`, kind: 'graphql', file, line: lineOf(content, field.trim()) })
    }
  }
  if (operations.length === 0) {
    return {
      operations,
      findings: [diag('ATLAS-CONTRACT-001', 'error', 'Contrato GraphQL inválido: no declara consultas (type Query), mutaciones ni suscripciones', { path: file, suggestion: SUPPORTED_HINT })],
    }
  }
  return { operations, findings: [] }
}

function parseProtobuf(file: string, content: string): { operations: ContractOperation[]; findings: Diagnostic[] } {
  const operations: ContractOperation[] = []
  const serviceRe = /service\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\}/g
  for (const match of content.matchAll(serviceRe)) {
    const service = match[1] ?? ''
    const body = match[2] ?? ''
    for (const rpc of body.matchAll(/rpc\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
      operations.push({ id: `${service}.${rpc[1]}`, kind: 'protobuf', file, line: lineOf(content, `rpc ${rpc[1]}`) })
    }
  }
  if (operations.length === 0 && !/message\s+[A-Za-z_]/.test(content)) {
    return {
      operations,
      findings: [diag('ATLAS-CONTRACT-001', 'error', 'Contrato protobuf inválido: no declara servicios ni mensajes', { path: file, suggestion: SUPPORTED_HINT })],
    }
  }
  return { operations, findings: [] }
}

export function parseContract(file: string, content: string): ContractFile & { findings: Diagnostic[] } {
  const format = formatOf(file, content)
  if (format === 'unsupported') {
    return {
      path: file,
      format,
      operations: [],
      findings: [diag('ATLAS-CONTRACT-002', 'warning', 'Formato de contrato no soportado; el archivo no se interpreta ni se toca', { path: file, suggestion: SUPPORTED_HINT })],
    }
  }
  const parsed = format === 'openapi' ? parseOpenApi(file, content) : format === 'graphql' ? parseGraphql(file, content) : parseProtobuf(file, content)
  return { path: file, format, operations: parsed.operations, findings: parsed.findings }
}

export async function loadContracts(changeDir: string): Promise<ContractsState> {
  const dir = path.join(changeDir, CONTRACTS_DIR)
  const files: ContractFile[] = []
  const operations: ContractOperation[] = []
  const findings: Diagnostic[] = []
  const entries = (await listDir(dir)).sort()
  for (const entry of entries) {
    const file = path.join(dir, entry)
    const content = await readTextIfExists(file)
    if (content === undefined) continue
    const parsed = parseContract(file, content)
    files.push({ path: parsed.path, format: parsed.format, operations: parsed.operations })
    operations.push(...parsed.operations)
    findings.push(...parsed.findings)
  }
  return { files, operations, findings }
}

export function contractCoverage(change: Change, mode: AtlasConfig['gates']['contracts']['mode']): Diagnostic[] {
  const state = change.contracts
  if (mode === 'off' || !state || state.files.length === 0 || state.operations.length === 0) return []

  const scenarioContracts = new Map<string, string>()
  for (const requirement of [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])]) {
    for (const scenario of requirement.scenarios) {
      for (const ref of scenario.contracts ?? []) {
        if (!scenarioContracts.has(ref)) scenarioContracts.set(ref, scenario.id)
      }
    }
  }

  const findings: Diagnostic[] = []
  for (const operation of state.operations) {
    if (!scenarioContracts.has(operation.id)) {
      findings.push(
        diag('ATLAS-CONTRACT-003', 'warning', `Operación sin escenario: ${operation.id}`, {
          path: operation.file,
          line: operation.line,
          suggestion: `Declara la operación en un escenario con · **Contrato**: ${operation.id}`,
        }),
      )
    }
  }
  const known = new Set(state.operations.map((operation) => operation.id))
  for (const [ref, scenarioId] of scenarioContracts) {
    if (!known.has(ref)) {
      findings.push(
        diag('ATLAS-CONTRACT-004', 'warning', `Referencia rota: el escenario ${scenarioId} declara "${ref}", que no existe en el contrato`, {
          path: change.delta?.path,
          suggestion: 'Corrige la referencia o añade la operación al contrato',
        }),
      )
    }
  }
  return findings
}

export function contractsAdvisory(change: Change, cfg: AtlasConfig): Diagnostic[] {
  const state = change.contracts
  if (!state || state.files.length === 0) return []
  const mode = cfg.gates.contracts.mode
  const form = state.findings
  if (mode === 'advisory') return [...form, ...contractCoverage(change, mode)]
  return form
}
