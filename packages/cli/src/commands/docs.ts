import path from 'node:path'
import { generateDocs, type DocsTipo } from '@specatlas/core'
import { flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runDocs(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-DOCS-000', severity: 'error', message: 'Falta el slug: satlas docs <slug> [--tipo tecnica|manual|all]' }] }
  }
  const { root } = await requireWorkspace(ctx)
  const tipoFlag = flagString(ctx.flags, 'tipo')
  const tipo: DocsTipo = tipoFlag === 'tecnica' || tipoFlag === 'manual' || tipoFlag === 'all' ? tipoFlag : 'all'

  const result = await generateDocs({ root, slug, tipo })
  const errors = result.diagnostics.filter((d) => d.severity === 'error')
  const warnings = result.diagnostics.filter((d) => d.severity === 'warning')
  const lines: string[] = [msg('docs.title', ctx.language), '']
  for (const file of result.files) {
    lines.push(`  ${file.created ? msg('docs.created', ctx.language) : msg('docs.updated', ctx.language)}: ${path.relative(ctx.cwd, file.path)}`)
    if (file.htmlPath) lines.push(`    html: ${path.relative(ctx.cwd, file.htmlPath)}`)
    if (file.pdfPath) lines.push(`    pdf:  ${path.relative(ctx.cwd, file.pdfPath)}`)
  }
  for (const warning of warnings) lines.push(`  AVISO ${warning.code} — ${warning.message}`)
  for (const error of errors) lines.push(`  ERROR ${error.code} — ${error.message}`)

  return {
    exitCode: errors.length > 0 ? 2 : 0,
    diagnostics: result.diagnostics,
    data: {
      slug: result.slug,
      tipo,
      files: result.files.map((file) => ({
        tipo: file.tipo,
        path: path.relative(ctx.cwd, file.path),
        created: file.created,
        html: file.htmlPath ? path.relative(ctx.cwd, file.htmlPath) : undefined,
        pdf: file.pdfPath ? path.relative(ctx.cwd, file.pdfPath) : undefined,
      })),
    },
    text: lines,
  }
}
