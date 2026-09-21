import { agentCommand } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runClarify(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-CLARIFY-000', severity: 'error', message: 'Falta el slug: satlas clarify <slug>' }] }
  }
  const { workspace, config } = await requireWorkspace(ctx)
  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-CLARIFY-000', severity: 'error', message: `No existe el cambio "${slug}"` }] }
  }

  const open = change.clarify?.open ?? []
  const resolved = change.clarify?.resolved ?? []
  const mode = config.gates.clarify.mode
  const lines: string[] = [msg('clarify.title', ctx.language), '']
  lines.push(`  ${msg('clarify.mode', ctx.language)}: ${mode}`)
  lines.push(`  ${msg('clarify.open', ctx.language)}: ${open.length}`)
  for (const item of open) lines.push(`    [ ] ${item.text}`)
  lines.push(`  ${msg('clarify.resolved', ctx.language)}: ${resolved.length}`)
  for (const item of resolved) lines.push(`    [x] ${item.text}${item.answer ? ` — ${item.answer}` : ''}`)
  if (open.length > 0) {
    lines.push('')
    lines.push(`Aclara con la fase del agente: ${agentCommand('clarify', slug, config)}`)
  } else if (resolved.length === 0) {
    lines.push('')
    lines.push('El cambio no tiene preguntas abiertas ni aclaraciones registradas.')
  }

  return {
    exitCode: 0,
    diagnostics: [],
    data: {
      slug,
      mode,
      open: open.map((item) => ({ text: item.text, line: item.line })),
      resolved: resolved.map((item) => ({ text: item.text, line: item.line, answer: item.answer })),
      ...(open.length > 0 ? { action: agentCommand('clarify', slug, config) } : {}),
    },
    text: lines,
  }
}
