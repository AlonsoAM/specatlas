import { stateLabel, upgradeAdvisory } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { evaluateChange } from '../evaluate.js'
import { msg } from '../messages.js'

export async function runStatus(ctx: CliContext): Promise<CommandResult> {
  const { root, workspace, config, approvals } = await requireWorkspace(ctx)
  const advisory = await upgradeAdvisory(root)
  const lines: string[] = [msg('status.title', ctx.language), '']
  const changes: unknown[] = []

  if (workspace.changes.length === 0) {
    lines.push('Sin cambios activos. Crea uno con `satlas new <slug>`.')
  }

  for (const change of workspace.changes) {
    const evaluation = await evaluateChange(workspace, config, change, approvals)
    const { state, progress, nextAction } = evaluation.state
    changes.push({
      slug: change.slug,
      lane: change.meta?.lane ?? config.lanes.default,
      domain: change.meta?.domain,
      state,
      label: stateLabel(state),
      next: nextAction.command,
      progress,
      blocking: evaluation.blocking,
    })
    lines.push(
      `  ${change.slug}  ${(change.meta?.domain ?? '-').padEnd(10)} ${(change.meta?.lane ?? config.lanes.default).padEnd(9)} ${stateLabel(state)}`,
    )
    lines.push(
      `    ${msg('status.tasks', ctx.language)} ${progress.tasksDone}/${progress.tasksTotal} · ${msg('status.evidence', ctx.language)} ${progress.scenariosEvidenced}/${progress.scenariosTotal}`,
    )
    lines.push(`    ${msg('status.next', ctx.language)} ${nextAction.command} — ${nextAction.description}`)
  }

  lines.push('')
  lines.push(`${msg('status.specs', ctx.language)}: ${workspace.specs.length}`)
  for (const spec of workspace.specs) {
    lines.push(`  ${spec.domain} — ${spec.spec.requirements.length} requisitos`)
  }

  const diagnostics = [...workspace.diagnostics, ...advisory.diagnostics]
  const errors = diagnostics.filter((d) => d.severity === 'error').length
  return {
    exitCode: errors > 0 ? 1 : 0,
    diagnostics,
    data: {
      changes,
      specs: workspace.specs.map((s) => ({ domain: s.domain, requirements: s.spec.requirements.length })),
      upgrade: {
        currentVersion: advisory.plan.currentVersion,
        pending: advisory.plan.pending.length,
        newer: advisory.plan.newer.length,
        unreadable: advisory.plan.unreadable.length,
      },
    },
    text: lines,
  }
}
