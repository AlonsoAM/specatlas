import path from 'node:path'
import { renderDocument, renderPdf } from '@specatlas/render'
import type { Change, Evidence, Language, Requirement, Scenario } from './model.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { readTextIfExists, writeBytes, writeText } from './fsx.js'
import { loadChange, loadWorkspace } from './workspace.js'
import { readMockupManifest } from './mockups.js'
import { renderTemplate, templatesFor } from './templates.js'
import { localDate, localStamp } from './time.js'

export type DocsTipo = 'tecnica' | 'manual' | 'all'

export const DOCS_MARKER_START = '<!-- specatlas:generado:inicio -->'
export const DOCS_MARKER_END = '<!-- specatlas:generado:fin -->'

export interface GenerateDocsOptions {
  root: string
  slug: string
  tipo?: DocsTipo
  now?: Date
}

export interface GeneratedDoc {
  tipo: 'tecnica' | 'manual'
  path: string
  created: boolean
  htmlPath?: string
  pdfPath?: string
}

export interface GenerateDocsResult {
  slug: string
  files: GeneratedDoc[]
  diagnostics: Diagnostic[]
}

interface DocMockup {
  id: string
  title: string
  file: string
  illustrates: string[]
  states: string[]
}

/** Textos derivados: el generador escribe prosa, no solo listas. */
interface Wording {
  none: string
  noRequirements: string
  noScenarios: string
  noEvidence: string
  noFiles: string
  noGlossary: string
  noGlossaryTerms: string
  noMockups: string
  noRules: string
  nothingPending: string
  noPlanContext: string
  noPlanApproach: string
  noPlanDiagrams: string
  noPlanDesign: string
  noPlanRisks: string
  noPlanRollback: string
  noPrerequisites: string
  noWhy: string
  noWhat: string
  emptyStates: string
  noTroubles: string
  noSteps: string
  thFact: string
  thValue: string
  thFile: string
  thTasks: string
  thCovers: string
  thRequirement: string
  thScenario: string
  thScenarioCount: string
  thEvidence: string
  thMethod: string
  thResult: string
  thDate: string
  thChecked: string
  thYouDo: string
  thYouGet: string
  thSituation: string
  thBehaviour: string
  thStates: string
  thWithEvidence: string
  factRequirements: string
  factScenarios: string
  factTasks: string
  factEvidence: string
  factFiles: string
  factMockups: string
  factLane: string
  added: string
  modified: string
  doneOf: string
  inBlocks: string
  ofScenarios: string
  screensWord: string
  noTask: string
  pending: string
  rulesLabel: string
  scenariosLabel: string
  flowLabel: string
  emptyLabel: string
  warningLabel: string
  mockupFile: string
  whatYouFind: string
  commandsIntro: string
  commandTimes: string
  analyzeHint: string
  tasksPending: string
  scenariosWithoutTask: string
  pendingEvidence: string
  scenarioPlaceholder: string
  summaryLead: (input: { title: string; slug: string; lane: string; domain: string }) => string
  traceLead: (input: { requirements: number; scenarios: number; withTask: number; withEvidence: number; gaps: number }) => string
  evidenceLead: (input: { total: number; pass: number; methods: string; people: string; from: string; to: string }) => string
  verifiedLead: (input: { pass: number; total: number; methods: string }) => string
  troubleTail: string
  statesTail: string
}

const ES_WORDING: Wording = {
  none: '—',
  noRequirements: '_Este cambio no declara requisitos en su delta._',
  noScenarios: '_Este cambio no declara escenarios._',
  noEvidence: '_Todavía no hay evidencia registrada: la fase de verificación aún no se ha ejecutado._',
  noFiles: '_Las tareas no declaran archivos._',
  noGlossary: '_El proyecto no tiene glosario._',
  noGlossaryTerms: '_El glosario del proyecto aún no tiene términos propios._',
  noMockups: '_Este cambio no declara mockups, así que no hay contrato visual que recorrer._',
  noRules: '_La especificación no declara reglas de negocio explícitas._',
  nothingPending: '_Nada pendiente: todos los escenarios tienen evidencia favorable y todas las tareas están cerradas._',
  noPlanContext: '_Sin plan técnico: el contexto AS-IS no está escrito._',
  noPlanApproach: '_Sin plan técnico: el enfoque no está escrito._',
  noPlanDiagrams: '_El plan no incluye diagramas._',
  noPlanDesign: '_El plan no describe el diseño por capas._',
  noPlanRisks: '_El plan no declara riesgos._',
  noPlanRollback: '_El plan no declara cómo revertir el cambio._',
  noPrerequisites: '_No hay requisitos previos declarados: basta con tener el proyecto abierto._',
  noWhy: '_No hay propuesta escrita: el porqué no está registrado._',
  noWhat: '_No hay propuesta escrita: qué cambia no está registrado._',
  emptyStates: '_La especificación no describe estados vacíos._',
  noTroubles: '_La especificación no describe errores ni avisos._',
  noSteps: '_La especificación no describe pasos de uso._',
  thFact: 'Dato',
  thValue: 'Valor',
  thFile: 'Archivo',
  thTasks: 'Tareas',
  thCovers: 'Requisitos que cubre',
  thRequirement: 'Requisito',
  thScenario: 'Escenario',
  thScenarioCount: 'Escenarios',
  thEvidence: 'Evidencia',
  thMethod: 'Método',
  thResult: 'Resultado',
  thDate: 'Fecha',
  thChecked: 'Qué se comprobó',
  thYouDo: 'Qué haces',
  thYouGet: 'Qué ocurre',
  thSituation: 'Situación',
  thBehaviour: 'Qué hace la herramienta',
  thStates: 'Estados',
  thWithEvidence: 'Con evidencia favorable',
  factRequirements: 'Requisitos del cambio',
  factScenarios: 'Escenarios especificados',
  factTasks: 'Tareas',
  factEvidence: 'Evidencia',
  factFiles: 'Archivos tocados',
  factMockups: 'Mockups',
  factLane: 'Carril y dominio',
  added: 'nuevos',
  modified: 'modificados',
  doneOf: 'hechas de',
  inBlocks: 'bloque(s)',
  ofScenarios: 'escenarios',
  screensWord: 'pantalla(s)',
  noTask: '_sin tarea_',
  pending: '_pendiente_',
  rulesLabel: 'Reglas de negocio',
  scenariosLabel: 'Escenarios',
  flowLabel: 'de uso',
  emptyLabel: 'de estado vacío',
  warningLabel: 'de error o aviso',
  mockupFile: 'Archivo del mockup',
  whatYouFind: 'Qué encuentras aquí',
  commandsIntro: 'Comandos con los que se obtuvo la evidencia ejecutable:',
  commandTimes: 'escenario(s)',
  analyzeHint: 'El informe de consistencia del cambio está en `analyze.md`: explica qué se comprobó antes de dar el cambio por cerrado.',
  tasksPending: 'Tareas sin cerrar',
  scenariosWithoutTask: 'Escenarios sin tarea que los cubra',
  pendingEvidence: 'Escenarios sin evidencia favorable',
  scenarioPlaceholder: '<ID-DEL-ESCENARIO>',
  summaryLead: (input) =>
    `Este documento describe **${input.title}** (cambio \`${input.slug}\`), del dominio **${input.domain}** y carril **${input.lane}**. Recoge el porqué, el estado anterior, el enfoque técnico, los diagramas, el mapa de archivos, la trazabilidad completa y la evidencia con la que se dio por terminado.`,
  traceLead: (input) =>
    `${input.requirements} requisito(s) · ${input.scenarios} escenario(s) · ${input.withTask} con tarea · ${input.withEvidence} con evidencia favorable · **${input.gaps} hueco(s)**.`,
  evidenceLead: (input) =>
    `${input.pass} de ${input.total} escenario(s) con evidencia favorable (${input.methods}). Registrada por ${input.people}${input.from ? ` entre el ${input.from} y el ${input.to}` : ''}.`,
  verifiedLead: (input) =>
    `Se comprobaron ${input.pass} de ${input.total} escenario(s) (${input.methods}). El detalle, con comandos y resultados, está en la documentación técnica.`,
  troubleTail: 'En todos estos casos la herramienta explica el motivo y no deja el trabajo a medias: corrige lo que indica y vuelve a intentarlo.',
  statesTail: 'Un estado vacío no es un error: la herramienta indica qué falta y qué acción lo produce.',
}

const EN_WORDING: Wording = {
  none: '—',
  noRequirements: '_This change declares no requirements in its delta._',
  noScenarios: '_This change declares no scenarios._',
  noEvidence: '_No evidence recorded yet: the verification phase has not run._',
  noFiles: '_Tasks declare no files._',
  noGlossary: '_The project has no glossary._',
  noGlossaryTerms: '_The project glossary has no project terms yet._',
  noMockups: '_This change declares no mockups, so there is no visual contract to walk through._',
  noRules: '_The specification declares no explicit business rules._',
  nothingPending: '_Nothing pending: every scenario has passing evidence and every task is closed._',
  noPlanContext: '_No technical plan: the AS-IS context is not written._',
  noPlanApproach: '_No technical plan: the approach is not written._',
  noPlanDiagrams: '_The plan has no diagrams._',
  noPlanDesign: '_The plan does not describe the layered design._',
  noPlanRisks: '_The plan declares no risks._',
  noPlanRollback: '_The plan declares no rollback._',
  noPrerequisites: '_No prerequisites declared: an open project is enough._',
  noWhy: '_No proposal written: the why is not recorded._',
  noWhat: '_No proposal written: what changes is not recorded._',
  emptyStates: '_The specification describes no empty states._',
  noTroubles: '_The specification describes no errors or warnings._',
  noSteps: '_The specification describes no usage steps._',
  thFact: 'Fact',
  thValue: 'Value',
  thFile: 'File',
  thTasks: 'Tasks',
  thCovers: 'Requirements covered',
  thRequirement: 'Requirement',
  thScenario: 'Scenario',
  thScenarioCount: 'Scenarios',
  thEvidence: 'Evidence',
  thMethod: 'Method',
  thResult: 'Result',
  thDate: 'Date',
  thChecked: 'What was checked',
  thYouDo: 'What you do',
  thYouGet: 'What happens',
  thSituation: 'Situation',
  thBehaviour: 'What the tool does',
  thStates: 'States',
  thWithEvidence: 'With passing evidence',
  factRequirements: 'Requirements in the change',
  factScenarios: 'Specified scenarios',
  factTasks: 'Tasks',
  factEvidence: 'Evidence',
  factFiles: 'Files touched',
  factMockups: 'Mockups',
  factLane: 'Lane and domain',
  added: 'added',
  modified: 'modified',
  doneOf: 'done out of',
  inBlocks: 'block(s)',
  ofScenarios: 'scenarios',
  screensWord: 'screen(s)',
  noTask: '_no task_',
  pending: '_pending_',
  rulesLabel: 'Business rules',
  scenariosLabel: 'Scenarios',
  flowLabel: 'usage',
  emptyLabel: 'empty state',
  warningLabel: 'error or warning',
  mockupFile: 'Mockup file',
  whatYouFind: 'What you find here',
  commandsIntro: 'Commands that produced the executable evidence:',
  commandTimes: 'scenario(s)',
  analyzeHint: 'The consistency report for this change lives in `analyze.md`: it states what was checked before closing the change.',
  tasksPending: 'Open tasks',
  scenariosWithoutTask: 'Scenarios with no covering task',
  pendingEvidence: 'Scenarios without passing evidence',
  scenarioPlaceholder: '<SCENARIO-ID>',
  summaryLead: (input) =>
    `This document describes **${input.title}** (change \`${input.slug}\`), domain **${input.domain}**, lane **${input.lane}**. It records the why, the previous state, the technical approach, the diagrams, the file map, full traceability and the evidence used to close it.`,
  traceLead: (input) =>
    `${input.requirements} requirement(s) · ${input.scenarios} scenario(s) · ${input.withTask} with a task · ${input.withEvidence} with passing evidence · **${input.gaps} gap(s)**.`,
  evidenceLead: (input) =>
    `${input.pass} of ${input.total} scenario(s) with passing evidence (${input.methods}). Recorded by ${input.people}${input.from ? ` between ${input.from} and ${input.to}` : ''}.`,
  verifiedLead: (input) =>
    `${input.pass} of ${input.total} scenario(s) were checked (${input.methods}). The detail, with commands and results, is in the technical documentation.`,
  troubleTail: 'In every one of these cases the tool states the reason and leaves no half-done work: fix what it reports and try again.',
  statesTail: 'An empty state is not an error: the tool states what is missing and which action produces it.',
}

type ScenarioKind = 'flow' | 'empty' | 'warning'

const EMPTY_ES = /(^|[^a-záéíóúñ])(sin |no hay|no existe|no existen|aún no|todavía no|no declara|no tiene|ninguno|ninguna|vací)/i
const WARN_ES = /(fall[ae]|fallid|error|ilegible|no se puede|no puede|no aplica|rechaz|impide|bloquea|bloquead|sin permiso|no válid|no valida|desactualizad|obsolet|falta|inválid)/i
const EMPTY_EN = /(^|[^a-z])(no |without |not yet|empty|none)/i
const WARN_EN = /(fail|error|unreadable|cannot|can't|not allowed|invalid|reject|block|stale|outdated|missing)/i

function scenarioKind(scenario: Scenario, es: boolean): ScenarioKind {
  const text = `${scenario.title} ${scenario.when.join(' ')} ${scenario.then.join(' ')}`
  if (es) {
    if (EMPTY_ES.test(scenario.title) || EMPTY_ES.test(scenario.when.join(' '))) return 'empty'
    if (WARN_ES.test(text)) return 'warning'
    return 'flow'
  }
  if (EMPTY_EN.test(scenario.title) || EMPTY_EN.test(scenario.when.join(' '))) return 'empty'
  if (WARN_EN.test(text)) return 'warning'
  return 'flow'
}

function cap(text: string): string {
  const clean = text.trim()
  if (clean.length === 0) return clean
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function cell(text: string): string {
  return text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim()
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(' | ')} |`
  const sep = `|${headers.map(() => '---').join('|')}|`
  const body = rows.map((row) => `| ${row.map((value) => cell(value)).join(' | ')} |`).join('\n')
  return `${head}\n${sep}\n${body}`
}

function sectionsOf(markdown: string | undefined): Map<string, string> {
  const map = new Map<string, string>()
  if (!markdown) return map
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  let title: string | undefined
  let body: string[] = []
  const flush = (): void => {
    if (title !== undefined) map.set(title, body.join('\n').trim())
  }
  for (const line of lines) {
    const match = /^##\s+(.*)$/.exec(line)
    if (match) {
      flush()
      title = (match[1] ?? '').trim()
      body = []
      continue
    }
    if (title !== undefined) body.push(line)
  }
  flush()
  return map
}

function numberedSection(map: Map<string, string>, prefix: string): string {
  for (const [title, body] of map) {
    if (title.startsWith(prefix)) return body
  }
  return ''
}

function namedSection(map: Map<string, string>, names: RegExp): string {
  for (const [title, body] of map) {
    if (names.test(title)) return body
  }
  return ''
}

/** Quita la numeración propia del plan en los subtítulos: dentro del documento la sección ya tiene otro número. */
function unnumbered(text: string): string {
  return text.replace(/^(#{3,6})\s*\d+(?:\.\d+)*\.?\s+/gm, '$1 ')
}

function orFallback(text: string, fallback: string): string {
  const clean = text.trim()
  return clean.length > 0 ? clean : fallback
}

interface FlatTask {
  id: string
  text: string
  files: string[]
  covers: string[]
  done: boolean
}

function allTasks(change: Change): FlatTask[] {
  const blocks = change.tasks?.blocks ?? []
  return blocks.flatMap((block) => block.tasks).map((task) => ({ id: task.id, text: task.text, files: task.files, covers: task.covers, done: task.done }))
}

function glossaryText(glossaryRaw: string | undefined, w: Wording): string {
  if (!glossaryRaw) return w.noGlossary
  const templateTerms = new Set(['Cliente', 'Solicitud'])
  const rows = glossaryRaw
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((value) => value.trim()),
    )
    .filter((cells) => cells.length >= 2 && !/^-+$/.test(cells[0] ?? '') && !/^t[eé]rmino$/i.test(cells[0] ?? '') && !/^term$/i.test(cells[0] ?? ''))
    .filter((cells) => !templateTerms.has(cells[0] ?? ''))
  if (rows.length === 0) return w.noGlossaryTerms
  return rows.map((cells) => `- **${cells[0]}**${cells[2] && cells[2].length > 0 ? ` _(${cells[2]})_` : ''}: ${cells[1]}`).join('\n')
}

function methodBreakdown(evidence: Evidence[], es: boolean): string {
  const counts = new Map<string, number>()
  for (const entry of evidence) counts.set(entry.method, (counts.get(entry.method) ?? 0) + 1)
  const labels: Record<string, string> = es
    ? { executable: 'ejecutable', automatic: 'automático', semi: 'semiautomático', manual: 'manual' }
    : { executable: 'executable', automatic: 'automatic', semi: 'semi-automatic', manual: 'manual' }
  if (counts.size === 0) return es ? 'sin método registrado' : 'no method recorded'
  return [...counts.entries()].map(([method, count]) => `${count} ${labels[method] ?? method}`).join(', ')
}

function docData(
  change: Change,
  language: Language,
  now: Date,
  proposalRaw: string | undefined,
  planRaw: string | undefined,
  glossaryRaw: string | undefined,
  mockups: DocMockup[],
  hasAnalyze: boolean,
): Record<string, string> {
  const es = language !== 'en'
  const w = es ? ES_WORDING : EN_WORDING
  const added = change.delta?.added ?? []
  const modified = change.delta?.modified ?? []
  const requirements: Requirement[] = [...added, ...modified]
  const scenarios = requirements.flatMap((requirement) => requirement.scenarios)
  const tasks = allTasks(change)
  const evidence = change.verify?.evidence ?? []
  const byScenario = new Map<string, Evidence>()
  for (const entry of evidence) byScenario.set(entry.scenario, entry)
  const passed = new Set(evidence.filter((entry) => entry.result === 'pass').map((entry) => entry.scenario))
  const tasksFor = (scenarioId: string): string[] => tasks.filter((task) => task.covers.includes(scenarioId)).map((task) => task.id)

  /* ---------- Resumen ---------- */
  const files = new Set<string>()
  for (const task of tasks) {
    for (const file of task.files) {
      const clean = file.trim()
      if (clean.length > 0 && clean.toLowerCase() !== 'infra') files.add(clean)
    }
  }
  const blocks = change.tasks?.blocks.length ?? 0
  const counts = change.tasks?.counts ?? { done: 0, total: 0 }
  const summaryRows: string[][] = [
    [w.factRequirements, `${requirements.length} (${added.length} ${w.added}, ${modified.length} ${w.modified})`],
    [w.factScenarios, `${scenarios.length}`],
    [w.factTasks, `${counts.done} ${w.doneOf} ${counts.total} · ${blocks} ${w.inBlocks}`],
    [w.factEvidence, `${passed.size} / ${scenarios.length} ${w.ofScenarios}`],
    [w.factFiles, `${files.size}`],
    [w.factMockups, `${mockups.length} ${w.screensWord}`],
    [w.factLane, `${change.meta?.lane ?? 'standard'} · ${change.meta?.domain ?? w.none}`],
  ]
  const summary = `${w.summaryLead({
    title: change.meta?.title ?? change.slug,
    slug: change.slug,
    lane: change.meta?.lane ?? 'standard',
    domain: change.meta?.domain ?? w.none,
  })}\n\n${table([w.thFact, w.thValue], summaryRows)}`

  /* ---------- Requisitos en lenguaje de negocio ---------- */
  const reqBusiness =
    requirements.length === 0
      ? w.noRequirements
      : requirements
          .map((requirement) => {
            const kinds = requirement.scenarios.map((scenario) => scenarioKind(scenario, es))
            const lines = [`### ${requirement.id} — ${requirement.title}`, '']
            const prose = requirement.prose.trim()
            if (prose.length > 0) lines.push(prose, '')
            if (requirement.rules.length > 0) {
              lines.push(`**${w.rulesLabel}**`, '')
              for (const rule of requirement.rules) lines.push(`- \`${rule.id}\` — ${rule.text}`)
              lines.push('')
            }
            lines.push(
              `**${w.scenariosLabel}**: ${requirement.scenarios.length} · ${kinds.filter((kind) => kind === 'flow').length} ${w.flowLabel} · ${kinds.filter((kind) => kind === 'empty').length} ${w.emptyLabel} · ${kinds.filter((kind) => kind === 'warning').length} ${w.warningLabel}.`,
            )
            return lines.join('\n').trimEnd()
          })
          .join('\n\n')

  /* ---------- Mapa de archivos ---------- */
  const fileRows: string[][] = [...files].sort().map((file) => {
    const owners = tasks.filter((task) => task.files.includes(file))
    const reqs = [...new Set(owners.flatMap((task) => task.covers).map((scenarioId) => scenarioId.replace(/-S\d+$/, '')))].sort()
    return [`\`${file}\``, owners.map((task) => task.id).join(', ') || w.none, reqs.join(', ') || w.none]
  })
  const filesTable = fileRows.length === 0 ? w.noFiles : table([w.thFile, w.thTasks, w.thCovers], fileRows)

  /* ---------- Trazabilidad ---------- */
  const traceRows: string[][] = scenarios.map((scenario) => {
    const ids = tasksFor(scenario.id)
    const result = byScenario.get(scenario.id)?.result
    return [scenario.reqId, `\`${scenario.id}\` ${scenario.title}`, ids.length > 0 ? ids.join(', ') : w.noTask, result ?? w.pending]
  })
  const withTask = scenarios.filter((scenario) => tasksFor(scenario.id).length > 0).length
  const gaps = scenarios.filter((scenario) => tasksFor(scenario.id).length === 0 || !passed.has(scenario.id)).length
  const traceSummary = w.traceLead({ requirements: requirements.length, scenarios: scenarios.length, withTask, withEvidence: passed.size, gaps })
  const traceTable = traceRows.length === 0 ? w.noScenarios : table([w.thRequirement, w.thScenario, w.thTasks, w.thEvidence], traceRows)

  /* ---------- Evidencia ---------- */
  const dates = evidence
    .map((entry) => entry.date)
    .filter((date) => date.length > 0)
    .sort()
  const people = [...new Set(evidence.map((entry) => entry.by).filter((name) => name.length > 0))]
  const evidenceSummary =
    evidence.length === 0
      ? w.noEvidence
      : w.evidenceLead({
          total: scenarios.length,
          pass: passed.size,
          methods: methodBreakdown(evidence, es),
          people: people.join(', ') || w.none,
          from: (dates[0] ?? '').slice(0, 10),
          to: (dates[dates.length - 1] ?? '').slice(0, 10),
        })
  const evidenceRows: string[][] = evidence.map((entry) => {
    const scenario = scenarios.find((item) => item.id === entry.scenario)
    return [`\`${entry.scenario}\``, entry.notes?.trim() || scenario?.title || w.none, entry.method, entry.result, entry.date.slice(0, 16)]
  })
  const evidenceTable = evidenceRows.length === 0 ? w.noEvidence : table([w.thScenario, w.thChecked, w.thMethod, w.thResult, w.thDate], evidenceRows)
  const commandCounts = new Map<string, number>()
  for (const entry of evidence) {
    const raw = entry.command?.trim()
    if (!raw) continue
    // Los comandos que solo difieren en el identificador del escenario se agrupan en uno.
    const command = entry.scenario.length > 0 ? raw.split(entry.scenario).join(w.scenarioPlaceholder) : raw
    commandCounts.set(command, (commandCounts.get(command) ?? 0) + 1)
  }
  const commands =
    commandCounts.size === 0
      ? w.noEvidence
      : `${w.commandsIntro}\n\n${[...commandCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([command, count]) => `- \`${command}\` — ${count} ${w.commandTimes}`)
          .join('\n')}`

  /* ---------- Pendientes ---------- */
  const pendingScenarios = scenarios.filter((scenario) => !passed.has(scenario.id))
  const orphanScenarios = scenarios.filter((scenario) => tasksFor(scenario.id).length === 0)
  const openTasks = tasks.filter((task) => !task.done)
  const pendingParts: string[] = []
  if (pendingScenarios.length > 0) {
    pendingParts.push(`**${w.pendingEvidence}**\n\n${pendingScenarios.map((scenario) => `- \`${scenario.id}\` — ${scenario.title}`).join('\n')}`)
  }
  if (orphanScenarios.length > 0) {
    pendingParts.push(`**${w.scenariosWithoutTask}**\n\n${orphanScenarios.map((scenario) => `- \`${scenario.id}\` — ${scenario.title}`).join('\n')}`)
  }
  if (openTasks.length > 0) {
    pendingParts.push(`**${w.tasksPending}**\n\n${openTasks.map((task) => `- \`${task.id}\` — ${task.text}`).join('\n')}`)
  }
  if (hasAnalyze) pendingParts.push(w.analyzeHint)
  const pending = pendingParts.length === 0 ? w.nothingPending : pendingParts.join('\n\n')

  /* ---------- Manual: recorrido, pantallas, tareas, estados, problemas ---------- */
  const emptyScenarios = scenarios.filter((scenario) => scenarioKind(scenario, es) === 'empty')
  const warnScenarios = scenarios.filter((scenario) => scenarioKind(scenario, es) === 'warning')

  const walkthroughItems = requirements
    .map((requirement) => requirement.scenarios.find((scenario) => scenarioKind(scenario, es) === 'flow'))
    .filter((scenario): scenario is Scenario => scenario !== undefined)
    .slice(0, 8)
  const walkthrough =
    walkthroughItems.length === 0
      ? w.noSteps
      : walkthroughItems.map((scenario, index) => `${index + 1}. **${scenario.title}** — ${cap(scenario.when.join(' '))}. ${cap(scenario.then.join(' '))}.`).join('\n')

  const screens =
    mockups.length === 0
      ? w.noMockups
      : mockups
          .map((screen) => {
            const reqTitles = [
              ...new Set(
                screen.illustrates
                  .map((scenarioId) => scenarios.find((item) => item.id === scenarioId)?.title)
                  .filter((title): title is string => typeof title === 'string'),
              ),
            ]
            const lines = [`### ${screen.title}`, '']
            lines.push(`${w.mockupFile}: \`${screen.file}\`${screen.states.length > 0 ? ` · ${w.thStates}: ${screen.states.join(', ')}` : ''}`)
            if (reqTitles.length > 0) {
              lines.push('', `**${w.whatYouFind}**`, '')
              for (const title of reqTitles) lines.push(`- ${title}`)
            }
            return lines.join('\n')
          })
          .join('\n\n')

  const taskSteps =
    requirements.length === 0
      ? w.noSteps
      : requirements
          .map((requirement) => {
            const own = requirement.scenarios.filter((scenario) => scenarioKind(scenario, es) === 'flow')
            const lines = [`### ${requirement.title}`, '']
            const prose = requirement.prose.trim()
            if (prose.length > 0) lines.push(prose, '')
            if (own.length === 0) {
              lines.push(w.noSteps)
              return lines.join('\n')
            }
            lines.push(
              table(
                [w.thYouDo, w.thYouGet],
                own.map((scenario) => [cap(scenario.when.join(' ')), cap(scenario.then.join(' '))]),
              ),
            )
            return lines.join('\n')
          })
          .join('\n\n')

  const uiStates =
    emptyScenarios.length === 0
      ? w.emptyStates
      : `${table(
          [w.thSituation, w.thBehaviour],
          emptyScenarios.map((scenario) => [`**${scenario.title}** — ${cap(scenario.when.join(' '))}`, cap(scenario.then.join(' '))]),
        )}\n\n${w.statesTail}`

  const troubleshoot =
    warnScenarios.length === 0
      ? w.noTroubles
      : `${table(
          [w.thSituation, w.thBehaviour],
          warnScenarios.map((scenario) => [`**${scenario.title}** — ${cap(scenario.when.join(' '))}`, cap(scenario.then.join(' '))]),
        )}\n\n${w.troubleTail}`

  const allRules = requirements.flatMap((requirement) => requirement.rules)
  const rules = allRules.length === 0 ? w.noRules : allRules.map((rule) => `- \`${rule.id}\` — ${rule.text}`).join('\n')

  const verifiedRows: string[][] = requirements.map((requirement) => [
    requirement.title,
    `${requirement.scenarios.length}`,
    `${requirement.scenarios.filter((scenario) => passed.has(scenario.id)).length}`,
  ])
  const manualVerified =
    evidence.length === 0
      ? w.noEvidence
      : `${w.verifiedLead({ pass: passed.size, total: scenarios.length, methods: methodBreakdown(evidence, es) })}\n\n${table(
          [w.thRequirement, w.thScenarioCount, w.thWithEvidence],
          verifiedRows,
        )}`

  const proposal = sectionsOf(proposalRaw)
  const plan = sectionsOf(planRaw)

  return {
    TITLE: change.meta?.title ?? change.slug,
    SLUG: change.slug,
    DOMAIN: change.meta?.domain ?? w.none,
    LANE: change.meta?.lane ?? 'standard',
    DATE: localDate(now),
    TASKS: change.tasks ? `${counts.done}/${counts.total}` : w.none,
    SUMMARY: summary,
    REQ_BUSINESS: reqBusiness,
    FILES_TABLE: filesTable,
    TRACE_SUMMARY: traceSummary,
    TRACE_TABLE: traceTable,
    EVIDENCE_SUMMARY: evidenceSummary,
    EVIDENCE_TABLE: evidenceTable,
    COMMANDS: commands,
    PENDING: pending,
    WALKTHROUGH: walkthrough,
    SCREENS: screens,
    TASK_STEPS: taskSteps,
    UI_STATES: uiStates,
    TROUBLESHOOT: troubleshoot,
    RULES: rules,
    MANUAL_VERIFIED: manualVerified,
    MANUAL_GLOSSARY: glossaryText(glossaryRaw, w),
    WHY: orFallback(namedSection(proposal, es ? /^por qué$/i : /^why$/i), w.noWhy),
    MANUAL_WHAT: orFallback(namedSection(proposal, es ? /^qué cambia$/i : /^what changes$/i), w.noWhat),
    PLAN_CONTEXT: unnumbered(orFallback(numberedSection(plan, '1.'), w.noPlanContext)),
    PLAN_APPROACH: unnumbered(orFallback(numberedSection(plan, '2.'), w.noPlanApproach)),
    PLAN_DIAGRAMS: unnumbered(orFallback(numberedSection(plan, '3.'), w.noPlanDiagrams)),
    PLAN_DESIGN: unnumbered(orFallback(numberedSection(plan, '4.'), w.noPlanDesign)),
    PLAN_RISKS: unnumbered(orFallback(numberedSection(plan, '8.'), w.noPlanRisks)),
    PLAN_ROLLBACK: unnumbered(orFallback(numberedSection(plan, '9.'), w.noPlanRollback)),
    MANUAL_BEFORE: unnumbered(orFallback(numberedSection(plan, '10.'), w.noPrerequisites)),
  }
}

function mergeManaged(existing: string | undefined, block: string, language: Language): string {
  const managed = `${DOCS_MARKER_START}\n${block.trimEnd()}\n${DOCS_MARKER_END}`
  if (existing === undefined) {
    const notes = language === 'en' ? '## Notes\n\n(Write here whatever you want to keep across regenerations.)' : '## Notas\n\n(Escribe aquí lo que quieras conservar entre regeneraciones.)'
    return `${managed}\n\n${notes}\n`
  }
  const start = existing.indexOf(DOCS_MARKER_START)
  const end = existing.indexOf(DOCS_MARKER_END)
  if (start >= 0 && end > start) {
    const before = existing.slice(0, start)
    const after = existing.slice(end + DOCS_MARKER_END.length)
    return `${before}${managed}${after}`
  }
  return `${managed}\n\n${existing}`
}

export async function generateDocs(opts: GenerateDocsOptions): Promise<GenerateDocsResult> {
  const root = path.resolve(opts.root)
  const { config } = await loadWorkspace(root)
  const change = await loadChange(root, opts.slug)
  if (!change.meta) {
    return {
      slug: opts.slug,
      files: [],
      diagnostics: [diag('ATLAS-DOCS-002', 'error', `No existe el cambio "${opts.slug}"`, { suggestion: 'Comprueba el nombre del cambio' })],
    }
  }

  const language = config.project.language
  const ahora = opts.now ?? new Date()
  const tipo: DocsTipo = opts.tipo ?? 'all'
  const tipos: Array<'tecnica' | 'manual'> = tipo === 'all' ? ['tecnica', 'manual'] : [tipo]
  const templates = templatesFor(language)
  const [proposalRaw, planRaw, glossaryRaw, analyzeRaw, mockupManifest] = await Promise.all([
    readTextIfExists(path.join(change.dir, 'proposal.md')),
    readTextIfExists(path.join(change.dir, 'plan.md')),
    readTextIfExists(path.join(root, '.sdd', 'glossary.md')),
    readTextIfExists(path.join(change.dir, 'analyze.md')),
    readMockupManifest(root, change.slug),
  ])
  const mockups: DocMockup[] = (mockupManifest.manifest?.screens ?? []).map((screen) => ({
    id: screen.id,
    title: screen.title ?? screen.id,
    file: screen.file,
    illustrates: screen.illustrates ?? [],
    states: screen.states ?? [],
  }))
  const data = docData(change, language, ahora, proposalRaw, planRaw, glossaryRaw, mockups, analyzeRaw !== undefined)
  const files: GeneratedDoc[] = []
  const diagnostics: Diagnostic[] = []

  for (const current of tipos) {
    const file = path.join(change.dir, 'docs', `${current}.md`)
    const block = renderTemplate(current === 'tecnica' ? templates.docTecnica : templates.docManual, data)
    const existing = await readTextIfExists(file)
    const content = mergeManaged(existing, block, language)
    await writeText(file, content)
    const doc: GeneratedDoc = { tipo: current, path: file, created: existing === undefined }

    const label = current === 'tecnica' ? 'técnico' : 'manual'
    const title = `${current === 'tecnica' ? (language === 'en' ? 'Technical document' : 'Documento técnico') : language === 'en' ? 'User manual' : 'Manual de usuario'} — ${change.meta.title ?? change.slug}`

    try {
      const htmlPath = path.join(change.dir, 'docs', `${current}.html`)
      await writeText(htmlPath, renderDocument(content, { theme: 'auto', title }))
      doc.htmlPath = htmlPath
    } catch (error) {
      diagnostics.push(
        diag('ATLAS-DOCS-003', 'warning', `No se pudo generar el HTML del documento ${label}: ${(error as Error).message}`, {
          path: file,
          suggestion: 'El texto fuente quedó disponible; corrige el motivo y vuelve a documentar',
        }),
      )
    }

    try {
      const pdfPath = path.join(change.dir, 'docs', `${current}.pdf`)
      const pdf = await renderPdf(content, { title, project: config.project.name, generatedAt: localStamp(ahora) })
      await writeBytes(pdfPath, pdf.bytes)
      doc.pdfPath = pdfPath
    } catch (error) {
      diagnostics.push(
        diag('ATLAS-DOCS-003', 'warning', `No se pudo generar el PDF del documento ${label}: ${(error as Error).message}`, {
          path: file,
          suggestion: 'El texto fuente y el HTML quedaron disponibles; corrige el motivo y vuelve a documentar',
        }),
      )
    }

    files.push(doc)
  }

  return { slug: opts.slug, files, diagnostics }
}
