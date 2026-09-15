import path from 'node:path'
import { adoptWorkspace } from '@specatlas/core'
import { flagBool, flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { resolveProfilesDir } from '../paths.js'

export async function runAdopt(ctx: CliContext): Promise<CommandResult> {
  const { root } = await requireWorkspace(ctx)
  const domainsFlag = flagString(ctx.flags, 'domains') ?? flagString(ctx.flags, 'domain')
  const domains = domainsFlag
    ? domainsFlag
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter((d) => d.length > 0)
    : undefined
  const profilesDir = await resolveProfilesDir()

  const result = await adoptWorkspace({
    root,
    domains,
    dryRun: flagBool(ctx.flags, 'dry-run'),
    profilesDirs: profilesDir ? [profilesDir] : [],
  })

  const lines: string[] = ['Adopción (brownfield)', '']
  if (result.stack) lines.push(`  stack detectado: ${result.stack.name} (${result.stack.score} puntos)`, '')
  lines.push('  Dominios:')
  for (const domain of result.domains) {
    lines.push(`    ${domain.name.padEnd(18)} ${String(domain.files).padStart(4)} archivos  ${domain.existingSpec ? 'spec existente' : 'spec creada'}`)
  }
  if (result.createdSpecs.length > 0) {
    lines.push('')
    for (const spec of result.createdSpecs) lines.push(`  ${result.dryRun ? '[dry-run] ' : '+ '}${path.relative(ctx.cwd, spec)}`)
  }
  if (result.reportPath && !result.dryRun) {
    lines.push('')
    lines.push(`  Informe: ${path.relative(ctx.cwd, result.reportPath)}`)
  }
  lines.push('')
  lines.push('Siguiente: fase /satlas-adopt por dominio (requisitos AS-IS) y luego:')
  lines.push('  satlas new adopt-<dominio> --domain <dominio>')
  lines.push('  satlas validate --change adopt-<dominio>')
  lines.push('  satlas archive adopt-<dominio> --yes')

  const hasErrors = result.diagnostics.some((d) => d.severity === 'error')
  return {
    exitCode: hasErrors ? 1 : 0,
    diagnostics: result.diagnostics,
    data: {
      domains: result.domains.map((d) => ({ name: d.name, files: d.files, existingSpec: d.existingSpec })),
      createdSpecs: result.createdSpecs.map((s) => path.relative(ctx.cwd, s)),
      reportPath: result.reportPath ? path.relative(ctx.cwd, result.reportPath) : undefined,
      stack: result.stack,
      dryRun: result.dryRun,
    },
    text: lines,
  }
}
