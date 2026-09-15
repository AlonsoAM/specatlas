import path from 'node:path'
import { generatePresentation, shortHash } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runPresentCommand(ctx: CliContext): Promise<CommandResult> {
  const { root } = await requireWorkspace(ctx)
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-PRESENT-000', severity: 'error', message: 'Falta el slug: satlas present <slug>' }] }
  }
  const result = await generatePresentation({ root, slug })
  const lines: string[] = []
  if (result.path) {
    lines.push('Propuesta generada')
    lines.push('')
    lines.push(`  archivo: ${path.relative(ctx.cwd, result.path)}`)
    if (result.hash) lines.push(`  hash de la spec: ${shortHash(result.hash)}`)
    lines.push('')
    lines.push('Ábrela en el navegador y compártela con el stakeholder.')
    lines.push(`Aprobación: satlas approve ${slug} --by "<nombre>" --channel presentation`)
  }
  const hasErrors = result.diagnostics.some((d) => d.severity === 'error')
  return {
    exitCode: hasErrors ? 1 : 0,
    diagnostics: result.diagnostics,
    data: result.path ? { path: path.relative(ctx.cwd, result.path), hash: result.hash } : undefined,
    text: lines,
  }
}
