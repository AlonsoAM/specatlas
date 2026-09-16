import type { Diagnostic } from '@specatlas/core'
import { runCiGate } from '@specatlas/core'
import { checkAdapters } from '@specatlas/adapters'
import { flagBool } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { resolveWorkflowDir } from '../paths.js'

export async function runCi(ctx: CliContext): Promise<CommandResult> {
  const { root, config } = await requireWorkspace(ctx)
  const strict = flagBool(ctx.flags, 'strict')

  const extra: Array<{ name: string; diagnostics: Diagnostic[] }> = []
  const workflowDir = await resolveWorkflowDir()
  if (workflowDir) {
    const health = await checkAdapters({ root, workflowDir, targets: config.adapters.targets, language: config.project.language })
    extra.push({
      name: 'adaptadores',
      diagnostics:
        health.manifest && !health.ok
          ? [
              {
                code: 'ATLAS-ADAPTERS-001',
                severity: 'warning',
                message: 'Los adaptadores de agente están desactualizados respecto a workflow/',
                suggestion: 'Ejecuta `satlas adapters` y commitea el resultado',
              },
            ]
          : [],
    })
  }

  const gate = await runCiGate({ root, strict, extra })

  const lines = ['CI de SpecAtlas', '']
  for (const check of gate.checks) {
    lines.push(`  ${check.errors === 0 && check.warnings === 0 ? 'OK  ' : 'FALLA'} ${check.name}: ${check.errors} errores, ${check.warnings} avisos`)
  }
  lines.push('')
  lines.push(gate.failed ? 'Resultado: BLOQUEADO' : 'Resultado: OK')
  if (strict) lines.push('(modo estricto: los avisos también bloquean)')

  return {
    exitCode: gate.failed ? 1 : 0,
    diagnostics: gate.diagnostics,
    data: { checks: gate.checks, errors: gate.errors, warnings: gate.warnings, strict, failed: gate.failed },
    text: lines,
  }
}
