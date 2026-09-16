import path from 'node:path'
import { archiveChange } from '@specatlas/core'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runArchive(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-ARCHIVE-000', severity: 'error', message: `${msg('cli.changeRequired', ctx.language)}: satlas archive <slug> --yes` }] }
  }
  const { root, config } = await requireWorkspace(ctx)
  const dryRun = flagBool(ctx.flags, 'dry-run')
  const yes = flagBool(ctx.flags, 'yes')
  if (!dryRun && !yes) {
    return {
      exitCode: 2,
      diagnostics: [
        {
          code: 'ATLAS-ARCHIVE-001',
          severity: 'warning',
          message: `Confirmación requerida: archivar "${slug}" pliega sus deltas en la spec viva y mueve el cambio al histórico.`,
          suggestion: `Revisa primero con \`satlas archive ${slug} --dry-run\` y confirma con \`satlas archive ${slug} --yes\``,
        },
      ],
    }
  }

  const result = await archiveChange({ root, slug, language: config.project.language, dryRun })
  const lines: string[] = [msg('archive.title', ctx.language), '']
  if (result.fold.applied.added.length + result.fold.applied.modified.length + result.fold.applied.removed.length + result.fold.applied.renamed.length > 0) {
    lines.push(`${dryRun ? '[dry-run] ' : ''}${msg('archive.done', ctx.language)}`)
    lines.push(`  agregados: ${result.fold.applied.added.join(', ') || '—'}`)
    lines.push(`  modificados: ${result.fold.applied.modified.join(', ') || '—'}`)
    lines.push(`  eliminados: ${result.fold.applied.removed.join(', ') || '—'}`)
    lines.push(`  renombrados: ${result.fold.applied.renamed.join(', ') || '—'}`)
    if (result.archivedTo) lines.push(`  archivado en: ${path.relative(ctx.cwd, result.archivedTo)}`)
  } else {
    lines.push('El delta no contiene operaciones (ADDED/MODIFIED/REMOVED/RENAMED).')
  }

  const hasErrors = result.diagnostics.some((d) => d.severity === 'error')
  return {
    exitCode: hasErrors ? 1 : 0,
    diagnostics: result.diagnostics,
    data: { slug: result.slug, domain: result.domain, archivedTo: result.archivedTo, applied: result.fold.applied, dryRun: result.dryRun },
    text: lines,
  }
}
