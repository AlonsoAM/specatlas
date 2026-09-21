import { amendChange } from '@specatlas/core'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runAmend(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-AMEND-000', severity: 'error', message: 'Falta el slug: satlas amend <slug> --reason "<motivo>" --by "<nombre>"' }],
    }
  }
  const { root } = await requireWorkspace(ctx)
  const dryRun = flagBool(ctx.flags, 'dry-run')

  const result = await amendChange({
    root,
    slug,
    reason: flagString(ctx.flags, 'reason') ?? '',
    by: flagString(ctx.flags, 'by') ?? '',
    dryRun,
  })

  if (result.diagnostics.some((d) => d.severity === 'error')) {
    return { exitCode: 1, diagnostics: result.diagnostics }
  }
  if (result.unchanged) {
    return { exitCode: 0, diagnostics: result.diagnostics, data: { slug, unchanged: true }, text: ['Enmienda', '', `  La especificación de "${slug}" no cambió desde su firma.`] }
  }

  const amendment = result.amendment
  const lines = [
    dryRun ? 'Enmienda (simulación)' : 'Enmienda registrada',
    '',
    `  cambio: ${slug}`,
    `  motivo: ${amendment?.reason ?? ''}`,
    `  por:    ${amendment?.by ?? ''}`,
    `  fecha:  ${amendment?.at ?? ''}`,
    `  huella: ${(amendment?.from ?? '').slice(0, 20)}… → ${(amendment?.to ?? '').slice(0, 20)}…`,
    '',
    'La revisión queda firmada y el historial de enmiendas vive en meta.yaml.',
    'Revisa el plan y las tareas: un cambio de alcance puede dejarlos desalineados.',
  ]
  return { exitCode: 0, diagnostics: result.diagnostics, data: { slug, amendment: result.amendment, approval: result.approval, dryRun }, text: lines }
}
