import path from 'node:path'
import {
  loadActiveProfile,
  recordEvidence,
  type EvidenceMethod,
  type EvidenceResult,
} from '@specatlas/core'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { resolveProfilesDir } from '../paths.js'

export async function runVerify(ctx: CliContext): Promise<CommandResult> {
  const { root, workspace } = await requireWorkspace(ctx)
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-VERIFY-000', severity: 'error', message: 'Falta el slug: satlas verify <slug> [--scenario REQ-…-S1 --command "…"]' }] }
  }
  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-VERIFY-000', severity: 'error', message: `No existe el cambio "${slug}"` }] }
  }

  const fileKind = flagString(ctx.flags, 'file') === 'fix' ? 'fix' : 'verify'
  const scenario = flagString(ctx.flags, 'scenario')
  const methodFlag = flagString(ctx.flags, 'method')
  const resultFlag = flagString(ctx.flags, 'result')
  const command = flagString(ctx.flags, 'command')
  const by = flagString(ctx.flags, 'by') ?? change.meta?.owner ?? process.env['SPECATLAS_BY']
  const notes = flagString(ctx.flags, 'notes')

  if (!scenario) {
    const evidence = fileKind === 'fix' ? (change.fix?.evidence ?? []) : (change.verify?.evidence ?? [])
    const passed = new Map(evidence.map((e) => [e.scenario, e.result]))
    const scenarios =
      fileKind === 'fix'
        ? [...new Set(evidence.map((e) => e.scenario))]
        : [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])].flatMap((r) => r.scenarios.map((s) => ({ id: s.id, title: s.title })))
    const lines = [`Verificación — ${slug}`, '']
    let gaps = 0
    if (scenarios.length === 0) {
      lines.push(fileKind === 'fix' ? 'El fix no declara escenarios; registra evidencia con --scenario.' : 'El cambio no tiene escenarios en el delta.')
    }
    for (const item of scenarios) {
      const id = typeof item === 'string' ? item : item.id
      const title = typeof item === 'string' ? '' : item.title
      const status = passed.get(id) ?? 'pendiente'
      if (status !== 'pass') gaps += 1
      lines.push(`  ${id}  ${status}${title ? ` — ${title}` : ''}`)
    }
    lines.push('')
    lines.push(gaps === 0 ? 'Todos los escenarios tienen evidencia pass.' : `${gaps} escenario(s) sin evidencia pass.`)
    lines.push('Ejemplo: satlas verify ' + slug + ' --scenario REQ-DOMINIO-001-S1 --command "npm test" --by "<nombre>"')
    return { exitCode: gaps > 0 ? 1 : 0, diagnostics: [], data: { slug, file: fileKind, gaps, evidence }, text: lines }
  }

  if (!by) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-VERIFY-001', severity: 'error', message: 'Falta --by <nombre> (o define meta.owner)' }] }
  }

  const profilesDir = await resolveProfilesDir()
  const profile = await loadActiveProfile(path.join(root, '.sdd'), [profilesDir ?? '', path.join(root, '.sdd', 'profiles', 'custom')].filter(Boolean))
  const record = await recordEvidence({
    root,
    slug,
    scenario,
    command,
    method: methodFlag as EvidenceMethod | undefined,
    result: resultFlag as EvidenceResult | undefined,
    by,
    notes,
    allowCommand: flagBool(ctx.flags, 'allow-command'),
    allowedPrefixes: profile?.verify.executable ?? [],
    file: fileKind,
  })

  const lines: string[] = []
  if (record.evidence) {
    lines.push(`Evidencia registrada — ${record.evidence.scenario}`)
    lines.push('')
    lines.push(`  método:  ${record.evidence.method}`)
    if (record.evidence.command) lines.push(`  comando: ${record.evidence.command}`)
    lines.push(`  resultado: ${record.evidence.result}`)
    if (record.evidence.outputHash) lines.push(`  hash:    ${record.evidence.outputHash}`)
    lines.push(`  archivo: ${path.relative(ctx.cwd, record.path)}`)
    if (record.stdout) {
      lines.push('')
      lines.push('  salida (últimas líneas):')
      for (const line of record.stdout.trimEnd().split('\n').slice(-5)) lines.push(`    ${line}`)
    }
    if (record.stderr) {
      lines.push('')
      lines.push('  stderr (últimas líneas):')
      for (const line of record.stderr.trimEnd().split('\n').slice(-5)) lines.push(`    ${line}`)
    }
  }

  return {
    exitCode: record.exitCode === 0 ? 0 : 1,
    diagnostics: record.diagnostics,
    data: { evidence: record.evidence, path: path.relative(ctx.cwd, record.path), exitCode: record.exitCode },
    text: lines,
  }
}
