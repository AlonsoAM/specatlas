import path from 'node:path'
import { lintSpec, upgradeAdvisory, type Diagnostic } from '@specatlas/core'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { evaluateChange } from '../evaluate.js'
import { msg } from '../messages.js'

export async function runValidate(ctx: CliContext): Promise<CommandResult> {
  const { root, workspace, config, approvals } = await requireWorkspace(ctx)
  const slug = flagString(ctx.flags, 'change')
  const strict = flagBool(ctx.flags, 'strict')
  const advisory = slug ? undefined : await upgradeAdvisory(root)

  const diagnostics: Diagnostic[] = []
  const lines: string[] = [msg('validate.title', ctx.language), '']

  for (const spec of workspace.specs) {
    diagnostics.push(...lintSpec(spec.spec, { language: config.spec.language, businessOnly: config.spec.business_only }))
  }

  const targets = slug ? workspace.changes.filter((c) => c.slug === slug) : workspace.changes
  if (slug && targets.length === 0) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-VALIDATE-001', severity: 'error', message: `${msg('cli.changeNotFound', ctx.language)}: ${slug}` }],
    }
  }

  const changes: unknown[] = []
  for (const change of targets) {
    const evaluation = await evaluateChange(workspace, config, change, approvals)
    diagnostics.push(...evaluation.lintFindings)
    changes.push({ slug: change.slug, blocking: evaluation.blocking, findings: evaluation.lintFindings.length })
    lines.push(`  ${change.slug}: ${evaluation.lintFindings.length} ${msg('summary.findings', ctx.language)}`)
    for (const finding of evaluation.lintFindings) {
      lines.push(`    ${finding.severity.toUpperCase()} ${finding.code}${finding.line ? `:${finding.line}` : ''} — ${finding.message}`)
    }
    lines.push(`    archivo: ${path.relative(ctx.cwd, path.join(change.dir, 'spec.md'))}`)
  }

  if (targets.length === 0) lines.push('Sin cambios activos.')
  if (advisory && advisory.plan.pending.length > 0) {
    lines.push(`Actualización pendiente: ${advisory.plan.pending.length} elemento(s) (vista previa: \`satlas upgrade\`).`)
  }

  const errors = diagnostics.filter((d) => d.severity === 'error').length
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length
  if (errors === 0 && warnings === 0) lines.push(msg('validate.ok', ctx.language))

  return {
    exitCode: errors > 0 || (strict && warnings > 0) ? 1 : 0,
    diagnostics: advisory ? [...diagnostics, ...advisory.diagnostics] : diagnostics,
    data: {
      changes,
      errors,
      warnings,
      upgrade: advisory
        ? {
            currentVersion: advisory.plan.currentVersion,
            pending: advisory.plan.pending.length,
            newer: advisory.plan.newer.length,
            unreadable: advisory.plan.unreadable.length,
          }
        : undefined,
    },
    text: lines,
  }
}
