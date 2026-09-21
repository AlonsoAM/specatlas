import path from 'node:path'
import { pauseChange, resumeChange } from '@specatlas/core'
import { flagString } from '../args.js'
import { evaluateChange } from '../evaluate.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runPause(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-PAUSE-000', severity: 'error', message: 'Falta el slug: satlas pause <slug> --reason "<motivo>" --by "<nombre>"' }],
    }
  }
  const { root, workspace } = await requireWorkspace(ctx)
  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-PAUSE-000', severity: 'error', message: `No existe el cambio "${slug}"` }] }
  }

  const result = await pauseChange({
    root,
    slug,
    reason: flagString(ctx.flags, 'reason') ?? '',
    by: flagString(ctx.flags, 'by') ?? '',
  })
  if (result.diagnostics.some((d) => d.severity === 'error')) {
    return { exitCode: 1, diagnostics: result.diagnostics }
  }

  const lines = [
    'Cambio pausado',
    '',
    `  cambio: ${slug}`,
    `  motivo: ${result.paused?.reason ?? ''}`,
    `  por:    ${result.paused?.by ?? ''}`,
    `  fecha:  ${result.paused?.at ?? ''}`,
    `  estado: ${path.relative(ctx.cwd, result.path)}`,
    '',
    `Retómalo cuando quieras con \`satlas resume ${slug}\`.`,
  ]
  return { exitCode: 0, diagnostics: [], data: { slug, paused: result.paused }, text: lines }
}

export async function runResume(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-PAUSE-000', severity: 'error', message: 'Falta el slug: satlas resume <slug>' }] }
  }
  const { root, workspace, config, approvals } = await requireWorkspace(ctx)
  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-PAUSE-000', severity: 'error', message: `No existe el cambio "${slug}"` }] }
  }

  const result = await resumeChange(root, slug)
  if (result.diagnostics.some((d) => d.severity === 'error')) {
    return { exitCode: 1, diagnostics: result.diagnostics }
  }
  if (!result.resumed) {
    return { exitCode: 0, diagnostics: result.diagnostics, data: { slug, resumed: false }, text: ['Reanudar', '', `  El cambio "${slug}" no estaba pausado.`] }
  }

  // El estado se deriva de los artefactos: tras quitar la pausa, el siguiente paso es el real.
  const meta = change.meta ? (({ paused: _paused, ...rest }) => rest)(change.meta) : undefined
  const refreshed = await evaluateChange(workspace, config, { ...change, ...(meta ? { meta } : {}) }, approvals)

  const lines = [
    'Cambio reanudado',
    '',
    `  cambio: ${slug}`,
    `  pausado por: ${result.previous?.by ?? ''} — ${result.previous?.reason ?? ''}`,
    '',
    `  siguiente: ${refreshed.state.nextAction.command}`,
    `  ${refreshed.state.nextAction.description}`,
  ]
  return {
    exitCode: 0,
    diagnostics: [],
    data: { slug, resumed: true, previous: result.previous, next: refreshed.state.nextAction },
    text: lines,
  }
}
