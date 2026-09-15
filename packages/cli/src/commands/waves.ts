import { planWaves } from '@specatlas/core'
import { flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runWaves(ctx: CliContext): Promise<CommandResult> {
  const { workspace, config } = await requireWorkspace(ctx)
  const slug = flagString(ctx.flags, 'change') ?? (workspace.changes.length === 1 ? workspace.changes[0]?.slug : undefined)
  const maxParallelFlag = flagString(ctx.flags, 'max-parallel')
  const maxParallel = maxParallelFlag ? Number.parseInt(maxParallelFlag, 10) : config.waves.max_parallel

  if (!slug) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-WAVES-001', severity: 'error', message: 'Indica el cambio con --change <slug>', suggestion: `Cambios activos: ${workspace.changes.map((c) => c.slug).join(', ') || '(ninguno)'}` }],
    }
  }

  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-WAVES-002', severity: 'error', message: `${msg('cli.changeNotFound', ctx.language)}: ${slug}` }] }
  }
  if (!change.tasks || change.tasks.counts.total === 0) {
    return { exitCode: 0, diagnostics: [], data: { slug, blocks: [] }, text: [`${msg('waves.title', ctx.language)}\n\nEl cambio ${slug} no tiene tareas todavía.`] }
  }

  const plan = planWaves(change.tasks, { maxParallel })
  const lines: string[] = [msg('waves.title', ctx.language), '']
  for (const block of plan.blocks) {
    lines.push(`  Bloque ${block.block} — ${block.title}`)
    block.waves.forEach((wave, i) => {
      lines.push(`    ola ${i + 1}: ${wave.map((t) => t.id).join(', ')}`)
    })
    for (const d of block.degraded) {
      lines.push(`    degradada: ${d.task} (${d.reason === 'file-collision' ? 'colisión de archivos' : 'dependencia huérfana'})${d.movedToWave ? ` → ola ${d.movedToWave}` : ''}`)
    }
  }
  lines.push('')
  lines.push(`Resumen: ${plan.summary.blocks} bloque(s), ${plan.summary.waves} ola(s), ${plan.summary.tasks} tarea(s), máx. paralelo ${plan.maxParallel}`)

  const diagnostics = plan.blocks.flatMap((b) => b.diagnostics)
  const errors = diagnostics.filter((d) => d.severity === 'error').length
  return { exitCode: errors > 0 ? 1 : 0, diagnostics, data: plan, text: lines }
}
