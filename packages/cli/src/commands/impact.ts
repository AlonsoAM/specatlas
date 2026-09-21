import { impactOfFile, impactOfRequirement, loadAllAnchors } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

const REQ_TARGET_RE = /^REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}(?:-S\d+)?$/i

export async function runImpact(ctx: CliContext): Promise<CommandResult> {
  const target = ctx.positionals[0]
  if (!target) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-IMPACT-000', severity: 'error', message: 'Falta el objetivo: satlas impact <REQ-…|ruta/archivo>' }],
    }
  }
  const { root, workspace } = await requireWorkspace(ctx)
  const anchors = await loadAllAnchors(root)

  const isRequirement = REQ_TARGET_RE.test(target)
  const report = isRequirement
    ? impactOfRequirement(workspace, target.toUpperCase().replace(/-S\d+$/, ''), anchors)
    : impactOfFile(workspace, target, anchors)

  const lines: string[] = [`Impacto — ${target}`, '']
  if (!report.exists) {
    lines.push(`  Sin relaciones registradas para "${target}".`)
    lines.push(isRequirement
      ? '  El requisito no existe en las specs vivas ni en los cambios activos.'
      : '  Ningún cambio activo ni ancla de spec viva menciona este archivo.')
    return { exitCode: 0, diagnostics: [], data: { target, exists: false }, text: lines }
  }

  if (report.external) lines.push(`  origen: proyecto enlazado "${report.origin}"`)
  if (report.requirements.length > 0) lines.push(`  requisitos: ${report.requirements.join(', ')}`)
  if (report.scenarios.length > 0) lines.push(`  escenarios: ${report.scenarios.length}`)
  if (report.changes.length > 0) lines.push(`  cambios: ${report.changes.join(', ')}`)

  if ((report.anchors ?? []).length > 0) {
    lines.push('')
    lines.push('  Dónde vive en el código (anclas de las specs vivas):')
    for (const anchor of report.anchors ?? []) {
      for (const file of anchor.files) lines.push(`    ${anchor.requirement} · ${anchor.domain} — ${file}`)
    }
  }

  if (report.tasks.length > 0) {
    lines.push('')
    lines.push('  Tareas de los cambios activos:')
    for (const task of report.tasks) lines.push(`    ${task.change} · ${task.id} — ${task.text}`)
  }

  if (report.evidence.length > 0) {
    lines.push('')
    lines.push('  Evidencia registrada:')
    for (const item of report.evidence) lines.push(`    ${item.scenario} — ${item.result} (${item.change})`)
  }

  return { exitCode: 0, diagnostics: [], data: report, text: lines }
}
