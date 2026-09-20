import type { Diagnostic } from './diagnostics.js'

export type Lane = 'fix' | 'standard' | 'full'
export type RiskLevel = 'low' | 'medium' | 'high'
export type Domain = 'frontend' | 'backend' | 'database' | 'mobile' | 'reports' | 'testing' | 'infra' | 'fullstack' | 'other'
export type Language = 'es' | 'en'

export const REQ_ID_RE = /^REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}$/
export const SCENARIO_ID_RE = /^REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}-S\d+$/
export const RULE_ID_RE = /^BR-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}$/
export const TASK_ID_RE = /^T[A-Za-z0-9]+\.\d+$/

export interface Rule {
  id: string
  text: string
  line: number
}

export interface Scenario {
  id: string
  title: string
  reqId: string
  when: string[]
  then: string[]
  contracts?: string[]
  line: number
}

export type ContractFormat = 'openapi' | 'graphql' | 'protobuf' | 'unsupported'

export interface ContractOperation {
  id: string
  kind: ContractFormat
  file: string
  line: number
}

export interface ContractFile {
  path: string
  format: ContractFormat
  operations: ContractOperation[]
}

export interface ContractsState {
  files: ContractFile[]
  operations: ContractOperation[]
  findings: Diagnostic[]
}

export interface LinkEntry {
  name: string
  path: string
}

export interface LinkStatus extends LinkEntry {
  available: boolean
  requirements: number
  domains: string[]
  error?: string
}

export interface LinksState {
  entries: LinkStatus[]
  specs: SpecRef[]
  unavailable: string[]
}

export interface Requirement {
  id: string
  title: string
  prose: string
  rules: Rule[]
  scenarios: Scenario[]
  line: number
}

export interface SpecFile {
  path: string
  frontmatter: Record<string, unknown>
  domain?: string
  title?: string
  version?: number
  requirements: Requirement[]
  diagnostics: Diagnostic[]
}

export type DeltaOp = 'added' | 'modified' | 'removed' | 'renamed'

export interface Rename {
  from: { id: string; title: string }
  to: { id: string; title: string }
  line: number
}

export interface Delta {
  path: string
  added: Requirement[]
  modified: Requirement[]
  removed: Requirement[]
  renamed: Rename[]
  sectionsFound: DeltaOp[]
  diagnostics: Diagnostic[]
}

export interface Task {
  id: string
  block: string
  text: string
  done: boolean
  files: string[]
  covers: string[]
  dependsOn: string[]
  rollback?: string
  infra: boolean
  line: number
}

export interface TaskBlock {
  id: string
  title: string
  line: number
  tasks: Task[]
}

export interface TasksFile {
  path: string
  blocks: TaskBlock[]
  diagnostics: Diagnostic[]
  counts: { done: number; total: number }
}

export type EvidenceMethod = 'executable' | 'automatic' | 'semi' | 'manual'
export type EvidenceResult = 'pass' | 'fail' | 'skipped'

export interface Evidence {
  scenario: string
  method: EvidenceMethod
  command?: string
  result: EvidenceResult
  outputHash?: string
  date: string
  by: string
  notes?: string
  line: number
}

export interface VerifyFile {
  path: string
  evidence: Evidence[]
  diagnostics: Diagnostic[]
}

export interface Override {
  gate: string
  reason: string
  by: string
  at: string
}

export interface ChangeMeta {
  schemaVersion: number
  slug: string
  title?: string
  domain?: string
  lane: Lane
  risk?: RiskLevel
  created?: string
  owner?: string
  mockups?: 'required' | 'skip'
  tracker?: { provider: string; id: string; url?: string }
  paused?: { reason: string; at: string; by: string }
  laneHistory?: Array<{ from: Lane; to: Lane; at: string; by: string }>
  diagramExceptions?: string[]
  overrides?: Override[]
}

export interface Approval {
  artifact: string
  artifactHash: string
  approvedBy: string
  approvedAt: string
  channel: 'presentation' | 'editor' | 'pr' | 'tracker' | 'cli'
  note?: string
}

export interface ApprovalsFile {
  schemaVersion: number
  approvals: Approval[]
}

export interface MockupScreen {
  id: string
  file: string
  title?: string
  illustrates?: string[]
  states?: string[]
  breakpoints?: number[]
  themes?: string[]
}

export interface MockupManifest {
  schemaVersion: number
  version: number
  level: 'sketch' | 'hifi'
  platform: 'web' | 'mobile' | 'desktop'
  inputsHash?: string
  generatedAt?: string
  tokens?: string
  screens: MockupScreen[]
}

export interface ClarifyItem {
  text: string
  line: number
  answer?: string
}

export interface ClarifyFile {
  path: string
  open: ClarifyItem[]
  resolved: ClarifyItem[]
  diagnostics: Diagnostic[]
}

export interface Change {
  slug: string
  dir: string
  meta?: ChangeMeta
  delta?: Delta
  tasks?: TasksFile
  verify?: VerifyFile
  fix?: VerifyFile
  fixCovers?: string[]
  clarify?: ClarifyFile
  clarifyPath?: string
  docsPaths?: string[]
  contracts?: ContractsState
  planPath?: string
  reviewPath?: string
  presentationPath?: string
  mockupManifestPath?: string
  diagnostics: Diagnostic[]
}

export interface SpecRef {
  domain: string
  path: string
  spec: SpecFile
}

export interface Workspace {
  root: string
  sddDir: string
  specs: SpecRef[]
  changes: Change[]
  archived: Change[]
  links?: LinksState
  diagnostics: Diagnostic[]
}
