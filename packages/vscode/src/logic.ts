import path from 'node:path'
import {
  checkTrace,
  computeInputsHash,
  deriveState,
  exists,
  findWorkspaceRoot,
  lintDelta,
  loadApprovals,
  loadLivingFixes,
  loadWorkspace,
  evaluatePacks,
  mockupsReady,
  packFindings,
  readMockupManifest,
  readTextIfExists,
  renderDocument,
  requiresMockups,
  resolvePacks,
  stateLabel,
  verifyApproval,
  type Change,
  type Diagnostic,
  type Language,
  type Requirement,
} from '@specatlas/core'

export type FlatSeverity = 'error' | 'warning' | 'info'

export interface FlatDiagnostic {
  file: string
  line: number
  severity: FlatSeverity
  code: string
  message: string
  suggestion?: string
}

export type FileKind = 'proposal' | 'spec' | 'plan' | 'tasks' | 'verify' | 'review' | 'fix' | 'analyze' | 'presentation' | 'mockup'

export interface SnapshotTaskItem {
  id: string
  title: string
  block: string
  done: boolean
  line: number
  covers: number
}

export interface SnapshotMockupItem {
  id: string
  title: string
  file: string
}

export interface TaskBlockGroup {
  block: string
  tasks: SnapshotTaskItem[]
}

export function groupTasksByBlock(tasks: SnapshotTaskItem[]): TaskBlockGroup[] {
  const groups: TaskBlockGroup[] = []
  for (const task of tasks) {
    const existing = groups.find((group) => group.block === task.block)
    if (existing) existing.tasks.push(task)
    else groups.push({ block: task.block, tasks: [task] })
  }
  return groups
}

export interface SnapshotFile {
  label: string
  path: string
  exists: boolean
  kind: FileKind
  description?: string
  tasks?: SnapshotTaskItem[]
  screens?: SnapshotMockupItem[]
}

export interface SnapshotMockups {
  screens: number
  stale: boolean
  dir?: string
  items?: SnapshotMockupItem[]
  required?: boolean
  decision?: 'required' | 'skip'
}

export interface SnapshotChange {
  slug: string
  dir: string
  title?: string
  domain?: string
  lane: string
  state: string
  stateLabel: string
  next: string
  nextDescription: string
  requiresAgent: boolean
  blockedBy: string[]
  approval?: { by: string; at: string }
  progress: { tasksDone: number; tasksTotal: number; scenariosDone: number; scenariosTotal: number }
  blocking: number
  files: SnapshotFile[]
  mockups: SnapshotMockups
}

export interface SnapshotSpecItem {
  id: string
  title: string
  line: number
  scenarios: number
}

export interface SnapshotSpec {
  domain: string
  title?: string
  path: string
  requirements: number
  scenarios: number
  items: SnapshotSpecItem[]
}

export const STATE_PRIORITY: Record<string, number> = {
  awaiting_mockups: 0,
  awaiting_approval: 1,
  spec_draft: 2,
  draft: 3,
  building: 4,
  built: 5,
  verified: 6,
  ready: 7,
}

export function sortChanges(changes: SnapshotChange[]): SnapshotChange[] {
  return [...changes].sort((a, b) => {
    const priority = (STATE_PRIORITY[a.state] ?? 9) - (STATE_PRIORITY[b.state] ?? 9)
    if (priority !== 0) return priority
    if (b.blocking !== a.blocking) return b.blocking - a.blocking
    return a.slug.localeCompare(b.slug)
  })
}

export interface Snapshot {
  root: string
  projectName: string
  language: Language
  specs: SnapshotSpec[]
  changes: SnapshotChange[]
  fixes: SnapshotFix[]
  archived: SnapshotArchived[]
  diagnostics: FlatDiagnostic[]
  summary: { specs: number; changes: number; fixes: number; errors: number; warnings: number }
}

export interface SnapshotFix {
  slug: string
  date: string
  result: string
  path: string
  covers: string[]
  source: 'living' | 'archive'
  domain?: string
  title?: string
}

export interface SnapshotArchived {
  slug: string
  lane: string
  month: string
  path: string
  file: string
  title?: string
}

export async function buildSnapshot(startDir: string): Promise<Snapshot | undefined> {
  const root = await findWorkspaceRoot(startDir)
  if (!root) return undefined
  const { workspace, config } = await loadWorkspace(root)
  const approvals = await loadApprovals(workspace.sddDir)

  const living = new Map<string, Requirement>()
  for (const spec of workspace.specs) {
    for (const requirement of spec.spec.requirements) living.set(requirement.id, requirement)
  }

  const diagnostics: FlatDiagnostic[] = workspace.diagnostics.map((d) => toFlat(d))
  const changes: SnapshotChange[] = []

  const packEvaluation = config.packs.length > 0 ? await resolvePacks(workspace.sddDir, config) : undefined
  for (const finding of packEvaluation?.diagnostics ?? []) diagnostics.push(toFlat(finding))

  for (const change of workspace.changes) {
    const deltaPath = path.join(change.dir, 'spec.md')
    const deltaContent = await readTextIfExists(deltaPath)
    const approval = verifyApproval(change, approvals.byArtifact, config, deltaContent ?? undefined)
    const lintFindings = change.delta ? lintDelta(change.delta, living, deltaPath, { language: config.spec.language }) : []
    const trace = checkTrace({
      specs: workspace.specs,
      change,
      requireEvidence: config.gates.verify.mode !== 'off' && config.gates.verify.require_evidence,
    })
    const blocking = [...lintFindings, ...trace.findings].filter((d) => d.severity === 'error').length
    const requiresMockupGate = requiresMockups(change.meta, config)
    const mockupsAreReady = requiresMockupGate ? await mockupsReady(root, change.slug, change) : undefined
    const state = deriveState({
      change,
      cfg: config,
      approval,
      blockingFindings: change.delta ? blocking : 0,
      ...(mockupsAreReady !== undefined ? { mockupsReady: mockupsAreReady } : {}),
    })

    for (const finding of [...lintFindings, ...trace.findings]) diagnostics.push(toFlat(finding))
    if (packEvaluation) {
      const evaluations = evaluatePacks(packEvaluation.packs, change, config)
      for (const finding of packFindings(evaluations, change)) diagnostics.push(toFlat(finding))
    }

    const mockups = await mockupInfo(root, change, requiresMockupGate)

    changes.push({
      slug: change.slug,
      dir: change.dir,
      ...(change.meta?.title !== undefined ? { title: change.meta.title } : {}),
      ...(change.meta?.domain !== undefined ? { domain: change.meta.domain } : {}),
      lane: change.meta?.lane ?? config.lanes.default,
      state: state.state,
      stateLabel: stateLabel(state.state),
      next: state.nextAction.command,
      nextDescription: state.nextAction.description,
      requiresAgent: state.nextAction.requiresAgent,
      blockedBy: state.blockedBy,
      ...(approval.status === 'valid' && approval.approvedBy
        ? { approval: { by: approval.approvedBy, at: approval.approvedAt ?? '' } }
        : {}),
      progress: {
        tasksDone: state.progress.tasksDone,
        tasksTotal: state.progress.tasksTotal,
        scenariosDone: state.progress.scenariosEvidenced,
        scenariosTotal: state.progress.scenariosTotal,
      },
      blocking,
      files: await changeFiles(change, mockups.items ?? []),
      mockups,
    })
  }

  const sortedChanges = sortChanges(changes)

  const livingFixes = await loadLivingFixes(root)
  const fixes: SnapshotFix[] = livingFixes.map((fix) => ({
    slug: fix.slug,
    date: fix.date,
    result: fix.result,
    path: fix.file,
    covers: fix.covers,
    source: fix.source,
    ...(fix.domain !== undefined ? { domain: fix.domain } : {}),
    ...(fix.title !== undefined ? { title: fix.title } : {}),
  }))

  const archived: SnapshotArchived[] = []
  for (const change of workspace.archived ?? []) {
    if (change.meta?.lane === 'fix') continue
    const month = /^(\d{4}-\d{2})/.exec(path.basename(change.dir))?.[1] ?? ''
    archived.push({
      slug: change.slug,
      lane: change.meta?.lane ?? 'standard',
      month,
      path: change.dir,
      file: path.join(change.dir, 'spec.md'),
      ...(change.meta?.title !== undefined ? { title: change.meta.title } : {}),
    })
  }
  archived.sort((a, b) => b.month.localeCompare(a.month) || a.slug.localeCompare(b.slug))

  return {
    root,
    projectName: config.project.name,
    language: config.project.language,
    specs: workspace.specs.map((spec) => ({
      domain: spec.domain,
      ...(spec.spec.title !== undefined ? { title: spec.spec.title } : {}),
      path: spec.path,
      requirements: spec.spec.requirements.length,
      scenarios: spec.spec.requirements.reduce((acc, r) => acc + r.scenarios.length, 0),
      items: spec.spec.requirements.map((requirement) => ({
        id: requirement.id,
        title: requirement.title,
        line: requirement.line,
        scenarios: requirement.scenarios.length,
      })),
    })),
    changes: sortedChanges,
    fixes,
    archived,
    diagnostics,
    summary: {
      specs: workspace.specs.length,
      changes: changes.length,
      fixes: fixes.length,
      errors: diagnostics.filter((d) => d.severity === 'error').length,
      warnings: diagnostics.filter((d) => d.severity === 'warning').length,
    },
  }
}

async function mockupInfo(root: string, change: Change, requireMockups: boolean): Promise<SnapshotMockups> {
  const dir = path.join(change.dir, 'mockups')
  const decision = change.meta?.mockups
  if (!(await exists(dir))) return { screens: 0, stale: false, required: requireMockups, ...(decision ? { decision } : {}) }
  const { manifest } = await readMockupManifest(root, change.slug)
  if (!manifest) return { screens: 0, stale: false, dir, required: requireMockups, ...(decision ? { decision } : {}) }
  let stale = false
  try {
    const inputsHash = await computeInputsHash(root, change)
    stale = manifest.inputsHash !== undefined && manifest.inputsHash !== inputsHash
  } catch {
    stale = false
  }
  const items: SnapshotMockupItem[] = manifest.screens.map((screen) => ({
    id: screen.id,
    title: screen.title ?? screen.id,
    file: screen.file,
  }))
  return { screens: manifest.screens.length, stale, dir, items, required: requireMockups, ...(decision ? { decision } : {}) }
}

async function changeFiles(change: Change, screens: SnapshotMockupItem[]): Promise<SnapshotFile[]> {
  const candidates: Array<{ label: string; rel: string; kind: FileKind; description?: string }> = [
    { label: 'Propuesta', rel: 'proposal.md', kind: 'proposal' },
    { label: 'Spec (delta)', rel: 'spec.md', kind: 'spec' },
    { label: 'Plan técnico', rel: 'plan.md', kind: 'plan', description: 'incluye diagramas mermaid' },
    { label: 'Tareas', rel: 'tasks.md', kind: 'tasks' },
    { label: 'Verificación', rel: 'verify.md', kind: 'verify' },
    { label: 'Revisión', rel: 'review.md', kind: 'review' },
    { label: 'Fix', rel: 'fix.md', kind: 'fix' },
    { label: 'Análisis', rel: 'analyze.md', kind: 'analyze' },
    { label: 'Presentación', rel: path.join('presentation', 'index.html'), kind: 'presentation' },
    { label: 'Mockups', rel: path.join('mockups', 'manifest.yaml'), kind: 'mockup' },
  ]
  const out: SnapshotFile[] = []
  for (const candidate of candidates) {
    const abs = path.join(change.dir, candidate.rel)
    const file: SnapshotFile = {
      label: candidate.label,
      path: abs,
      exists: await exists(abs),
      kind: candidate.kind,
      ...(candidate.description !== undefined ? { description: candidate.description } : {}),
    }
    if (candidate.kind === 'tasks' && file.exists) {
      const tasks: SnapshotTaskItem[] = []
      for (const block of change.tasks?.blocks ?? []) {
        for (const task of block.tasks) {
          tasks.push({ id: task.id, title: task.text, block: block.title, done: task.done, line: task.line, covers: task.covers.length })
        }
      }
      if (tasks.length > 0) file.tasks = tasks
    }
    if (candidate.kind === 'mockup' && screens.length > 0) file.screens = screens
    out.push(file)
  }
  return out
}

export function toFlat(d: Diagnostic): FlatDiagnostic {
  return {
    file: d.path ?? '',
    line: d.line ?? 1,
    severity: d.severity === 'error' ? 'error' : d.severity === 'warning' ? 'warning' : 'info',
    code: d.code,
    message: d.message,
    ...(d.suggestion !== undefined ? { suggestion: d.suggestion } : {}),
  }
}

const BASE_CSS = `
:root { color-scheme: light dark; }
body { font: 14px/1.6 var(--vscode-font-family, sans-serif); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 20px 26px 60px; }
h1, h2, h3, h4 { line-height: 1.25; }
h1 { font-size: 24px; border-bottom: 1px solid var(--vscode-panel-border, #8884); padding-bottom: 8px; }
h2 { font-size: 19px; margin-top: 28px; }
h3 { font-size: 16px; }
code { background: var(--vscode-textCodeBlock-background, #8882); padding: 1px 5px; border-radius: 4px; font-family: var(--vscode-editor-font-family, monospace); }
pre { background: var(--vscode-textCodeBlock-background, #8882); padding: 12px; border-radius: 8px; overflow: auto; }
pre code { background: transparent; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; }
th, td { border: 1px solid var(--vscode-panel-border, #8884); padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: var(--vscode-editorWidget-background, #8881); }
blockquote, .callout { border-left: 3px solid var(--vscode-textLink-foreground, #3794ff); background: var(--vscode-editorWidget-background, #8881); margin: 10px 0; padding: 8px 12px; border-radius: 6px; }
a { color: var(--vscode-textLink-foreground); }
hr { border: 0; border-top: 1px solid var(--vscode-panel-border, #8884); margin: 20px 0; }
small { color: var(--vscode-descriptionForeground); }
.toolbar { position: sticky; top: 0; background: var(--vscode-editor-background); padding: 8px 0 12px; display: flex; gap: 10px; align-items: center; border-bottom: 1px solid var(--vscode-panel-border, #8884); z-index: 2; }
.toolbar select { background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border, #8884); padding: 4px 8px; border-radius: 4px; }
iframe { width: 100%; height: calc(100vh - 120px); border: 1px solid var(--vscode-panel-border, #8884); border-radius: 10px; background: #fff; }
`.trim()

export interface PreviewOptions {
  mermaidUri?: string
  cspSource?: string
  nonce?: string
}

export function previewHtml(title: string, markdown: string, opts: PreviewOptions = {}): string {
  const options: Parameters<typeof renderDocument>[1] = {
    title,
    theme: 'vscode',
    highlight: true,
    mermaid: opts.mermaidUri ? 'script' : 'code',
  }
  if (opts.mermaidUri) options.mermaidScriptUri = opts.mermaidUri
  if (opts.cspSource) options.cspSource = opts.cspSource
  if (opts.nonce) options.nonce = opts.nonce
  return renderDocument(markdown, options)
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const PANEL_CSS = `
.panel { max-width: 1200px; margin: 0 auto; padding: 18px 20px 60px; }
.panel h1 { font-size: 22px; margin: 0 0 4px; }
.panel h2 { font-size: 16px; margin: 22px 0 8px; }
.cards { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0; }
.card { border: 1px solid var(--atlas-line); border-radius: 10px; padding: 10px 14px; min-width: 120px; background: var(--atlas-card); }
.card .value { font-size: 20px; font-weight: 700; }
.card .label { font-size: 12px; color: var(--atlas-muted); }
.pill { font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--atlas-line); margin-right: 4px; display: inline-block; }
.pill.pass { color: var(--atlas-ok); border-color: var(--atlas-ok); }
.pill.fail { color: var(--atlas-danger); border-color: var(--atlas-danger); }
.pill.pending, .pill.warn { color: var(--atlas-warn); border-color: var(--atlas-warn); }
.pill.task { color: var(--atlas-accent); border-color: var(--atlas-accent); font-family: var(--atlas-font-mono); }
.gap { background: color-mix(in srgb, var(--atlas-danger) 12%, transparent); }
.muted { color: var(--atlas-muted); }
a { color: var(--atlas-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.board { display: flex; gap: 12px; overflow-x: auto; align-items: flex-start; padding-bottom: 10px; }
.column { min-width: 230px; max-width: 260px; background: color-mix(in srgb, var(--atlas-line) 25%, transparent); border-radius: 12px; padding: 10px; }
.column h3 { margin: 2px 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--atlas-muted); }
.ticket { background: var(--atlas-card); border: 1px solid var(--atlas-line); border-radius: 10px; padding: 8px 10px; margin-bottom: 8px; }
.ticket .title { font-weight: 600; }
.ticket .meta { font-size: 12px; color: var(--atlas-muted); margin-top: 2px; }
.bar { height: 6px; border-radius: 4px; background: color-mix(in srgb, var(--atlas-line) 60%, transparent); margin-top: 6px; overflow: hidden; }
.bar > span { display: block; height: 100%; background: var(--atlas-accent); }
`

function commandLink(command: string, args: unknown[], label: string): string {
  return `<a href="command:${command}?${encodeURIComponent(JSON.stringify(args))}">${escapeHtml(label)}</a>`
}

export interface MatrixScenario {
  id: string
  title: string
  tasks: string[]
  evidence: 'pass' | 'fail' | 'pending'
  method?: string
  file: string
  line: number
}

export interface MatrixRequirement {
  id: string
  title: string
  living: boolean
  file: string
  line: number
  passed: number
  total: number
  scenarios: MatrixScenario[]
  domain?: string
  changes?: string[]
  fixes?: string[]
}

export interface MatrixModel {
  requirements: MatrixRequirement[]
  uncoveredScenarios: string[]
  pendingEvidence: string[]
  requirementsWithoutTasks: string[]
}

export async function buildMatrix(root: string): Promise<MatrixModel> {
  const { buildIndex } = await import('@specatlas/lsp')
  const index = await buildIndex(root)
  const requirements: MatrixRequirement[] = []
  const uncoveredScenarios: string[] = []
  const pendingEvidence: string[] = []
  const requirementsWithoutTasks: string[] = []

  const tasks = [...index.tasks.values()]
  for (const requirement of [...index.requirements.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const scenarios: MatrixScenario[] = requirement.scenarios.map((scenarioId) => {
      const scenario = index.scenarios.get(scenarioId)
      const covering = tasks.filter((task) => task.covers.includes(scenarioId)).map((task) => task.id)
      const entries = index.evidence.get(scenarioId) ?? []
      const passedEntry = entries.find((entry) => entry.result === 'pass')
      const result: MatrixScenario['evidence'] = passedEntry ? 'pass' : entries.length > 0 ? 'fail' : 'pending'
      const method = (passedEntry ?? entries[0])?.method
      if (covering.length === 0) uncoveredScenarios.push(scenarioId)
      if (result !== 'pass') pendingEvidence.push(scenarioId)
      return {
        id: scenarioId,
        title: scenario?.title ?? '',
        tasks: covering,
        evidence: result,
        ...(method !== undefined ? { method } : {}),
        file: scenario?.file ?? requirement.file,
        line: scenario?.line ?? requirement.line,
      }
    })
    const hasAnyTask = scenarios.some((scenario) => scenario.tasks.length > 0)
    if (!hasAnyTask) requirementsWithoutTasks.push(requirement.id)
    const passed = scenarios.filter((scenario) => scenario.evidence === 'pass').length
    requirements.push({
      id: requirement.id,
      title: requirement.title,
      living: requirement.living,
      file: requirement.file,
      line: requirement.line,
      passed,
      total: scenarios.length,
      scenarios,
      ...(requirement.domain !== undefined ? { domain: requirement.domain } : {}),
      ...(requirement.changes !== undefined && requirement.changes.length > 0 ? { changes: requirement.changes } : {}),
      ...(requirement.fixes !== undefined && requirement.fixes.length > 0 ? { fixes: requirement.fixes } : {}),
    })
  }

  // Lo accionable primero: requisitos con huecos (sin tarea o sin evidencia pass), luego por id.
  const hasGap = (requirement: MatrixRequirement): boolean => requirement.scenarios.some((scenario) => scenario.tasks.length === 0 || scenario.evidence !== 'pass')
  requirements.sort((a, b) => {
    const gapDifference = Number(hasGap(b)) - Number(hasGap(a))
    if (gapDifference !== 0) return gapDifference
    return a.id.localeCompare(b.id)
  })

  return { requirements, uncoveredScenarios, pendingEvidence, requirementsWithoutTasks }
}

export interface ToolItem {
  id: string
  label: string
  description: string
  icon: string
  command: string
}

export interface ToolGroup {
  id: string
  label: string
  icon: string
  items: ToolItem[]
}

export function toolGroups(initialized: boolean): ToolGroup[] {
  if (!initialized) {
    return [
      {
        id: 'setup',
        label: 'Acciones',
        icon: 'tools',
        items: [
          { id: 'init', label: 'Inicializar SpecAtlas', description: 'crea .sdd/ y los comandos del agente', icon: 'rocket', command: 'specatlas.init' },
          { id: 'adapters', label: 'Compilar adaptadores', description: 'comandos y skills del agente', icon: 'plug', command: 'specatlas.adapters' },
        ],
      },
    ]
  }
  return [
    {
      id: 'panels',
      label: 'Paneles',
      icon: 'window',
      items: [
        { id: 'matrix', label: 'Matriz de trazabilidad', description: 'requisito → escenario → tarea → evidencia', icon: 'list-tree', command: 'specatlas.matrix' },
        { id: 'board', label: 'Tablero de cambios', description: 'flujo por fase', icon: 'project', command: 'specatlas.board' },
        { id: 'metrics', label: 'Métricas locales', description: 'sin telemetría', icon: 'graph', command: 'specatlas.metrics' },
      ],
    },
    {
      id: 'actions',
      label: 'Acciones',
      icon: 'tools',
      items: [
        { id: 'new', label: 'Nuevo cambio', description: 'fix · standard · full', icon: 'add', command: 'specatlas.new' },
        { id: 'validate', label: 'Validar specs y deltas', description: 'estructura y lenguaje de negocio', icon: 'check', command: 'specatlas.validate' },
        { id: 'ci', label: 'CI (gate local)', description: 'specs · cambios · doctor · adaptadores', icon: 'check-all', command: 'specatlas.ci' },
        { id: 'doctor', label: 'Diagnóstico del workspace', description: 'salud de .sdd/ y gates', icon: 'pulse', command: 'specatlas.doctor' },
        { id: 'adapters', label: 'Compilar adaptadores', description: 'comandos y skills del agente', icon: 'plug', command: 'specatlas.adapters' },
      ],
    },
  ]
}
