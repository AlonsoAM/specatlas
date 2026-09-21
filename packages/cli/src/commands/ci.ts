import path from 'node:path'
import type { Diagnostic } from '@specatlas/core'
import { runCiGate, toSarifText, writeText } from '@specatlas/core'
import { checkAdapters } from '@specatlas/adapters'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { detectarTema, encabezado, filaAlineada, pinta, simbolos } from '../ui.js'
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
  const lines = encabezado(detectarTema(), 'Comprobación continua', strict ? 'modo estricto' : undefined)
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
  const tema = detectarTema()
  const s = simbolos(tema)
  for (const check of gate.checks) {
    // Un aviso no es una falla: solo bloquea en modo estricto, y el veredicto final lo dice.
    const marca = check.errors > 0 ? pinta(tema, 'rojo', s.error) : check.warnings > 0 ? pinta(tema, 'amarillo', s.aviso) : pinta(tema, 'verde', s.ok)
    const detalle =
      check.errors === 0 && check.warnings === 0
        ? pinta(tema, 'gris', 'sin hallazgos')
        : [check.errors > 0 ? pinta(tema, 'rojo', `${check.errors} ${check.errors === 1 ? 'error' : 'errores'}`) : '', check.warnings > 0 ? pinta(tema, 'amarillo', `${check.warnings} ${check.warnings === 1 ? 'aviso' : 'avisos'}`) : '']
            .filter((parte) => parte !== '')
            .join(pinta(tema, 'gris', ` ${s.separador} `))
    lines.push(filaAlineada([{ texto: `  ${marca} ${check.name}`, ancho: 46 }, { texto: detalle }]))
  }
  lines.push('')
  lines.push(
    gate.failed
      ? `  ${pinta(tema, ['rojo', 'negrita'], `${s.error} BLOQUEADO`)}${pinta(tema, 'gris', ' — resuelve los hallazgos antes de continuar')}`
      : `  ${pinta(tema, ['verde', 'negrita'], `${s.ok} TODO EN ORDEN`)}`,
  )
  if (strict) lines.push(pinta(tema, 'gris', '  (modo estricto: los avisos también bloquean)'))
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
