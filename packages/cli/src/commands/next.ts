import { stateLabel } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { evaluateChange } from '../evaluate.js'
import { msg } from '../messages.js'

export async function runNext(ctx: CliContext): Promise<CommandResult> {
  const { workspace, config, approvals } = await requireWorkspace(ctx)
  const slug = ctx.positionals[0]
  const targets = slug ? workspace.changes.filter((c) => c.slug === slug) : workspace.changes

  if (slug && targets.length === 0) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-NEXT-001', severity: 'error', message: `${msg('cli.changeNotFound', ctx.language)}: ${slug}`, suggestion: 'Revisa `satlas status` para ver los cambios activos' }],
    }
  }

  const lines: string[] = [msg('next.title', ctx.language), '']
  const data: unknown[] = []
  let hasErrors = false

  for (const change of targets) {
    const evaluation = await evaluateChange(workspace, config, change, approvals)
    if (evaluation.blocking > 0) hasErrors = true
    const { state, nextAction, blockedBy } = evaluation.state
    lines.push(`  ${change.slug} — ${stateLabel(state)}`)
    lines.push(`    ${msg('status.next', ctx.language)} ${nextAction.command}`)
    lines.push(`    ${nextAction.description}${nextAction.requiresAgent ? ' (requiere agente)' : ''}`)
    for (const block of blockedBy) lines.push(`    bloqueado por: ${block}`)
    lines.push('')
    data.push({ slug: change.slug, state, next: nextAction.command, blockedBy, requiresAgent: nextAction.requiresAgent })
  }

  if (targets.length === 0) lines.push('Sin cambios activos.')

  return { exitCode: hasErrors ? 1 : 0, diagnostics: [], data: { changes: data }, text: lines }
}
