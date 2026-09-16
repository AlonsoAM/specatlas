import path from 'node:path'
import {
  checkTrace,
  lintDelta,
  loadWorkspace,
  parseDelta,
  parseRequirementBlocks,
  parseTasksFile,
  planWaves,
  readTextIfExists,
  walkFiles,
  type Change,
  type Diagnostic,
  type Requirement,
} from '@specatlas/core'

export interface ReqInfo {
  id: string
  title: string
  file: string
  line: number
  scenarios: string[]
  living: boolean
  domain?: string
  changes?: string[]
}

export interface ScenarioInfo {
  id: string
  title: string
  reqId: string
  file: string
  line: number
}

export interface TaskInfo {
  id: string
  text: string
  file: string
  line: number
  block: string
  covers: string[]
  dependsOn: string[]
  done: boolean
  archived?: boolean
  wave?: number
}

export interface EvidenceInfo {
  scenario: string
  result: string
  method: string
  file: string
  line: number
}

export interface AtlasIndex {
  root: string
  requirements: Map<string, ReqInfo>
  scenarios: Map<string, ScenarioInfo>
  tasks: Map<string, TaskInfo>
  evidence: Map<string, EvidenceInfo[]>
  diagnostics: Diagnostic[]
  files: Map<string, string>
}

export interface Occurrence {
  file: string
  line: number
  character: number
  length: number
}

export const ID_TOKEN_RE = /\b(REQ-[A-Z0-9-]+|BR-[A-Z0-9-]+|T[A-Za-z0-9]+\.\d+)\b/

export function tokenAtPosition(lineText: string, character: number): { token: string; start: number; end: number } | undefined {
  const re = new RegExp(ID_TOKEN_RE.source, 'g')
  for (const match of lineText.matchAll(re)) {
    const start = match.index ?? 0
    const end = start + match[0].length
    if (character >= start && character <= end) return { token: match[0], start, end }
  }
  return undefined
}

export async function buildIndex(root: string): Promise<AtlasIndex> {
  const { workspace, config } = await loadWorkspace(root)
  const requirements = new Map<string, ReqInfo>()
  const scenarios = new Map<string, ScenarioInfo>()
  const tasks = new Map<string, TaskInfo>()
  const evidence = new Map<string, EvidenceInfo[]>()
  const diagnostics: Diagnostic[] = []
  const files = new Map<string, string>()

  const sddDir = path.join(root, '.sdd')
  const sddFiles = await walkFiles(sddDir, { skipDirs: ['node_modules'] })
  for (const file of sddFiles) {
    if (!/\.(md|ya?ml)$/i.test(file.path)) continue
    const text = await readTextIfExists(file.path)
    if (text !== undefined) files.set(file.path, text)
  }

  for (const spec of workspace.specs) {
    for (const requirement of spec.spec.requirements) {
      registerRequirement(requirements, scenarios, requirement, spec.path, true, { domain: spec.domain })
    }
  }

  for (const change of workspace.archived ?? []) {
    if (change.tasks) {
      for (const block of change.tasks.blocks) {
        for (const task of block.tasks) {
          if (tasks.has(task.id)) continue
          tasks.set(task.id, {
            id: task.id,
            text: task.text,
            file: change.tasks.path,
            line: task.line,
            block: block.id,
            covers: task.covers,
            dependsOn: task.dependsOn,
            done: task.done,
            archived: true,
          })
        }
      }
    }
    for (const entry of change.verify?.evidence ?? []) {
      const list = evidence.get(entry.scenario) ?? []
      list.push({ scenario: entry.scenario, result: entry.result, method: entry.method, file: change.verify?.path ?? '', line: entry.line })
      evidence.set(entry.scenario, list)
    }
    for (const entry of change.fix?.evidence ?? []) {
      const list = evidence.get(entry.scenario) ?? []
      list.push({ scenario: entry.scenario, result: entry.result, method: entry.method, file: change.fix?.path ?? '', line: entry.line })
      evidence.set(entry.scenario, list)
    }
  }

  for (const change of workspace.changes) {
    if (change.delta) {
      for (const requirement of [...change.delta.added, ...change.delta.modified]) {
        registerRequirement(requirements, scenarios, requirement, change.delta.path, false, {
          change: change.slug,
          ...(change.meta?.domain !== undefined ? { domain: change.meta.domain } : {}),
        })
      }
    }
    if (change.tasks) {
      const plan = change.tasks.counts.total > 0 ? planWaves(change.tasks, { maxParallel: config.waves.max_parallel }) : undefined
      const waveByTask = new Map<string, number>()
      for (const block of plan?.blocks ?? []) {
        block.waves.forEach((wave, index) => {
          for (const task of wave) waveByTask.set(task.id, index + 1)
        })
      }
      for (const block of change.tasks.blocks) {
        for (const task of block.tasks) {
          const info: TaskInfo = {
            id: task.id,
            text: task.text,
            file: change.tasks.path,
            line: task.line,
            block: block.id,
            covers: task.covers,
            dependsOn: task.dependsOn,
            done: task.done,
          }
          const wave = waveByTask.get(task.id)
          if (wave !== undefined) info.wave = wave
          tasks.set(task.id, info)
        }
      }
    }
    for (const entry of change.verify?.evidence ?? []) {
      const list = evidence.get(entry.scenario) ?? []
      list.push({ scenario: entry.scenario, result: entry.result, method: entry.method, file: change.verify?.path ?? '', line: entry.line })
      evidence.set(entry.scenario, list)
    }
    for (const entry of change.fix?.evidence ?? []) {
      const list = evidence.get(entry.scenario) ?? []
      list.push({ scenario: entry.scenario, result: entry.result, method: entry.method, file: change.fix?.path ?? '', line: entry.line })
      evidence.set(entry.scenario, list)
    }
    const living = new Map<string, Requirement>()
    for (const spec of workspace.specs) for (const requirement of spec.spec.requirements) living.set(requirement.id, requirement)
    if (change.delta) diagnostics.push(...lintDelta(change.delta, living, path.join(change.dir, 'spec.md'), { language: config.spec.language }))
    const trace = checkTrace({
      specs: workspace.specs,
      change,
      requireEvidence: config.gates.verify.mode !== 'off' && config.gates.verify.require_evidence,
    })
    diagnostics.push(...trace.findings)
  }
  diagnostics.push(...workspace.diagnostics)

  return { root, requirements, scenarios, tasks, evidence, diagnostics, files }
}

function registerRequirement(
  requirements: Map<string, ReqInfo>,
  scenarios: Map<string, ScenarioInfo>,
  requirement: Requirement,
  file: string,
  living: boolean,
  opts: { domain?: string; change?: string } = {},
): void {
  const existing = requirements.get(requirement.id)
  if (!existing) {
    requirements.set(requirement.id, {
      id: requirement.id,
      title: requirement.title,
      file,
      line: requirement.line,
      scenarios: requirement.scenarios.map((s) => s.id),
      living,
      ...(opts.domain !== undefined ? { domain: opts.domain } : {}),
      ...(opts.change !== undefined ? { changes: [opts.change] } : {}),
    })
  } else {
    if (!existing.living && living) {
      existing.living = true
      existing.file = file
      existing.line = requirement.line
      existing.title = requirement.title
    }
    if (opts.domain !== undefined) existing.domain = opts.domain
    if (opts.change !== undefined) {
      const list = existing.changes ?? []
      if (!list.includes(opts.change)) list.push(opts.change)
      existing.changes = list
    }
  }
  for (const scenario of requirement.scenarios) {
    scenarios.set(scenario.id, { id: scenario.id, title: scenario.title, reqId: requirement.id, file, line: scenario.line })
  }
}

export function findOccurrences(index: AtlasIndex, id: string): Occurrence[] {
  const out: Occurrence[] = []
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`, 'g')
  for (const [file, text] of index.files) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n')
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? ''
      for (const match of line.matchAll(re)) {
        out.push({ file, line: i, character: match.index ?? 0, length: id.length })
      }
    }
  }
  return out
}

export interface HoverDetails {
  token: string
  markdown: string
}

export function hoverFor(index: AtlasIndex, token: string): HoverDetails | undefined {
  const requirement = index.requirements.get(token)
  if (requirement) {
    const lines: string[] = [`**${requirement.id}** — ${requirement.title}`, '']
    lines.push(`Spec: \`${path.relative(index.root, requirement.file)}\`${requirement.living ? ' (viva)' : ' (delta)'}`)
    const covering = [...index.tasks.values()].filter((t) => t.covers.some((c) => c === requirement.id || requirement.scenarios.includes(c)))
    lines.push(`Tareas: ${covering.length > 0 ? covering.map((t) => t.id).join(', ') : 'ninguna'}`)
    lines.push('')
    for (const scenarioId of requirement.scenarios) {
      const ev = index.evidence.get(scenarioId) ?? []
      const status = ev.length === 0 ? 'pendiente' : ev.map((e) => e.result).join('/')
      lines.push(`- \`${scenarioId}\` — evidencia: **${status}**`)
    }
    return { token, markdown: lines.join('\n') }
  }
  const scenario = index.scenarios.get(token)
  if (scenario) {
    const ev = index.evidence.get(token) ?? []
    const covering = [...index.tasks.values()].filter((t) => t.covers.includes(token) || t.covers.includes(scenario.reqId))
    const lines = [`**${scenario.id}** — ${scenario.title}`, '', `Requisito: \`${scenario.reqId}\``]
    lines.push(`Tareas: ${covering.length > 0 ? covering.map((t) => t.id).join(', ') : 'ninguna'}`)
    lines.push(`Evidencia: ${ev.length === 0 ? '**pendiente**' : ev.map((e) => `${e.result} (${e.method})`).join(', ')}`)
    return { token, markdown: lines.join('\n') }
  }
  const task = index.tasks.get(token)
  if (task) {
    const lines = [`**${task.id}** — ${task.text}`, '', `Bloque: ${task.block}${task.wave ? ` · ola ${task.wave}` : ''}`, `Estado: ${task.done ? 'hecha' : 'pendiente'}`]
    if (task.covers.length > 0) lines.push(`Cubre: ${task.covers.map((c) => `\`${c}\``).join(', ')}`)
    if (task.dependsOn.length > 0) lines.push(`Depende de: ${task.dependsOn.join(', ')}`)
    return { token, markdown: lines.join('\n') }
  }
  return undefined
}

export interface SimpleSymbol {
  name: string
  detail?: string
  kind: 'requirement' | 'scenario' | 'task' | 'block' | 'evidence'
  line: number
  children: SimpleSymbol[]
}

export function documentSymbols(text: string, filePath: string): SimpleSymbol[] {
  if (/tasks\.md$/i.test(filePath)) {
    const parsed = parseTasksFile(text, filePath)
    return parsed.blocks.map((block) => ({
      name: `Bloque ${block.id} — ${block.title}`,
      kind: 'block' as const,
      line: block.line,
      children: block.tasks.map((task) => ({ name: `${task.id} ${task.text}`, detail: task.done ? 'hecha' : 'pendiente', kind: 'task' as const, line: task.line, children: [] })),
    }))
  }
  if (/verify\.md$|fix\.md$/i.test(filePath)) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n')
    const out: SimpleSymbol[] = []
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^###\s+(REQ-[A-Z0-9-]+-S\d+)\s*(?:—|-|–)?\s*(.*)$/.exec(lines[i] ?? '')
      if (m) out.push({ name: m[1] ?? '', detail: m[2] ?? '', kind: 'evidence', line: i + 1, children: [] })
    }
    return out
  }
  if (/spec\.md$/i.test(filePath) && !filePath.includes(`${path.sep}changes${path.sep}`)) {
    return parseRequirementBlocks(text).requirements.map((requirement) => ({
      name: `${requirement.id} — ${requirement.title}`,
      kind: 'requirement' as const,
      line: requirement.line,
      children: requirement.scenarios.map((scenario) => ({ name: `${scenario.id} — ${scenario.title}`, kind: 'scenario' as const, line: scenario.line, children: [] })),
    }))
  }
  if (/spec\.md$/i.test(filePath)) {
    const delta = parseDelta(text, filePath)
    const requirements = [...delta.added, ...delta.modified]
    return requirements.map((requirement) => ({
      name: `${requirement.id} — ${requirement.title}`,
      kind: 'requirement' as const,
      line: requirement.line,
      children: requirement.scenarios.map((scenario) => ({ name: `${scenario.id} — ${scenario.title}`, kind: 'scenario' as const, line: scenario.line, children: [] })),
    }))
  }
  return []
}

export interface SimpleLens {
  line: number
  title: string
  reference?: string
}

export function codeLenses(index: AtlasIndex, filePath: string, text: string): SimpleLens[] {
  const lenses: SimpleLens[] = []
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const isTasks = /tasks\.md$/i.test(filePath)
  const isVerify = /verify\.md$|fix\.md$/i.test(filePath)
  const isSpec = /spec\.md$/i.test(filePath)

  if (isTasks) {
    for (const task of index.tasks.values()) {
      if (task.file !== filePath) continue
      const parts: string[] = []
      if (task.wave) parts.push(`ola ${task.wave}`)
      parts.push(task.done ? 'hecha' : 'pendiente')
      lenses.push({ line: task.line - 1, title: parts.join(' · ') })
    }
    return lenses
  }

  if (isVerify) {
    for (const [scenarioId, entries] of index.evidence) {
      for (const entry of entries) {
        if (entry.file !== filePath) continue
        lenses.push({ line: entry.line - 1, title: `evidencia: ${entry.result} (${entry.method})`, reference: scenarioId })
      }
    }
    return lenses
  }

  if (isSpec) {
    const headerRe = /^###\s+(?:Requisito|Requirement):\s+(REQ-[A-Z0-9-]+)\s*(?:—|-|–)/
    for (let i = 0; i < lines.length; i += 1) {
      const m = headerRe.exec(lines[i] ?? '')
      if (!m) continue
      const reqId = (m[1] ?? '').toUpperCase()
      const info = index.requirements.get(reqId)
      const scenarioIds = info?.scenarios ?? []
      const covering = [...index.tasks.values()].filter((t) => t.covers.some((c) => c === reqId || scenarioIds.includes(c)))
      const passed = scenarioIds.filter((sid) => (index.evidence.get(sid) ?? []).some((e) => e.result === 'pass')).length
      lenses.push({
        line: i,
        title: `${covering.length} tarea(s) · evidencia ${passed}/${scenarioIds.length}`,
        reference: reqId,
      })
    }
    const scenarioRe = /^####\s+(?:Escenario|Scenario):\s+(REQ-[A-Z0-9-]+-S\d+)/
    for (let i = 0; i < lines.length; i += 1) {
      const m = scenarioRe.exec(lines[i] ?? '')
      if (!m) continue
      const scenarioId = (m[1] ?? '').toUpperCase()
      const entries = index.evidence.get(scenarioId) ?? []
      const status = entries.length === 0 ? 'pendiente' : entries.map((e) => e.result).join('/')
      lenses.push({ line: i, title: `evidencia: ${status}`, reference: scenarioId })
    }
  }
  return lenses
}

export interface SimpleTextEdit {
  line: number
  startCharacter: number
  endLine: number
  endCharacter: number
  newText: string
}

export interface SimpleAction {
  title: string
  kind: 'quickfix'
  diagnosticLine?: number
  edit?: SimpleTextEdit
}

export function quickFixes(index: AtlasIndex, filePath: string, line: number, text: string, diagnostics: Diagnostic[]): SimpleAction[] {
  const actions: SimpleAction[] = []
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const current = lines[line] ?? ''

  if (/tasks\.md$/i.test(filePath) && /^\s*-\s*\[[ xX]\]\s+T[A-Za-z0-9]+\.\d+\s+/.test(current) && !/[·]\s*(?:Cubre|Covers)\s*:/i.test(current)) {
    const uncovered = [...index.scenarios.keys()].filter((scenarioId) => ![...index.tasks.values()].some((t) => t.covers.includes(scenarioId) || t.covers.includes(index.scenarios.get(scenarioId)?.reqId ?? '')))
    if (uncovered.length > 0) {
      actions.push({
        title: `Añadir · Cubre: ${uncovered[0]}`,
        kind: 'quickfix',
        edit: { line, startCharacter: current.length, endLine: line, endCharacter: current.length, newText: ` · Cubre: ${uncovered[0]}` },
      })
    }
  }

  if (/spec\.md$/i.test(filePath) && filePath.includes(`${path.sep}changes${path.sep}`) && /^###\s+(?:Requisito|Requirement):\s+(REQ-[A-Z0-9-]+)/.test(current)) {
    const m = /^###\s+(?:Requisito|Requirement):\s+(REQ-[A-Z0-9-]+)/.exec(current)
    const reqId = (m?.[1] ?? '').toUpperCase()
    const living = index.requirements.get(reqId)
    if (living?.living) {
      const block = lines.slice(line)
      const endOffset = block.findIndex((l, i) => i > 0 && /^###\s+/.test(l))
      const end = endOffset === -1 ? lines.length : line + endOffset
      const hasScenarios = block.some((l) => /^####\s+(?:Escenario|Scenario):/.test(l))
      if (!hasScenarios) {
        const livingText = index.files.get(living.file)
        if (livingText) {
          const livingBlock = extractBlock(livingText, reqId)
          if (livingBlock) {
            actions.push({
              title: 'Copiar el bloque completo desde la spec viva',
              kind: 'quickfix',
              edit: { line, startCharacter: 0, endLine: end, endCharacter: 0, newText: livingBlock },
            })
          }
        }
      }
    }
  }

  for (const diagnostic of diagnostics) {
    if (diagnostic.code === 'TRACE-005' && diagnostic.line && line === diagnostic.line - 1) {
      actions.push({ title: 'Registrar evidencia con el CLI: satlas verify <slug> --scenario <id>', kind: 'quickfix', diagnosticLine: diagnostic.line })
    }
  }

  return actions
}

export function extractBlock(text: string, reqId: string): string | undefined {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^###\s+(?:Requisito|Requirement):\s+(REQ-[A-Z0-9-]+)/.exec(lines[i] ?? '')
    if (m && (m[1] ?? '').toUpperCase() === reqId) {
      start = i
      break
    }
  }
  if (start < 0) return undefined
  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^###\s+/.test(lines[i] ?? '')) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join('\n').trimEnd() + '\n'
}

export function locationOf(index: AtlasIndex, token: string): { file: string; line: number } | undefined {
  const requirement = index.requirements.get(token)
  if (requirement) return { file: requirement.file, line: requirement.line - 1 }
  const scenario = index.scenarios.get(token)
  if (scenario) return { file: scenario.file, line: scenario.line - 1 }
  const task = index.tasks.get(token)
  if (task) return { file: task.file, line: task.line - 1 }
  return undefined
}
