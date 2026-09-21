import path from 'node:path'
import type { Diagnostic } from '@specatlas/core'
import { runCiGate, toSarifText, writeText } from '@specatlas/core'
import { checkAdapters } from '@specatlas/adapters'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { resolveWorkflowDir } from '../paths.js'
import { cliVersion } from '../version.js'

export async function runCi(ctx: CliContext): Promise<CommandResult> {
  const { root, config } = await requireWorkspace(ctx)
  const strict = flagBool(ctx.flags, 'strict')
  const sarifPath = flagString(ctx.flags, 'sarif')

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

  const diagnostics: Diagnostic[] = [...gate.diagnostics]
  const lines = ['CI de SpecAtlas', '']
  let sarifWritten: string | undefined
  if (sarifPath) {
    const target = path.resolve(ctx.cwd, sarifPath)
    try {
      await writeText(target, toSarifText({ diagnostics: gate.diagnostics, root, version: cliVersion(), failed: gate.failed }))
      sarifWritten = path.relative(ctx.cwd, target)
    } catch (err) {
      diagnostics.push({
        code: 'ATLAS-CI-SARIF-001',
        severity: 'warning',
        message: `No se pudo escribir el informe SARIF en "${sarifPath}": ${(err as Error).message}`,
        suggestion: 'Revisa que la ruta sea escribible; el veredicto de la comprobación no cambia',
      })
    }
  }
  for (const check of gate.checks) {
    // Un aviso no es una falla: solo bloquea en modo estricto, y el veredicto final lo dice.
    const mark = check.errors > 0 ? 'FALLA' : check.warnings > 0 ? 'AVISO' : 'OK  '
    lines.push(`  ${mark} ${check.name}: ${check.errors} errores, ${check.warnings} avisos`)
  }
  lines.push('')
  lines.push(gate.failed ? 'Resultado: BLOQUEADO' : 'Resultado: OK')
  if (strict) lines.push('(modo estricto: los avisos también bloquean)')
  if (sarifPath) {
    lines.push(sarifWritten ? `Informe SARIF: ${sarifWritten} (${gate.diagnostics.length} hallazgo(s))` : `Informe SARIF: no se pudo escribir en "${sarifPath}"`)
  }

  return {
    exitCode: gate.failed ? 1 : 0,
    diagnostics,
    data: {
      checks: gate.checks,
      errors: gate.errors,
      warnings: gate.warnings,
      strict,
      failed: gate.failed,
      ...(sarifWritten ? { sarif: sarifWritten } : {}),
    },
    text: lines,
  }
}
