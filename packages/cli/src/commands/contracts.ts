import path from 'node:path'
import { contractCoverage } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runContracts(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-CONTRACTS-000', severity: 'error', message: 'Falta el slug: satlas contracts <slug>' }] }
  }
  const { workspace, config } = await requireWorkspace(ctx)
  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-CONTRACTS-000', severity: 'error', message: `No existe el cambio "${slug}"` }] }
  }

  const lines: string[] = [msg('contracts.title', ctx.language), '']
  const state = change.contracts
  if (!state || state.files.length === 0) {
    lines.push('El cambio no declara contratos (no hay archivos en su carpeta de contratos).')
    return { exitCode: 0, diagnostics: [], data: { slug, mode: config.gates.contracts.mode, contracts: [], findings: [] }, text: lines }
  }

  const coverage = contractCoverage(change, config.gates.contracts.mode)
  const findings = [...state.findings, ...coverage]
  for (const file of state.files) {
    lines.push(`  ${path.relative(ctx.cwd, file.path)} (${file.format}) — ${file.operations.length} operación(es)`)
    for (const operation of file.operations) lines.push(`    ${operation.id}`)
  }
  lines.push('')
  if (findings.length === 0) {
    lines.push('Contratos conformes: forma válida y cobertura completa.')
  } else {
    for (const finding of findings) lines.push(`  ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}`)
  }

  const errors = findings.filter((finding) => finding.severity === 'error').length
  return {
    exitCode: errors > 0 ? 1 : 0,
    diagnostics: findings,
    data: {
      slug,
      mode: config.gates.contracts.mode,
      contracts: state.files.map((file) => ({ path: path.relative(ctx.cwd, file.path), format: file.format, operations: file.operations.map((operation) => operation.id) })),
      findings,
    },
    text: lines,
  }
}
