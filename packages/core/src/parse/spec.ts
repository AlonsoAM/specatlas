import type { Diagnostic } from '../diagnostics.js'
import { diag } from '../diagnostics.js'
import { parseFrontmatter } from '../frontmatter.js'
import type { Requirement, Rule, Scenario, SpecFile } from '../model.js'
import { REQ_ID_RE, RULE_ID_RE, SCENARIO_ID_RE } from '../model.js'

export const REQ_HEAD_RE = /^###\s+(?:Requirement|Requisito):\s+(REQ-[A-Z0-9-]+)\s*(?:—|-|–)\s*(.+?)\s*$/
export const SCENARIO_HEAD_RE = /^####\s+(?:Scenario|Escenario):\s+(REQ-[A-Z0-9-]+-S\d+)\s*(?:—|-|–)\s*(.+?)\s*$/
export const RULE_RE = /^-\s*(?:Rule|Regla)\s+(BR-[A-Z0-9-]+)\s*:\s*(.+?)\s*$/
const WHEN_RE = /^-\s*\*\*\s*(?:WHEN|CUANDO|DADO QUE)\s*\*\*\s*(.+?)\s*$/i
const THEN_RE = /^-\s*\*\*\s*(?:THEN|ENTONCES|Y|AND)\s*\*\*\s*(.+?)\s*$/i
const CONTRACT_RE = /^-\s*\*\*\s*(?:CONTRATO|CONTRACT)\s*\*\*\s*:\s*(.+?)\s*$/i

interface BlockDraft {
  id: string
  title: string
  line: number
  prose: string[]
  rules: Rule[]
  scenarios: Scenario[]
}

function newDraft(id: string, title: string, line: number): BlockDraft {
  return { id, title, line, prose: [], rules: [], scenarios: [] }
}

function finalize(draft: BlockDraft): Requirement {
  return {
    id: draft.id,
    title: draft.title,
    prose: draft.prose.join('\n').trim(),
    rules: draft.rules,
    scenarios: draft.scenarios,
    line: draft.line,
  }
}

/**
 * Extrae requisitos de un cuerpo markdown (sirve para specs vivas y para
 * bloques dentro de un delta). Los encabezados aceptan español e inglés.
 */
export function parseRequirementBlocks(body: string, startLine = 1, filePath?: string): { requirements: Requirement[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []
  const lines = body.replace(/\r\n?/g, '\n').split('\n')
  const requirements: Requirement[] = []
  let current: BlockDraft | undefined
  let currentScenario: Scenario | undefined
  const seenIds = new Set<string>()
  const seenScenarios = new Set<string>()

  const pushCurrent = (): void => {
    if (current) requirements.push(finalize(current))
    current = undefined
    currentScenario = undefined
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const lineNo = startLine + i

    const reqMatch = REQ_HEAD_RE.exec(line)
    if (reqMatch) {
      pushCurrent()
      const id = (reqMatch[1] ?? '').toUpperCase()
      if (!REQ_ID_RE.test(id)) {
        diagnostics.push(diag('LINT-STR-001', 'error', `Id de requisito mal formado: ${id}`, { path: filePath, line: lineNo, suggestion: 'Formato: REQ-DOMINIO-NNN' }))
      }
      if (seenIds.has(id)) {
        diagnostics.push(diag('TRACE-008', 'error', `Requisito duplicado: ${id}`, { path: filePath, line: lineNo }))
      }
      seenIds.add(id)
      current = newDraft(id, reqMatch[2] ?? '', lineNo)
      continue
    }

    const scenMatch = SCENARIO_HEAD_RE.exec(line)
    if (scenMatch) {
      const id = (scenMatch[1] ?? '').toUpperCase()
      if (!current) {
        diagnostics.push(diag('LINT-STR-002', 'error', `Escenario ${id} fuera de un requisito`, { path: filePath, line: lineNo }))
        continue
      }
      if (!SCENARIO_ID_RE.test(id)) {
        diagnostics.push(diag('LINT-STR-001', 'error', `Id de escenario mal formado: ${id}`, { path: filePath, line: lineNo }))
      }
      if (seenScenarios.has(id)) {
        diagnostics.push(diag('TRACE-008', 'error', `Escenario duplicado: ${id}`, { path: filePath, line: lineNo }))
      }
      seenScenarios.add(id)
      currentScenario = { id, title: scenMatch[2] ?? '', reqId: current.id, when: [], then: [], line: lineNo }
      current.scenarios.push(currentScenario)
      continue
    }

    const ruleMatch = RULE_RE.exec(line)
    if (ruleMatch) {
      const id = (ruleMatch[1] ?? '').toUpperCase()
      if (!RULE_ID_RE.test(id)) {
        diagnostics.push(diag('LINT-STR-001', 'error', `Id de regla mal formado: ${id}`, { path: filePath, line: lineNo, suggestion: 'Formato: BR-DOMINIO-NNN' }))
      }
      if (!current) {
        diagnostics.push(diag('LINT-STR-002', 'error', `Regla ${id} fuera de un requisito`, { path: filePath, line: lineNo }))
        continue
      }
      current.rules.push({ id, text: ruleMatch[2] ?? '', line: lineNo })
      continue
    }

    const whenMatch = WHEN_RE.exec(line)
    if (whenMatch && currentScenario) {
      currentScenario.when.push(whenMatch[1] ?? '')
      continue
    }
    const thenMatch = THEN_RE.exec(line)
    if (thenMatch && currentScenario) {
      currentScenario.then.push(thenMatch[1] ?? '')
      continue
    }
    const contractMatch = CONTRACT_RE.exec(line)
    if (contractMatch && currentScenario) {
      const ref = (contractMatch[1] ?? '').trim()
      if (ref !== '') {
        const list = currentScenario.contracts ?? []
        if (!list.includes(ref)) list.push(ref)
        currentScenario.contracts = list
      }
      continue
    }

    if (current && !currentScenario) {
      if (line.trim() !== '') current.prose.push(line.trim())
    }
  }
  pushCurrent()

  for (const req of requirements) {
    for (const sc of req.scenarios) {
      if (sc.then.length === 0) {
        diagnostics.push(diag('LINT-BIZ-005', 'error', `El escenario ${sc.id} no tiene THEN/ENTONCES`, { path: filePath, line: sc.line, suggestion: 'Añade al menos un resultado observable' }))
      }
    }
  }

  return { requirements, diagnostics }
}

export function parseSpecFile(content: string, filePath: string): SpecFile {
  const fm = parseFrontmatter(content, filePath)
  const { requirements, diagnostics } = parseRequirementBlocks(fm.body, fm.bodyStartLine, filePath)
  const spec: SpecFile = {
    path: filePath,
    frontmatter: fm.data,
    requirements,
    diagnostics: [...fm.diagnostics, ...diagnostics],
  }
  const domain = fm.data['domain']
  if (typeof domain === 'string') spec.domain = domain
  const title = fm.data['title']
  if (typeof title === 'string') spec.title = title
  const version = fm.data['version']
  if (typeof version === 'number') spec.version = version
  return spec
}

export function renderRequirement(req: Requirement, language: 'es' | 'en' = 'es'): string {
  const es = language !== 'en'
  const out: string[] = []
  out.push(`### ${es ? 'Requisito' : 'Requirement'}: ${req.id} — ${req.title}`)
  if (req.prose) out.push(req.prose)
  if (req.rules.length > 0) out.push('')
  for (const rule of req.rules) out.push(`- ${es ? 'Regla' : 'Rule'} ${rule.id}: ${rule.text}`)
  for (const sc of req.scenarios) {
    out.push('')
    out.push(`#### ${es ? 'Escenario' : 'Scenario'}: ${sc.id} — ${sc.title}`)
    for (const w of sc.when) out.push(`- **${es ? 'CUANDO' : 'WHEN'}** ${w}`)
    for (const t of sc.then) out.push(`- **${es ? 'ENTONCES' : 'THEN'}** ${t}`)
  }
  return out.join('\n')
}
