import path from 'node:path'
import type { Change, Language } from './model.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { readTextIfExists, writeText } from './fsx.js'
import { loadChange, loadWorkspace } from './workspace.js'
import { renderTemplate, templatesFor } from './templates.js'
import { localDate } from './time.js'

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
}

export interface GenerateDocsResult {
  slug: string
  files: GeneratedDoc[]
  diagnostics: Diagnostic[]
}

function docData(change: Change, language: Language, now: Date): Record<string, string> {
  const es = language !== 'en'
  const requirements = [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])]
  const evidence = change.verify?.evidence ?? []
  const passed = new Set(evidence.filter((entry) => entry.result === 'pass').map((entry) => entry.scenario))

  const requirementsText =
    requirements.length === 0
      ? es
        ? '_Sin requisitos en el delta._'
        : '_No requirements in the delta._'
      : requirements
          .map((requirement) => {
            const lines = [`### ${requirement.id} — ${requirement.title}`, '']
            for (const scenario of requirement.scenarios) lines.push(`- \`${scenario.id}\` — ${scenario.title}`)
            return lines.join('\n')
          })
          .join('\n\n')

  const scenarioList = requirements.flatMap((requirement) => requirement.scenarios)
  const scenariosText = scenarioList.length === 0 ? (es ? '_Sin escenarios._' : '_No scenarios._') : scenarioList.map((scenario) => `- \`${scenario.id}\` — ${scenario.title}`).join('\n')

  const evidenceText =
    evidence.length === 0
      ? es
        ? '_Sin evidencia registrada._'
        : '_No evidence recorded._'
      : evidence.map((entry) => `- \`${entry.scenario}\` — ${entry.method} · ${entry.result}${entry.date ? ` · ${entry.date}` : ''}`).join('\n')

  const pending = scenarioList.filter((scenario) => !passed.has(scenario.id))
  const pendingText =
    pending.length === 0
      ? es
        ? '_Nada pendiente: todos los escenarios tienen evidencia en pass._'
        : '_Nothing pending: every scenario has passing evidence._'
      : pending.map((scenario) => `- \`${scenario.id}\` — ${scenario.title}`).join('\n')

  return {
    TITLE: change.meta?.title ?? change.slug,
    SLUG: change.slug,
    DOMAIN: change.meta?.domain ?? '—',
    LANE: change.meta?.lane ?? 'standard',
    DATE: localDate(now),
    TASKS: change.tasks ? `${change.tasks.counts.done}/${change.tasks.counts.total}` : es ? 'sin tareas' : 'no tasks',
    REQUIREMENTS: requirementsText,
    SCENARIOS: scenariosText,
    EVIDENCE: evidenceText,
    PENDING: pendingText,
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
  const tipo: DocsTipo = opts.tipo ?? 'all'
  const tipos: Array<'tecnica' | 'manual'> = tipo === 'all' ? ['tecnica', 'manual'] : [tipo]
  const templates = templatesFor(language)
  const data = docData(change, language, opts.now ?? new Date())
  const files: GeneratedDoc[] = []

  for (const current of tipos) {
    const file = path.join(change.dir, 'docs', `${current}.md`)
    const block = renderTemplate(current === 'tecnica' ? templates.docTecnica : templates.docManual, data)
    const existing = await readTextIfExists(file)
    await writeText(file, mergeManaged(existing, block, language))
    files.push({ tipo: current, path: file, created: existing === undefined })
  }

  return { slug: opts.slug, files, diagnostics: [] }
}
