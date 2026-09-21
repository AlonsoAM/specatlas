import { stateLabel } from '@specatlas/core'
import { flagBool } from '../args.js'
import { COMMANDS, requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { evaluateChange } from '../evaluate.js'
import { msg } from '../messages.js'
import { runNextAction } from '../run-next.js'
import { detectarTema, encabezado, filaAlineada, pinta, siguienteAccion, simbolos } from '../ui.js'

export async function runNext(ctx: CliContext): Promise<CommandResult> {
  const { workspace, config, approvals } = await requireWorkspace(ctx)
  const slug = ctx.positionals[0]
  const targets = slug ? workspace.changes.filter((c) => c.slug === slug) : workspace.changes

  if (slug && targets.length === 0) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-NEXT-001', severity: 'error', message: `${msg('cli.changeNotFound', ctx.language)}: ${slug}`, suggestion: 'Revisa `satlas status` para ver los cambios activos' }],
    }
  }

  const run = flagBool(ctx.flags, 'run')
  if (run) {
    const change = targets[0]
    if (!change) {
      return { exitCode: 0, diagnostics: [], data: { changes: [] }, text: [msg('next.title', ctx.language), '', 'Sin cambios activos.'] }
    }
    if (targets.length > 1) {
      return {
        exitCode: 2,
        diagnostics: [
          {
            code: 'ATLAS-NEXT-002',
            severity: 'error',
            message: `Hay ${targets.length} cambios activos: di cuál ejecutar`,
            suggestion: `satlas next <slug> --run (${targets.map((c) => c.slug).join(', ')})`,
          },
        ],
      }
    }
    const evaluation = await evaluateChange(workspace, config, change, approvals)
    const action = evaluation.state.nextAction
    const handlers = Object.fromEntries(Object.entries(COMMANDS).map(([name, entry]) => [name, entry.handler]))
    const outcome = await runNextAction(ctx, action, config, handlers)
    if (!outcome.ran) {
      return {
        exitCode: 0,
        diagnostics: [],
        data: { slug: change.slug, next: action.command, ran: false, reason: outcome.reason },
        text: [msg('next.title', ctx.language), '', `  ${change.slug} — ${stateLabel(evaluation.state.state)}`, `    ${msg('status.next', ctx.language)} ${action.command}`, '', `  ${outcome.reason ?? ''}`],
      }
    }
    if (!outcome.result) {
      return { exitCode: 0, diagnostics: [], data: { slug: change.slug, next: action.command, ran: true }, text: [] }
    }
    return {
      ...outcome.result,
      text: [`▶ ${action.command}`, '', ...(outcome.result.text ?? [])],
    }
  }

  const tema = detectarTema()
  const s = simbolos(tema)
  const lines: string[] = encabezado(tema, msg('next.title', ctx.language))
  const data: unknown[] = []
  let hasErrors = false

  for (const change of targets) {
    const evaluation = await evaluateChange(workspace, config, change, approvals)
    if (evaluation.blocking > 0) hasErrors = true
    const { state, nextAction, blockedBy } = evaluation.state
    const actor = nextAction.requiresAgent
      ? pinta(tema, 'azul', 'con agente')
      : /^satlas (approve|archive|amend|pause|resume)/.test(nextAction.command)
        ? pinta(tema, 'morado', 'humana')
        : pinta(tema, 'verde', 'local')

    lines.push(
      filaAlineada([
        { texto: `  ${pinta(tema, 'negrita', change.slug)}`, ancho: 30 },
        { texto: pinta(tema, 'gris', stateLabel(state)) },
      ]),
    )
    lines.push(...siguienteAccion(tema, nextAction.command, `${nextAction.description}  ${s.separador}  ${actor}`))
    for (const block of blockedBy) lines.push(`      ${pinta(tema, 'amarillo', s.bloqueo)} ${pinta(tema, 'gris', block)}`)
    lines.push('')
    data.push({ slug: change.slug, state, next: nextAction.command, blockedBy, requiresAgent: nextAction.requiresAgent })
  }

  if (targets.length === 0) lines.push(pinta(tema, 'gris', '  Sin cambios activos.'))

  return { exitCode: hasErrors ? 1 : 0, diagnostics: [], data: { changes: data }, text: lines }
}
