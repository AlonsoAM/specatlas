import path from 'node:path'
import { agentCommand, mockupsReady, requiresMockups, signApproval } from '@specatlas/core'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { runApproveFromGithub } from './issue.js'

export async function runApprove(ctx: CliContext): Promise<CommandResult> {
  const target = ctx.positionals[0]

  if (flagBool(ctx.flags, 'from-github')) {
    if (!target) {
      return { exitCode: 2, diagnostics: [{ code: 'ATLAS-APPROVE-000', severity: 'error', message: 'Falta el slug: satlas approve <slug> --from-github' }] }
    }
    return runApproveFromGithub(ctx, target)
  }

  const by = flagString(ctx.flags, 'by')
  if (!target) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-APPROVE-000', severity: 'error', message: 'Indica qué aprobar: un slug de cambio o una ruta a un artefacto', suggestion: 'satlas approve changes/reset-password/spec.md --by "Nombre Apellido"' }],
    }
  }
  if (!by) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-APPROVE-000', severity: 'error', message: 'Falta --by <nombre>: toda aprobación es nominal y auditada' }],
    }
  }

  const { root, workspace, config } = await requireWorkspace(ctx)
  const artifact = target.includes('/') || target.includes('\\') ? target : path.join('changes', target, 'spec.md')
  const channelFlag = flagString(ctx.flags, 'channel')
  const channel = channelFlag === 'presentation' || channelFlag === 'editor' || channelFlag === 'pr' || channelFlag === 'tracker' ? channelFlag : 'cli'

  const change = workspace.changes.find(
    (candidate) => candidate.slug === target || artifact.includes(`changes/${candidate.slug}/`) || artifact.includes(`changes\\${candidate.slug}\\`),
  )
  if (
    change &&
    requiresMockups(change.meta, config) &&
    !(change.meta?.overrides ?? []).some((override) => override.gate === 'mockup') &&
    !(await mockupsReady(root, change.slug, change))
  ) {
    return {
      exitCode: 1,
      diagnostics: [
        {
          code: 'ATLAS-APPROVE-002',
          severity: 'error',
          message: `El cambio "${change.slug}" exige mockups (meta.yaml: mockups: required) y no están listos`,
          suggestion: `Genera el contrato visual con \`${agentCommand('mockup', change.slug, config)}\` y vuelve a aprobar (o registra un override del gate "mockup" en meta.yaml)`,
        },
      ],
    }
  }

  const result = await signApproval({
    root,
    artifact,
    by,
    channel,
    note: flagString(ctx.flags, 'note'),
    dryRun: flagBool(ctx.flags, 'dry-run'),
  })

  const lines: string[] = []
  if (result.approval) {
    lines.push(`Aprobación registrada${flagBool(ctx.flags, 'dry-run') ? ' (dry-run)' : ''}`)
    lines.push(`  artefacto: ${result.approval.artifact}`)
    lines.push(`  hash:      ${result.approval.artifactHash.slice(0, 19)}…`)
    lines.push(`  por:       ${result.approval.approvedBy} (${result.approval.channel})`)
    lines.push(`  fecha:     ${result.approval.approvedAt}`)
    lines.push('')
    lines.push('La firma desbloquea el plan. Si el artefacto cambia, la firma queda obsoleta automáticamente.')
  }
  const hasErrors = result.diagnostics.some((d) => d.severity === 'error')
  return {
    exitCode: hasErrors ? 1 : 0,
    diagnostics: result.diagnostics,
    data: result.approval ? { ...result.approval, file: path.relative(ctx.cwd, result.file) } : undefined,
    text: lines,
  }
}
