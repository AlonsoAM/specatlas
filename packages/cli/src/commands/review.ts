import path from 'node:path'
import { agentCommand, exists, openBlockingFindings, renderTemplate, reviewPassed, templatesFor, writeText } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runReview(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-REVIEW-000', severity: 'error', message: 'Falta el slug: satlas review <slug>' }] }
  }
  const { workspace, config } = await requireWorkspace(ctx)
  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-REVIEW-000', severity: 'error', message: `No existe el cambio "${slug}"` }] }
  }

  const mode = config.gates.review.mode
  const reviewFile = path.join(change.dir, 'review.md')

  // Sin review.md, el comando deja el esqueleto listo: revisar sigue siendo la fase del agente.
  if (!(await exists(reviewFile))) {
    const templates = templatesFor(config.project.language)
    await writeText(reviewFile, renderTemplate(templates.review, { TITLE: change.meta?.title ?? slug, SLUG: slug }))
    const lines = [
      'Revisión del cambio',
      '',
      `  modo: ${mode}`,
      `  creado: ${path.relative(ctx.cwd, reviewFile)}`,
      '',
      `Revisa el código con la fase del agente: ${agentCommand('review', slug, config)}`,
      'Al cerrar, deja `- resultado: pass` en el veredicto y marca los hallazgos resueltos.',
    ]
    return { exitCode: 0, diagnostics: [], data: { slug, mode, created: true, verdict: 'pending' }, text: lines }
  }

  const review = change.review
  const blocking = review ? openBlockingFindings(review) : []
  const open = review ? review.findings.filter((finding) => !finding.resolved) : []
  const passed = reviewPassed(review)

  const lines: string[] = ['Revisión del cambio', '']
  lines.push(`  modo: ${mode}`)
  lines.push(`  archivo: ${path.relative(ctx.cwd, reviewFile)}`)
  lines.push(`  resultado: ${review?.verdict ?? 'pendiente'}${review?.by ? ` · por ${review.by}` : ''}${review?.date ? ` · ${review.date}` : ''}`)
  lines.push(`  hallazgos: ${review?.findings.length ?? 0} (${open.length} sin resolver, ${blocking.length} bloqueante(s))`)

  if (open.length > 0) {
    lines.push('')
    for (const finding of open) {
      lines.push(`  [ ] (${finding.severity}) ${finding.text}${finding.location ? ` · ${finding.location}` : ''}`)
    }
  }

  lines.push('')
  if (passed) {
    lines.push('  La revisión está cerrada: resultado favorable y sin hallazgos bloqueantes.')
  } else if (blocking.length > 0) {
    lines.push(`  La revisión no está cerrada: quedan ${blocking.length} hallazgo(s) bloqueante(s).`)
  } else {
    lines.push('  La revisión no está cerrada: falta el resultado favorable (`- resultado: pass`).')
  }
  if (!passed && mode === 'blocking') lines.push('  Con el gate en bloqueante, el cambio no avanza hasta cerrarla.')

  const diagnostics = review?.diagnostics ?? []
  return {
    exitCode: !passed && mode === 'blocking' ? 1 : 0,
    diagnostics,
    data: {
      slug,
      mode,
      verdict: review?.verdict ?? 'pending',
      passed,
      findings: (review?.findings ?? []).map((finding) => ({ text: finding.text, severity: finding.severity, resolved: finding.resolved, line: finding.line, location: finding.location })),
    },
    text: lines,
  }
}
