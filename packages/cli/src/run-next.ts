import { spawn } from 'node:child_process'
import { agentCli, primaryTarget, type AtlasConfig } from '@specatlas/core'
import { parseArgs } from './args.js'
import type { CliContext, CommandResult } from './cli.js'

/** Acciones que decide una persona: nunca se disparan solas. */
const HUMAN = [/^satlas approve\b/, /^satlas archive\b/, /^satlas amend\b/, /^satlas pause\b/, /^satlas resume\b/]

export function isHumanAction(command: string): boolean {
  return HUMAN.some((re) => re.test(command.trim()))
}

/** Separa una instrucción en tokens respetando lo que va entre comillas. */
export function tokenize(command: string): string[] {
  const out: string[] = []
  let current = ''
  let quote: '"' | "'" | undefined
  for (const char of command.trim()) {
    if (quote) {
      if (char === quote) quote = undefined
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current.length > 0) out.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current.length > 0) out.push(current)
  return out
}

export interface RunNextOutcome {
  ran: boolean
  reason?: string
  result?: CommandResult
}

/**
 * Ejecuta la siguiente acción: el comando determinista se corre aquí mismo, la
 * fase del agente abre el asistente configurado, y lo que decide una persona
 * (aprobar, archivar, enmendar, pausar) se explica en vez de dispararse.
 */
export async function runNextAction(
  ctx: CliContext,
  action: { command: string; requiresAgent: boolean },
  config: AtlasConfig,
  handlers: Record<string, (ctx: CliContext) => Promise<CommandResult>>,
): Promise<RunNextOutcome> {
  if (action.requiresAgent) {
    const cli = agentCli(primaryTarget(config))
    const child = spawn(cli, [action.command], { cwd: ctx.cwd, stdio: 'inherit', shell: true })
    const code = await new Promise<number>((resolve) => {
      child.on('error', () => resolve(-1))
      child.on('close', (status) => resolve(status ?? 0))
    })
    if (code === -1) {
      return { ran: false, reason: `No se pudo abrir "${cli}". Copia la instrucción y ejecútala en tu asistente: ${action.command}` }
    }
    return { ran: true }
  }

  if (isHumanAction(action.command)) {
    return { ran: false, reason: `"${action.command}" es un acto humano y se registra con nombre: ejecútalo tú cuando corresponda.` }
  }

  const tokens = tokenize(action.command)
  if (tokens[0] !== 'satlas' && tokens[0] !== 'specatlas') {
    return { ran: false, reason: `No sé ejecutar "${action.command}" por mi cuenta.` }
  }
  const parsed = parseArgs(tokens.slice(1))
  const handler = parsed.command ? handlers[parsed.command] : undefined
  if (!handler) {
    return { ran: false, reason: `No hay un comando "${parsed.command ?? ''}" que ejecutar.` }
  }

  const result = await handler({ ...ctx, flags: { ...parsed.flags, ...(ctx.json ? { json: true } : {}) }, positionals: parsed.positionals })
  return { ran: true, result }
}
