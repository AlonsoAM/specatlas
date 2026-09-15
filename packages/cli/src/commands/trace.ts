import path from 'node:path'
import { checkTrace } from '@specatlas/core'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runTrace(ctx: CliContext): Promise<CommandResult> {
  const { workspace, config } = await requireWorkspace(ctx)
  const slug = flagString(ctx.flags, 'change')
  const requireEvidence = flagBool(ctx.flags, 'require-evidence') || (config.gates.verify.mode !== 'off' && config.gates.verify.require_evidence !== false)
  const blocking = config.trace.mode === 'blocking'

  const targets = slug ? workspace.changes.filter((c) => c.slug === slug) : workspace.changes
  if (slug && targets.length === 0) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-TRACE-001', severity: 'error', message: `${msg('cli.changeNotFound', ctx.language)}: ${slug}` }] }
  }

  const lines: string[] = [msg('trace.title', ctx.language), '']
  const data: unknown[] = []
  let blockingErrors = 0

  for (const change of targets) {
    const result = checkTrace({ specs: workspace.specs, change, requireEvidence })
    const errors = result.findings.filter((f) => f.severity === 'error').length
    if (blocking) blockingErrors += errors
    data.push({ slug: change.slug, nodes: result.graph.nodes.length, edges: result.graph.edges.length, summary: result.summary, findings: result.findings })
    lines.push(`  ${change.slug}: ${result.graph.nodes.length} nodos, ${result.graph.edges.length} aristas, ${errors} errores, ${result.summary.warnings} avisos`)
    for (const finding of result.findings) {
      const location = finding.path ? ` (${path.relative(ctx.cwd, finding.path)}${finding.line ? `:${finding.line}` : ''})` : ''
      lines.push(`    ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}${location}`)
    }
  }

  if (targets.length === 0) lines.push('Sin cambios activos.')

  const diagnostics = targets.flatMap((change) => checkTrace({ specs: workspace.specs, change, requireEvidence }).findings)

  return { exitCode: blockingErrors > 0 ? 1 : 0, diagnostics, data: { changes: data }, text: lines }
}
