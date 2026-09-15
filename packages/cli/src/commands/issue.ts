import path from 'node:path'
import {
  approveFromGithub,
  ghAvailable,
  ghAuthStatus,
  issueLabels,
  loadConfig,
  loadChange,
  syncGithubIssue,
  type Diagnostic,
} from '@specatlas/core'
import { flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runIssue(ctx: CliContext): Promise<CommandResult> {
  const action = ctx.positionals[0] ?? 'status'
  const slug = ctx.positionals[1]
  const { root } = await requireWorkspace(ctx)

  if (action === 'sync') {
    if (!slug) {
      return { exitCode: 2, diagnostics: [{ code: 'ATLAS-ISSUE-000', severity: 'error', message: 'Falta el slug: satlas issue sync <slug> [--labels a,b]' }] }
    }
    const labelsFlag = flagString(ctx.flags, 'labels')
    const labels = labelsFlag
      ? labelsFlag
          .split(',')
          .map((label) => label.trim())
          .filter((label) => label !== '')
      : undefined
    const result = await syncGithubIssue(root, slug, labels ? { labels } : {})
    const lines: string[] = ['Issue de GitHub', '']
    if (result.issue) {
      lines.push(`  ${result.created ? 'creado' : 'actualizado'}: #${result.issue.number} ${result.issue.url}`)
      lines.push(`  cambio: ${result.slug}`)
      lines.push('')
      lines.push('La aprobación se puede dar aplicando la etiqueta "spec-approved" en el issue y ejecutando:')
      lines.push(`  satlas approve ${slug} --from-github`)
    }
    const hasErrors = result.diagnostics.some((d) => d.severity === 'error')
    return { exitCode: hasErrors ? 1 : 0, diagnostics: result.diagnostics, data: result, text: lines }
  }

  if (action === 'status') {
    if (!slug) {
      return { exitCode: 2, diagnostics: [{ code: 'ATLAS-ISSUE-000', severity: 'error', message: 'Falta el slug: satlas issue status <slug>' }] }
    }
    const change = await loadChange(root, slug)
    const { config } = await loadConfig(path.join(root, '.sdd'))
    const tracker = change.meta?.tracker
    const lines: string[] = [`Issue de ${slug}`, '']
    if (!tracker || tracker.provider !== 'github') {
      lines.push('  Sin issue vinculado. Créalo con `satlas issue sync ' + slug + '`.')
      return { exitCode: 0, diagnostics: [], data: { slug, linked: false }, text: lines }
    }
    lines.push(`  issue: #${tracker.id}${tracker.url ? ` ${tracker.url}` : ''}`)
    const diagnostics: Diagnostic[] = []
    if (await ghAvailable()) {
      const number = Number.parseInt(tracker.id, 10)
      const { labels, diagnostics: labelDiagnostics } = await issueLabels(root, number)
      diagnostics.push(...labelDiagnostics)
      lines.push(`  etiquetas: ${labels.length > 0 ? labels.join(', ') : '—'}`)
      const required = config.gates.approval_label
      lines.push(`  aprobación (${required}): ${labels.includes(required) ? 'sí' : 'pendiente'}`)
    } else {
      diagnostics.push({ code: 'ATLAS-GH-001', severity: 'warning', message: 'gh no está disponible: estado de etiquetas no verificado' })
    }
    return { exitCode: 0, diagnostics, data: { slug, linked: true, tracker }, text: lines }
  }

  return {
    exitCode: 2,
    diagnostics: [{ code: 'ATLAS-ISSUE-000', severity: 'error', message: `Acción desconocida: ${action}`, suggestion: 'Usa: satlas issue sync <slug> | satlas issue status <slug>' }],
  }
}

export async function runApproveFromGithub(ctx: CliContext, slug: string): Promise<CommandResult> {
  const { root, config } = await requireWorkspace(ctx)
  const result = await approveFromGithub({
    root,
    slug,
    label: flagString(ctx.flags, 'label') ?? config.gates.approval_label,
    by: flagString(ctx.flags, 'by'),
  })
  const lines: string[] = []
  if (result.approved) {
    lines.push(`Aprobación registrada desde GitHub`)
    lines.push('')
    lines.push(`  issue:  #${result.issueNumber}`)
    lines.push(`  etiqueta: ${result.label}`)
    lines.push(`  por:    ${result.approvedBy}`)
    lines.push('')
    lines.push('La firma local quedó registrada con el hash de la spec.')
  }
  const hasErrors = result.diagnostics.some((d) => d.severity === 'error')
  return { exitCode: hasErrors ? 1 : 0, diagnostics: result.diagnostics, data: result, text: lines }
}
