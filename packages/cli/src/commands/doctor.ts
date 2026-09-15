import path from 'node:path'
import { runDoctor } from '@specatlas/core'
import { checkAdapters } from '@specatlas/adapters'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'
import { resolveWorkflowDir } from '../paths.js'

export async function runDoctorCommand(ctx: CliContext): Promise<CommandResult> {
  const { root, config } = await requireWorkspace(ctx)
  const report = await runDoctor(root)

  const workflowDir = await resolveWorkflowDir()
  if (workflowDir) {
    const health = await checkAdapters({ root, workflowDir, targets: config.adapters.targets, language: config.project.language })
    if (health.manifest && !health.ok) {
      report.findings.push({
        code: 'ATLAS-ADAPTERS-001',
        severity: 'warning',
        message: 'Los adaptadores de agente están desactualizados respecto a workflow/',
        suggestion: 'Ejecuta `satlas adapters` para recompilar',
      })
      report.summary.warnings += 1
    }
  }

  const lines: string[] = [msg('doctor.title', ctx.language), '']

  if (report.findings.length === 0) {
    lines.push('Sin hallazgos. El workspace está sano.')
  } else {
    for (const finding of report.findings) {
      const location = finding.path ? ` ${path.relative(ctx.cwd, finding.path)}${finding.line ? `:${finding.line}` : ''}` : ''
      lines.push(`  ${finding.severity.toUpperCase()}  ${finding.code}${location} — ${finding.message}`)
      if (finding.suggestion) lines.push(`       ↳ ${finding.suggestion}`)
    }
    lines.push('')
    lines.push(`${report.summary.errors} errores, ${report.summary.warnings} avisos, ${report.summary.infos} notas`)
  }

  return {
    exitCode: report.summary.errors > 0 ? 1 : 0,
    diagnostics: report.findings,
    data: report,
    text: lines,
  }
}
