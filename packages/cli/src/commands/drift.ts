import path from 'node:path'
import { checkDrift, loadAllAnchors, pruneAnchors } from '@specatlas/core'
import { flagBool } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runDrift(ctx: CliContext): Promise<CommandResult> {
  const { root, config } = await requireWorkspace(ctx)
  const anchors = await loadAllAnchors(root)
  const report = await checkDrift({ root, config, anchors })

  if (flagBool(ctx.flags, 'prune') && report.drifted.length > 0) {
    const pruned = await pruneAnchors(root, report.drifted, anchors, config.project.language)
    const removed = pruned.reduce((total, entry) => total + entry.removed.length, 0)
    const lines = ['Anclas depuradas', '', `  anclas retiradas: ${removed}`]
    for (const entry of pruned) {
      for (const item of entry.removed) lines.push(`  ${entry.domain} · ${item.requirement} — ${item.anchor}`)
    }
    lines.push('')
    lines.push('Si lo que cambió no fue la ruta sino el comportamiento, especifícalo con un cambio.')
    return { exitCode: 0, diagnostics: [], data: { pruned, removed }, text: lines }
  }

  const errors = report.findings.filter((d) => d.severity === 'error').length
  const lines: string[] = ['Anclas y deriva del código', '']
  lines.push(`  modo: ${report.mode === 'strict' ? 'estricto (bloquea)' : 'aviso'}`)
  lines.push(`  dominios con anclas: ${report.domains}`)
  lines.push(`  anclas comprobadas: ${report.checked}`)
  lines.push(`  anclas rotas: ${report.drifted.length}`)

  if (report.checked === 0) {
    lines.push('')
    lines.push('  Ninguna spec viva declara dónde vive en el código.')
    lines.push('  Las anclas se registran solas al archivar un cambio (desde los `Archivos:` de sus tareas)')
    lines.push('  y se pueden escribir a mano en `.sdd/specs/<dominio>/anchors.yaml`.')
  } else if (report.drifted.length === 0) {
    lines.push('')
    lines.push('  Las specs vivas y el código siguen de acuerdo.')
  } else {
    lines.push('')
    for (const item of report.drifted) {
      const motivo = item.kind === 'missing-file' ? 'el archivo ya no existe' : 'el símbolo ya no está'
      lines.push(`  ${item.domain} · ${item.requirement} — ${item.anchor} (${motivo})`)
    }
  }

  return {
    exitCode: errors > 0 ? 1 : 0,
    diagnostics: report.findings,
    data: {
      mode: report.mode,
      domains: report.domains,
      checked: report.checked,
      drifted: report.drifted.map((item) => ({ ...item, specPath: path.relative(ctx.cwd, item.specPath) })),
    },
    text: lines,
  }
}
