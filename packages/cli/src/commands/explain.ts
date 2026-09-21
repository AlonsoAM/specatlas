import { DIAGNOSTIC_FAMILIES, explainDiagnostic, listExplanations } from '@specatlas/core'
import type { CliContext, CommandResult } from '../cli.js'

export async function runExplain(ctx: CliContext): Promise<CommandResult> {
  const code = ctx.positionals[0]

  if (!code) {
    const lines = ['Códigos de diagnóstico', '', '  Familias:']
    for (const family of DIAGNOSTIC_FAMILIES) lines.push(`    ${family.prefix.padEnd(10)} ${family.title} — ${family.description}`)
    lines.push('')
    lines.push('  Con ficha propia:')
    for (const item of listExplanations()) lines.push(`    ${item.code.padEnd(18)} ${item.title}`)
    lines.push('')
    lines.push('  Detalle de uno: satlas explain <código>')
    return { exitCode: 0, diagnostics: [], data: { families: DIAGNOSTIC_FAMILIES, explanations: listExplanations() }, text: lines }
  }

  const { explanation, family } = explainDiagnostic(code)
  const upper = code.trim().toUpperCase()

  if (!explanation && !family) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-EXPLAIN-001', severity: 'error', message: `No hay ningún diagnóstico con el código "${upper}"`, suggestion: 'Lista los códigos con `satlas explain`' }],
    }
  }

  const lines: string[] = [upper, '']
  if (explanation) {
    lines.push(`  ${explanation.title}`)
    lines.push('')
    lines.push(`  Por qué importa: ${explanation.why}`)
    lines.push(`  Cómo se cierra:  ${explanation.fix}`)
  } else {
    lines.push(`  Sin ficha propia todavía; pertenece a la familia ${family?.prefix}.`)
  }
  if (family) {
    lines.push('')
    lines.push(`  Familia ${family.prefix} — ${family.title}: ${family.description}`)
  }

  return { exitCode: 0, diagnostics: [], data: { code: upper, explanation, family }, text: lines }
}
