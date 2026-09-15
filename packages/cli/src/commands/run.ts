import {
  appendRunEvent,
  createRun,
  listRuns,
  readRun,
  updateRunStatus,
  type RunStatus,
} from '@specatlas/core'
import { flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

const STATUSES: RunStatus[] = ['active', 'paused', 'completed', 'aborted']

export async function runRun(ctx: CliContext): Promise<CommandResult> {
  const { root } = await requireWorkspace(ctx)
  const action = ctx.positionals[0]

  if (action === 'start') {
    const slug = ctx.positionals[1]
    if (!slug) return usage('satlas run start <slug> [--phase nombre] [--inputs json]')
    const phase = flagString(ctx.flags, 'phase') ?? 'build'
    const inputsRaw = flagString(ctx.flags, 'inputs')
    let inputs: Record<string, unknown> | undefined
    if (inputsRaw) {
      try {
        inputs = JSON.parse(inputsRaw) as Record<string, unknown>
      } catch {
        return { exitCode: 2, diagnostics: [{ code: 'ATLAS-RUN-002', severity: 'error', message: '--inputs no es JSON válido' }] }
      }
    }
    const state = await createRun(root, slug, phase, inputs)
    return { exitCode: 0, diagnostics: [], data: state, text: [`Run iniciado: ${state.runId} (${slug}, fase ${phase})`] }
  }

  if (action === 'event') {
    const [runId, type] = [ctx.positionals[1], ctx.positionals[2]]
    if (!runId || !type) return usage('satlas run event <runId> <tipo> [--data json]')
    const dataRaw = flagString(ctx.flags, 'data')
    let data: Record<string, unknown> | undefined
    if (dataRaw) {
      try {
        data = JSON.parse(dataRaw) as Record<string, unknown>
      } catch {
        return { exitCode: 2, diagnostics: [{ code: 'ATLAS-RUN-002', severity: 'error', message: '--data no es JSON válido' }] }
      }
    }
    const event = await appendRunEvent(root, runId, type, data)
    return { exitCode: 0, diagnostics: [], data: event, text: [`Evento ${type} registrado en ${runId}`] }
  }

  if (action === 'status') {
    const runId = ctx.positionals[1]
    const status = ctx.positionals[2]
    if (!runId || !status || !STATUSES.includes(status as RunStatus)) {
      return usage(`satlas run status <runId> <${STATUSES.join('|')}>`)
    }
    await updateRunStatus(root, runId, status as RunStatus)
    return { exitCode: 0, diagnostics: [], data: { runId, status }, text: [`Run ${runId} → ${status}`] }
  }

  if (action === 'show') {
    const runId = ctx.positionals[1]
    if (!runId) return usage('satlas run show <runId>')
    const { record, diagnostics } = await readRun(root, runId)
    if (!record) return { exitCode: 1, diagnostics, text: [] }
    const lines = [`Run ${record.state.runId}`, '', `  cambio: ${record.state.slug}`, `  fase:   ${record.state.phase}`, `  estado: ${record.state.status}`, `  inicio: ${record.state.startedAt}`, '', `Eventos (${record.events.length}):`]
    for (const event of record.events.slice(-20)) lines.push(`  ${event.at}  ${event.type}${event.data ? `  ${JSON.stringify(event.data)}` : ''}`)
    return { exitCode: 0, diagnostics, data: record, text: lines }
  }

  if (action === 'list' || action === undefined) {
    const slug = flagString(ctx.flags, 'slug')
    const status = flagString(ctx.flags, 'status') as RunStatus | undefined
    const runs = await listRuns(root, { slug, status })
    const lines = ['Runs', '']
    if (runs.length === 0) lines.push('Sin runs registrados.')
    for (const run of runs) lines.push(`  ${run.runId}  ${run.slug.padEnd(24)} ${run.phase.padEnd(10)} ${run.status}`)
    return { exitCode: 0, diagnostics: [], data: { runs }, text: lines }
  }

  return usage('satlas run start|event|status|show|list')
}

function usage(usageText: string): CommandResult {
  return { exitCode: 2, diagnostics: [{ code: 'ATLAS-RUN-000', severity: 'error', message: `Uso: ${usageText}` }] }
}
