import path from 'node:path'
import { countBySeverity, runDoctor, upgradeAdvisory } from '@specatlas/core'
import { checkAdapters } from '@specatlas/adapters'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'
import { detectarTema, encabezado, exito } from '../ui.js'
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

  const advisory = await upgradeAdvisory(root)
  report.findings.push(...advisory.diagnostics)
  report.summary = countBySeverity(report.findings)

  const tema = detectarTema()
  const lines: string[] = encabezado(tema, msg('doctor.title', ctx.language))

  if (report.findings.length === 0) {
    lines.push(exito(tema, 'El workspace está sano.'))
  }
  // Los hallazgos los pinta la capa de presentación: aquí se duplicaban.

  return {
    exitCode: report.summary.errors > 0 ? 1 : 0,
    diagnostics: report.findings,
    data: report,
    text: lines,
  }
}
