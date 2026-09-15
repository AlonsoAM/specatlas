import path from 'node:path'
import type { Diagnostic } from '@specatlas/core'
import { AGENT_TARGETS, checkAdapters, compileTargets, isAgentTarget, type AgentTarget } from '@specatlas/adapters'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { resolveWorkflowDir } from '../paths.js'

export async function runAdapters(ctx: CliContext): Promise<CommandResult> {
  const { root, config } = await requireWorkspace(ctx)
  const workflowDir = await resolveWorkflowDir()
  if (!workflowDir) {
    return {
      exitCode: 2,
      diagnostics: [
        {
          code: 'ATLAS-ADAPTERS-003',
          severity: 'error',
          message: 'No se encontró la carpeta workflow/phases con las fuentes de prompts',
          suggestion: 'Define SPECATLAS_WORKFLOW_DIR apuntando a la carpeta workflow del paquete',
        },
      ],
    }
  }

  const targetsFlag = flagString(ctx.flags, 'targets')
  let targets: AgentTarget[] = config.adapters.targets
  if (targetsFlag) {
    const requested = targetsFlag.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
    const invalid = requested.filter((t) => !isAgentTarget(t))
    if (invalid.length > 0) {
      return {
        exitCode: 2,
        diagnostics: [
          {
            code: 'ATLAS-ADAPTERS-004',
            severity: 'error',
            message: `Targets inválidos: ${invalid.join(', ')}`,
            suggestion: `Targets disponibles: ${AGENT_TARGETS.join(', ')}`,
          },
        ],
      }
    }
    targets = requested as AgentTarget[]
  }

  const check = flagBool(ctx.flags, 'check')
  const lines: string[] = []
  const diagnostics: Diagnostic[] = []

  if (check) {
    const health = await checkAdapters({ root, workflowDir, targets, language: config.project.language })
    if (!health.manifest) {
      lines.push('No hay adaptadores compilados todavía (.sdd/.generated/manifest.json ausente).')
      lines.push('Ejecuta `satlas adapters` para generarlos.')
      return { exitCode: 0, diagnostics, data: health, text: lines }
    }
    lines.push('Verificación de adaptadores')
    lines.push('')
    lines.push(`  fuente sin cambios: ${health.ok ? 'sí' : 'no'}`)
    for (const p of health.stale) lines.push(`  desactualizado: ${p}`)
    for (const p of health.missing) lines.push(`  faltante: ${p}`)
    for (const p of health.orphaned) lines.push(`  huérfano (ya no se genera): ${p}`)
    if (!health.ok) {
      diagnostics.push({
        code: 'ATLAS-ADAPTERS-001',
        severity: 'warning',
        message: 'Los adaptadores de agente están desactualizados respecto a workflow/',
        suggestion: 'Ejecuta `satlas adapters` para recompilar',
      })
    }
    return { exitCode: health.ok ? 0 : 1, diagnostics, data: health, text: lines }
  }

  const report = await compileTargets({ root, workflowDir, targets, language: config.project.language })
  lines.push('Adaptadores compilados')
  lines.push('')
  const byTarget = new Map<string, number>()
  for (const file of report.files) byTarget.set(file.target, (byTarget.get(file.target) ?? 0) + 1)
  for (const [target, count] of byTarget) lines.push(`  ${target}: ${count} archivo(s)`)
  if (report.written.length > 0) {
    lines.push('')
    for (const p of report.written) lines.push(`  + ${path.relative(ctx.cwd, path.join(root, p))}`)
  } else {
    lines.push('')
    lines.push('Sin cambios: los adaptadores ya estaban al día.')
  }
  lines.push('')
  lines.push('En opencode: reinicia la sesión para que los comandos /satlas-* se carguen.')

  return { exitCode: report.diagnostics.some((d) => d.severity === 'error') ? 1 : 0, diagnostics: report.diagnostics, data: report, text: lines }
}
