import path from 'node:path'
import type { Diagnostic } from './diagnostics.js'
import { countBySeverity, diag } from './diagnostics.js'
import { writeText } from './fsx.js'
import { lintDelta } from './lint.js'
import { checkTrace } from './trace.js'
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
  const living = new Map<string, Requirement>()
  for (const spec of workspace.specs) {
    for (const req of spec.spec.requirements) living.set(req.id, req)
  }

  if (change.delta) {
    findings.push(...lintDelta(change.delta, living, path.join(change.dir, 'spec.md'), { language: config.spec.language }))
  }

  const trace = checkTrace({ specs: workspace.specs, change, requireEvidence: false })
  findings.push(...trace.findings)

  let waves: AnalyzeResult['waves']
  if (change.tasks && change.tasks.counts.total > 0) {
    const plan = planWaves(change.tasks, { maxParallel: config.waves.max_parallel })
    findings.push(...plan.blocks.flatMap((b) => b.diagnostics))
    waves = plan.summary
  }

  const lane = change.meta?.lane ?? config.lanes.default
  if (lane !== 'fix' && !change.planPath) {
    findings.push(diag('ATLAS-ANALYZE-001', 'warning', 'El cambio no tiene plan.md (plan técnico)', { suggestion: 'Ejecuta la fase /satlas-plan' }))
  }

  const deltaScenarios = [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])].flatMap((r) => r.scenarios)
  const passed = new Set((change.verify?.evidence ?? []).filter((e) => e.result === 'pass').map((e) => e.scenario))
  const evidence = { done: deltaScenarios.filter((s) => passed.has(s.id)).length, total: deltaScenarios.length }

  let mockups: AnalyzeResult['mockups']
  const domain = change.meta?.domain ?? ''
  if (UI_DOMAINS.has(domain)) {
    const check = await checkMockups(root, opts.slug, change)
    findings.push(...check.findings)
    mockups = { screens: check.manifest?.screens.length ?? 0, stale: check.stale }
  }

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
  }

  const summary = countBySeverity(findings)
  const status: AnalyzeResult['status'] = summary.errors > 0 ? 'blocked' : summary.warnings > 5 ? 'passed_with_debt' : 'passed'

  const result: AnalyzeResult = { slug: opts.slug, status, findings, summary, evidence }
  if (waves) result.waves = waves
  if (mockups) result.mockups = mockups
  if (packs) result.packs = packs

  if (opts.write !== false) {
    const file = path.join(change.dir, 'analyze.md')
    await writeText(file, renderAnalyze(change, result, (opts.now ?? new Date()).toISOString()))
    result.path = file
  }

  return result
}

function renderAnalyze(change: Change, result: AnalyzeResult, generatedAt: string): string {
  const lines: string[] = []
  lines.push(`# Análisis — ${change.meta?.title ?? change.slug}`)
  lines.push('')
  lines.push(`- Generado: ${generatedAt}`)
  lines.push(`- Estado: **${result.status}**`)
  lines.push(`- Evidencia: ${result.evidence.done}/${result.evidence.total} escenarios`)
  if (result.waves) lines.push(`- Olas: ${result.waves.blocks} bloque(s), ${result.waves.waves} ola(s), ${result.waves.tasks} tarea(s)`)
  if (result.mockups) lines.push(`- Mockups: ${result.mockups.screens} pantalla(s)${result.mockups.stale ? ' (desactualizados)' : ''}`)
  lines.push('')
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
    lines.push('Sin hallazgos.')
  } else {
    lines.push('| Código | Severidad | Mensaje | Ubicación |')
    lines.push('|---|---|---|---|')
    for (const finding of result.findings) {
      const location = finding.path ? `${finding.path}${finding.line ? `:${finding.line}` : ''}` : '—'
      lines.push(`| ${finding.code} | ${finding.severity} | ${finding.message.replace(/\|/g, '\\|')} | ${location} |`)
    }
  }
  lines.push('')
  return lines.join('\n')
}
