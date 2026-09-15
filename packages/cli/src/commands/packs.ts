import path from 'node:path'
import { BUILTIN_PACKS, evaluatePacks, loadProjectPacks, packFindings, resolvePacks } from '@specatlas/core'
import { flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runPacks(ctx: CliContext): Promise<CommandResult> {
  const { root, config, workspace } = await requireWorkspace(ctx)
  const slug = flagString(ctx.flags, 'check')

  if (!slug) {
    const projectPacks = await loadProjectPacks(workspace.sddDir)
    const active = new Set(config.packs)
    const lines: string[] = ['Packs de cumplimiento', '']
    if (config.packs.length === 0) {
      lines.push('  No hay packs activos. Actívalos en .sdd/config.yaml → packs: [seguridad, datos, auditoria, accesibilidad]')
      lines.push('')
    }
    lines.push('  Pack           Origen    Activo  Controles')
    for (const pack of BUILTIN_PACKS) {
      lines.push(`  ${pack.id.padEnd(14)} integrado ${active.has(pack.id) ? ' sí    ' : ' no    '} ${pack.checks.length}`)
    }
    for (const pack of projectPacks.packs) {
      lines.push(`  ${pack.id.padEnd(14)} proyecto  ${active.has(pack.id) ? ' sí    ' : ' no    '} ${pack.checks.length}`)
    }
    lines.push('')
    lines.push('  Detalle: satlas packs --check <slug> evalúa los packs activos contra un cambio.')
    return { exitCode: 0, diagnostics: projectPacks.diagnostics, data: { builtin: BUILTIN_PACKS.map((p) => p.id), project: projectPacks.packs.map((p) => p.id), active: config.packs }, text: lines }
  }

  const change = workspace.changes.find((candidate) => candidate.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'PACK-002', severity: 'error', message: `No existe el cambio "${slug}"` }] }
  }
  if (config.packs.length === 0) {
    return {
      exitCode: 0,
      diagnostics: [],
      data: { slug, packs: [] },
      text: ['No hay packs activos en .sdd/config.yaml (packs: [...]).'],
    }
  }

  const resolved = await resolvePacks(workspace.sddDir, config)
  const evaluations = evaluatePacks(resolved.packs, change, config)
  const diagnostics = [...resolved.diagnostics, ...packFindings(evaluations, change)]
  const lines: string[] = [`Cumplimiento — ${slug}`, '']
  for (const evaluation of evaluations) {
    const icon = evaluation.status === 'ok' ? 'OK  ' : evaluation.status === 'n/a' ? 'N/A ' : 'FALLA'
    lines.push(`  ${icon} ${evaluation.pack.title} (\`${evaluation.pack.id}\`) — ${evaluation.passed} ok · ${evaluation.failed} falla`)
    for (const result of evaluation.results) {
      if (result.status === 'n/a') continue
      lines.push(`      ${result.status === 'ok' ? '✓' : '✕'} ${result.checkId} ${result.title}${result.message ? ` — ${result.message}` : ''}`)
    }
  }
  const failing = evaluations.filter((evaluation) => evaluation.status === 'fail').length
  lines.push('')
  lines.push(failing === 0 ? 'Todos los packs activos cumplen.' : `${failing} pack(s) con fallas.`)

  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error')
  void root
  return {
    exitCode: hasErrors ? 1 : 0,
    diagnostics,
    data: {
      slug,
      packs: evaluations.map((evaluation) => ({ id: evaluation.pack.id, status: evaluation.status, passed: evaluation.passed, failed: evaluation.failed, results: evaluation.results })),
      analyzePath: path.posix.join('.sdd', 'changes', slug, 'analyze.md'),
    },
    text: lines,
  }
}
