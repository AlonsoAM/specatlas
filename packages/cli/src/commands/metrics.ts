import { collectMetrics } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runMetrics(ctx: CliContext): Promise<CommandResult> {
  const { root } = await requireWorkspace(ctx)
  const metrics = await collectMetrics(root)
  const lines: string[] = [`Métricas — ${metrics.project}`, '']
  lines.push(`  Cambios activos: ${metrics.totals.changes} · archivados: ${metrics.totals.archived}`)
  lines.push(`  Tareas: ${metrics.totals.tasksDone}/${metrics.totals.tasks} · evidencia: ${metrics.totals.scenariosPassed}/${metrics.totals.scenarios} escenarios`)
  lines.push(`  Hallazgos: ${metrics.totals.errors} errores, ${metrics.totals.warnings} avisos`)
  lines.push('')
  if (metrics.changes.length > 0) {
    lines.push('  Cambio                 Carril     Estado                 Tareas   Evidencia  Edad')
    for (const change of metrics.changes) {
      lines.push(
        `  ${change.slug.padEnd(22)} ${change.lane.padEnd(10)} ${change.stateLabel.padEnd(22)} ${`${change.tasksDone}/${change.tasksTotal}`.padEnd(8)} ${`${change.scenariosPassed}/${change.scenariosTotal}`.padEnd(10)} ${change.ageDays !== undefined ? `${change.ageDays}d` : '—'}`,
      )
    }
    lines.push('')
  }
  const wip = Object.entries(metrics.wipByState)
    .map(([state, value]) => `${value.label}: ${value.count}`)
    .join(' · ')
  if (wip) lines.push(`  WIP: ${wip}`)
  const throughput = Object.entries(metrics.throughputByMonth)
    .map(([month, count]) => `${month}: ${count}`)
    .join(' · ')
  if (throughput) lines.push(`  Archivados por mes: ${throughput}`)
  const methods = Object.entries(metrics.evidenceByMethod)
    .map(([method, count]) => `${method}: ${count}`)
    .join(' · ')
  if (methods) lines.push(`  Evidencia por método: ${methods}`)
  if (metrics.blocked.length > 0) {
    lines.push('')
    lines.push('  Bloqueados:')
    for (const entry of metrics.blocked) lines.push(`    ${entry.slug}: ${entry.reason}`)
  }

  return { exitCode: 0, diagnostics: [], data: metrics, text: lines }
}
