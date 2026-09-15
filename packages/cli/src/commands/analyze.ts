import path from 'node:path'
import { runAnalyze } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runAnalyzeCommand(ctx: CliContext): Promise<CommandResult> {
  const { root } = await requireWorkspace(ctx)
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-ANALYZE-000', severity: 'error', message: 'Falta el slug: satlas analyze <slug>' }] }
  }
  const result = await runAnalyze({ root, slug })
  const lines = [`Análisis — ${slug}`, '', `  estado: ${result.status}`, `  hallazgos: ${result.summary.errors} errores, ${result.summary.warnings} avisos`, `  evidencia: ${result.evidence.done}/${result.evidence.total} escenarios`]
  if (result.waves) lines.push(`  olas: ${result.waves.blocks} bloque(s), ${result.waves.waves} ola(s), ${result.waves.tasks} tarea(s)`)
  if (result.mockups) lines.push(`  mockups: ${result.mockups.screens} pantalla(s)${result.mockups.stale ? ' (desactualizados)' : ''}`)
  if (result.path) lines.push('', `  informe: ${path.relative(ctx.cwd, result.path)}`)
  for (const finding of result.findings) {
    lines.push(`  ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}`)
  }
  return {
    exitCode: result.status === 'blocked' ? 1 : 0,
    diagnostics: result.findings,
    data: result.path ? { ...result, path: path.relative(ctx.cwd, result.path) } : result,
    text: lines,
  }
}
