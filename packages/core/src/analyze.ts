import path from 'node:path'
import { localStamp } from './time.js'
import type { Diagnostic } from './diagnostics.js'
import { countBySeverity, diag } from './diagnostics.js'
import { readTextIfExists, writeText } from './fsx.js'
import { lintDelta, lintPlan } from './lint.js'
import { agentCommand } from './agents.js'
import { checkTrace } from './trace.js'
import { linkedTraceInput } from './links.js'
import { planWaves } from './waves.js'
import { checkMockups } from './mockups.js'
import { evaluatePacks, packFindings, resolvePacks } from './packs.js'
import { loadWorkspace } from './workspace.js'
import type { Change, Requirement } from './model.js'

export interface AnalyzeOptions {
  root: string
  slug: string
  now?: Date
  write?: boolean
}

export interface AnalyzePackSummary {
  id: string
  title: string
  status: 'ok' | 'fail' | 'n/a'
  passed: number
  failed: number
}

export type AnalyzeCheckStatus = 'ok' | 'warn' | 'fail' | 'n/a'

/** Una comprobación del análisis: qué se miró, con qué resultado y qué significa. */
export interface AnalyzeCheck {
  id: string
  title: string
  question: string
  detail: string
  status: AnalyzeCheckStatus
}

export interface AnalyzeResult {
  slug: string
  status: 'passed' | 'passed_with_debt' | 'blocked'
  findings: Diagnostic[]
  path?: string
  summary: { errors: number; warnings: number; infos: number }
  waves?: { blocks: number; waves: number; tasks: number }
  evidence: { done: number; total: number }
  mockups?: { screens: number; stale: boolean }
  packs?: AnalyzePackSummary[]
  checks?: AnalyzeCheck[]
}

const UI_DOMAINS = new Set(['frontend', 'mobile', 'fullstack'])

export async function runAnalyze(opts: AnalyzeOptions): Promise<AnalyzeResult> {
  const root = path.resolve(opts.root)
  const { workspace, config } = await loadWorkspace(root)
  const change = workspace.changes.find((c) => c.slug === opts.slug)
  if (!change) {
    return {
      slug: opts.slug,
      status: 'blocked',
      findings: [diag('ATLAS-ANALYZE-000', 'error', `No existe el cambio "${opts.slug}"`)],
      summary: { errors: 1, warnings: 0, infos: 0 },
      evidence: { done: 0, total: 0 },
    }
  }

  const findings: Diagnostic[] = [...change.diagnostics]
  const checks: AnalyzeCheck[] = []
  /** Clasifica una comprobación según los hallazgos que produjo. */
  const since = (mark: number): AnalyzeCheckStatus => {
    const added = findings.slice(mark)
    if (added.some((finding) => finding.severity === 'error')) return 'fail'
    if (added.some((finding) => finding.severity === 'warning')) return 'warn'
    return 'ok'
  }
  const countSince = (mark: number): number => findings.length - mark

  const living = new Map<string, Requirement>()
  for (const spec of workspace.specs) {
    for (const req of spec.spec.requirements) living.set(req.id, req)
  }

  let mark = findings.length
  if (change.delta) {
    findings.push(...lintDelta(change.delta, living, path.join(change.dir, 'spec.md'), { language: config.spec.language }))
    const reqs = [...change.delta.added, ...change.delta.modified]
    checks.push({
      id: 'spec',
      title: 'Especificación del cambio',
      question: '¿El delta está bien formado y no choca con las specs vivas?',
      detail: `${reqs.length} requisito(s), ${reqs.flatMap((r) => r.scenarios).length} escenario(s) · ${countSince(mark)} hallazgo(s)`,
      status: since(mark),
    })
  } else {
    checks.push({ id: 'spec', title: 'Especificación del cambio', question: '¿El delta está bien formado?', detail: 'El cambio no tiene spec.md', status: 'n/a' })
  }

  mark = findings.length
  const trace = checkTrace({ specs: workspace.specs, change, requireEvidence: false, linked: linkedTraceInput(workspace) })
  findings.push(...trace.findings)
  checks.push({
    id: 'trace',
    title: 'Trazabilidad',
    question: '¿Cada requisito tiene escenarios y cada escenario una tarea que lo cubra?',
    detail: `${countSince(mark)} hallazgo(s) de trazabilidad`,
    status: since(mark),
  })

  mark = findings.length
  let waves: AnalyzeResult['waves']
  if (change.tasks && change.tasks.counts.total > 0) {
    const plan = planWaves(change.tasks, { maxParallel: config.waves.max_parallel })
    findings.push(...plan.blocks.flatMap((b) => b.diagnostics))
    waves = plan.summary
    checks.push({
      id: 'waves',
      title: 'Tareas y olas de ejecución',
      question: '¿Las dependencias entre tareas forman un orden ejecutable, sin ciclos?',
      detail: `${plan.summary.tasks} tarea(s) en ${plan.summary.blocks} bloque(s) · ${change.tasks.counts.done}/${change.tasks.counts.total} hechas · ${plan.summary.waves} ola(s) pendiente(s)`,
      status: since(mark),
    })
  } else {
    checks.push({ id: 'waves', title: 'Tareas y olas de ejecución', question: '¿Hay tareas planificadas?', detail: 'El cambio todavía no tiene tareas', status: 'n/a' })
  }

  mark = findings.length
  const lane = change.meta?.lane ?? config.lanes.default
  if (lane !== 'fix' && !change.planPath) {
    findings.push(diag('ATLAS-ANALYZE-001', 'warning', 'El cambio no tiene plan.md (plan técnico)', { suggestion: `Ejecuta la fase ${agentCommand('plan', change.slug, config)}` }))
  }
  if (change.planPath) {
    const planText = (await readTextIfExists(change.planPath)) ?? ''
    findings.push(...lintPlan(planText, change.planPath))
  }
  checks.push({
    id: 'plan',
    title: 'Plan técnico',
    question: '¿Existe el plan y tiene las secciones que la fase exige?',
    detail: change.planPath ? `plan.md presente · ${countSince(mark)} hallazgo(s)` : 'sin plan.md',
    status: lane === 'fix' && !change.planPath ? 'n/a' : since(mark),
  })

  const deltaScenarios = [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])].flatMap((r) => r.scenarios)
  const passed = new Set((change.verify?.evidence ?? []).filter((e) => e.result === 'pass').map((e) => e.scenario))
  const evidence = { done: deltaScenarios.filter((s) => passed.has(s.id)).length, total: deltaScenarios.length }
  checks.push({
    id: 'evidence',
    title: 'Evidencia',
    question: '¿Cada escenario tiene evidencia real registrada en verify.md?',
    detail: `${evidence.done} de ${evidence.total} escenario(s) con evidencia favorable`,
    status: evidence.total === 0 ? 'n/a' : evidence.done === evidence.total ? 'ok' : 'warn',
  })

  mark = findings.length
  let mockups: AnalyzeResult['mockups']
  const domain = change.meta?.domain ?? ''
  if (UI_DOMAINS.has(domain)) {
    const check = await checkMockups(root, opts.slug, change)
    findings.push(...check.findings)
    mockups = { screens: check.manifest?.screens.length ?? 0, stale: check.stale }
    checks.push({
      id: 'mockups',
      title: 'Contrato visual (mockups)',
      question: '¿Los mockups existen, ilustran escenarios y siguen al día respecto de la spec?',
      detail: `${mockups.screens} pantalla(s)${mockups.stale ? ' · desactualizados' : ' · al día'}`,
      status: since(mark),
    })
  }

  mark = findings.length
  let packs: AnalyzeResult['packs']
  if (config.packs.length > 0) {
    const resolved = await resolvePacks(workspace.sddDir, config)
    findings.push(...resolved.diagnostics)
    const evaluations = evaluatePacks(resolved.packs, change, config)
    findings.push(...packFindings(evaluations, change))
    packs = evaluations.map((evaluation) => ({
      id: evaluation.pack.id,
      title: evaluation.pack.title,
      status: evaluation.status,
      passed: evaluation.passed,
      failed: evaluation.failed,
    }))
    checks.push({
      id: 'packs',
      title: 'Packs de cumplimiento',
      question: '¿El cambio cumple los controles obligatorios del proyecto?',
      detail: `${packs.length} pack(s) evaluado(s)`,
      status: since(mark),
    })
  }

  const summary = countBySeverity(findings)
  // `gates.analyze.min_severity` decide qué pesa: high solo errores, medium suma los
  // avisos a la deuda y low convierte cualquier aviso en deuda desde el primero.
  const minSeverity = config.gates.analyze.min_severity
  const debtThreshold = minSeverity === 'low' ? 0 : minSeverity === 'medium' ? 5 : Number.POSITIVE_INFINITY
  const status: AnalyzeResult['status'] = summary.errors > 0 ? 'blocked' : summary.warnings > debtThreshold ? 'passed_with_debt' : 'passed'

  const result: AnalyzeResult = { slug: opts.slug, status, findings, summary, evidence, checks }
  if (waves) result.waves = waves
  if (mockups) result.mockups = mockups
  if (packs) result.packs = packs

  if (opts.write !== false) {
    const file = path.join(change.dir, 'analyze.md')
    await writeText(file, renderAnalyze(change, result, localStamp(opts.now)))
    result.path = file
  }

  return result
}

const STATUS_MEANING: Record<AnalyzeResult['status'], { label: string; meaning: string; next: string }> = {
  passed: {
    label: 'sin hallazgos',
    meaning: 'Las comprobaciones de consistencia pasaron: la especificación, la trazabilidad, el plan y las tareas encajan entre sí.',
    next: 'El cambio puede continuar con la siguiente fase de su carril.',
  },
  passed_with_debt: {
    label: 'pasa con deuda',
    meaning: 'No hay errores que bloqueen, pero sí varios avisos: el cambio avanza arrastrando deuda.',
    next: 'Revisa los avisos de la tabla de hallazgos y decide cuáles atender antes de archivar.',
  },
  blocked: {
    label: 'bloqueado',
    meaning: 'Hay al menos un error de consistencia: el cambio no está listo para avanzar.',
    next: 'Corrige los errores de la tabla de hallazgos y vuelve a ejecutar `satlas analyze` para confirmar que quedaron en cero.',
  },
}

const CHECK_ICON: Record<AnalyzeCheckStatus, string> = { ok: '✅ ok', warn: '⚠️ avisos', fail: '❌ errores', 'n/a': '— no aplica' }

function renderAnalyze(change: Change, result: AnalyzeResult, generatedAt: string): string {
  const meaning = STATUS_MEANING[result.status]
  const lines: string[] = []
  lines.push(`# Análisis de consistencia — ${change.meta?.title ?? change.slug}`)
  lines.push('')
  lines.push('## Para qué sirve este informe')
  lines.push('')
  lines.push(
    'El análisis es el control de consistencia cruzada del cambio: **no prueba el código** (eso lo hace la verificación) sino que comprueba que los artefactos encajan entre sí — que la especificación está bien formada, que cada requisito llega hasta una tarea y una evidencia, que el plan existe y que las tareas se pueden ejecutar en un orden sin ciclos.',
  )
  lines.push('')
  lines.push(
    'Se ejecuta con `satlas analyze <cambio>` (o desde el paso «Analizar» del panel). Es un informe **derivado y regenerable**: se sobrescribe en cada ejecución y siempre refleja el estado actual de los artefactos, así que un informe viejo nunca se corrige a mano, se vuelve a generar.',
  )
  lines.push('')
  lines.push('## Resultado')
  lines.push('')
  lines.push(`- **Estado**: \`${result.status}\` — ${meaning.label}`)
  lines.push(`- **Qué significa**: ${meaning.meaning}`)
  lines.push(`- **Siguiente paso**: ${meaning.next}`)
  lines.push(`- **Hallazgos**: ${result.summary.errors} error(es), ${result.summary.warnings} aviso(s), ${result.summary.infos} informativo(s)`)
  lines.push(`- **Evidencia**: ${result.evidence.done}/${result.evidence.total} escenario(s) con evidencia favorable`)
  if (result.waves) lines.push(`- **Ejecución**: ${result.waves.blocks} bloque(s), ${result.waves.waves} ola(s), ${result.waves.tasks} tarea(s)`)
  if (result.mockups) lines.push(`- **Mockups**: ${result.mockups.screens} pantalla(s)${result.mockups.stale ? ' (desactualizados)' : ' (al día)'}`)
  lines.push(`- **Generado**: ${generatedAt}`)
  lines.push('')
  if (result.checks && result.checks.length > 0) {
    lines.push('## Qué se comprobó')
    lines.push('')
    lines.push('| Comprobación | Qué pregunta | Resultado | Detalle |')
    lines.push('|---|---|---|---|')
    for (const check of result.checks) {
      lines.push(`| **${check.title}** | ${check.question} | ${CHECK_ICON[check.status]} | ${check.detail} |`)
    }
    lines.push('')
  }
  if (result.packs && result.packs.length > 0) {
    lines.push('## Packs de cumplimiento')
    lines.push('')
    lines.push('| Pack | Estado | Controles |')
    lines.push('|---|---|---|')
    for (const pack of result.packs) {
      lines.push(`| ${pack.title} (\`${pack.id}\`) | ${pack.status} | ${pack.passed} ok · ${pack.failed} con falla |`)
    }
    lines.push('')
  }
  lines.push(`## Hallazgos (${result.summary.errors} errores, ${result.summary.warnings} avisos)`)
  lines.push('')
  if (result.findings.length === 0) {
    lines.push('Sin hallazgos: ninguna comprobación encontró inconsistencias entre los artefactos del cambio.')
  } else {
    lines.push('Cada hallazgo indica el código con el que buscarlo, dónde está y qué hacer.')
    lines.push('')
    lines.push('| Código | Severidad | Mensaje | Ubicación | Qué hacer |')
    lines.push('|---|---|---|---|---|')
    for (const finding of result.findings) {
      const location = finding.path ? `${finding.path}${finding.line ? `:${finding.line}` : ''}` : '—'
      const suggestion = finding.suggestion ? finding.suggestion.replace(/\|/g, '\\|') : '—'
      lines.push(`| ${finding.code} | ${finding.severity} | ${finding.message.replace(/\|/g, '\\|')} | ${location} | ${suggestion} |`)
    }
  }
  lines.push('')
  return lines.join('\n')
}
