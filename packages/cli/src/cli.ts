import path from 'node:path'
import {
  countBySeverity,
  findWorkspaceRoot,
  loadApprovals,
  loadWorkspace,
  type AtlasConfig,
  type Diagnostic,
  type Language,
  type Workspace,
} from '@specatlas/core'
import { flagBool, flagString, parseArgs, type Flags } from './args.js'
import { CATALOG } from './catalog.js'
import { msg } from './messages.js'
import { cliVersion } from './version.js'
import { runAdapters } from './commands/adapters.js'
import { runAdopt } from './commands/adopt.js'
import { runAnalyzeCommand } from './commands/analyze.js'
import { runApprove } from './commands/approve.js'
import { runArchive } from './commands/archive.js'
import { runCi } from './commands/ci.js'
import { runClarify } from './commands/clarify.js'
import { runDocs } from './commands/docs.js'
import { runProfile } from './commands/profile.js'
import { runDoctorCommand } from './commands/doctor.js'
import { runHash } from './commands/hash.js'
import { runHelp } from './commands/help.js'
import { runInit } from './commands/init.js'
import { runIssue } from './commands/issue.js'
import { runMetrics } from './commands/metrics.js'
import { runMockup } from './commands/mockup.js'
import { runMcp } from './commands/mcp.js'
import { runPacks } from './commands/packs.js'
import { runNew } from './commands/new.js'
import { runNext } from './commands/next.js'
import { runPresentCommand } from './commands/present.js'
import { runRun } from './commands/run.js'
import { runStatus } from './commands/status.js'
import { runTrace } from './commands/trace.js'
import { runUpgrade } from './commands/upgrade.js'
import { runValidate } from './commands/validate.js'
import { runVerify } from './commands/verify.js'
import { runWaves } from './commands/waves.js'

export interface CliContext {
  cwd: string
  json: boolean
  language: Language
  flags: Flags
  positionals: string[]
}

export interface ResolvedWorkspace {
  root: string
  workspace: Workspace
  config: AtlasConfig
  approvals: Map<string, { hash: string; by: string; at: string }>
}

export interface CommandResult {
  exitCode: number
  data?: unknown
  diagnostics: Diagnostic[]
  text?: string[]
}

export type CommandHandler = (ctx: CliContext) => Promise<CommandResult>

const HANDLERS: Record<string, CommandHandler> = {
  init: runInit,
  adopt: runAdopt,
  new: runNew,
  status: runStatus,
  next: runNext,
  validate: runValidate,
  trace: runTrace,
  waves: runWaves,
  doctor: runDoctorCommand,
  clarify: runClarify,
  docs: runDocs,
  upgrade: runUpgrade,
  approve: runApprove,
  issue: runIssue,
  adapters: runAdapters,
  profile: runProfile,
  packs: runPacks,
  hash: runHash,
  verify: runVerify,
  analyze: runAnalyzeCommand,
  mockup: runMockup,
  present: runPresentCommand,
  ci: runCi,
  mcp: runMcp,
  metrics: runMetrics,
  run: runRun,
  archive: runArchive,
  version: async () => ({ exitCode: 0, data: { version: cliVersion() }, diagnostics: [], text: [`specatlas ${cliVersion()}`] }),
  help: (ctx) => runHelp(ctx),
}

export const COMMANDS: Record<string, { description: string; flags: string[]; handler: CommandHandler }> = Object.fromEntries(
  CATALOG.map((spec) => [spec.name, { description: spec.description, flags: spec.flags, handler: HANDLERS[spec.name] as CommandHandler }]),
)

export interface Envelope<T = unknown> {
  schemaVersion: 1
  ok: boolean
  command: string
  data?: T
  warnings: Array<{ code: string; message: string; path?: string; line?: number; suggestion?: string }>
  errors: Array<{ code: string; message: string; path?: string; line?: number; suggestion?: string }>
}

export function toEnvelope(command: string, result: CommandResult): Envelope {
  const warnings = result.diagnostics.filter((d) => d.severity !== 'error').map(stripSeverity)
  const errors = result.diagnostics.filter((d) => d.severity === 'error').map(stripSeverity)
  const envelope: Envelope = {
    schemaVersion: 1,
    ok: result.exitCode === 0 && errors.length === 0,
    command,
    warnings,
    errors,
  }
  if (result.data !== undefined) envelope.data = result.data
  return envelope
}

function stripSeverity(d: Diagnostic): Omit<Diagnostic, 'severity'> {
  const { severity: _severity, ...rest } = d
  return rest
}

export async function requireWorkspace(ctx: CliContext): Promise<ResolvedWorkspace> {
  const root = await findWorkspaceRoot(ctx.cwd)
  if (!root) {
    throw new CliError('ATLAS-WS-001', msg('cli.noWorkspace', ctx.language), 2)
  }
  const { workspace, config } = await loadWorkspace(root)
  const approvals = await loadApprovals(path.join(root, '.sdd'))
  return { root, workspace, config, approvals: approvals.byArtifact }
}

export class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly exitCode = 2,
  ) {
    super(message)
    this.name = 'CliError'
  }
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv)
  const json = flagBool(parsed.flags, 'json')

  if (parsed.flags['version'] === true && parsed.command === undefined) {
    process.stdout.write(`specatlas ${cliVersion()}\n`)
    return 0
  }
  if (parsed.command === undefined || parsed.flags['help'] === true) {
    const command = parsed.command
    const output = await runHelp({ cwd: process.cwd(), json, language: 'es', flags: parsed.flags, positionals: parsed.positionals }, command)
    printResult('help', output, json, 'es')
    return output.exitCode
  }

  const command = COMMANDS[parsed.command]
  if (!command) {
    process.stderr.write(`${msg('cli.unknownCommand', 'es')}: ${parsed.command}. ${msg('cli.helpHint', 'es')}\n`)
    return 2
  }

  const unknownFlags = Object.keys(parsed.flags).filter((f) => !command.flags.includes(f) && f !== 'help' && f !== 'version')
  if (unknownFlags.length > 0) {
    process.stderr.write(`${msg('cli.unknownFlag', 'es')}: --${unknownFlags.join(', --')}\n`)
    return 2
  }

  const ctx: CliContext = {
    cwd: process.cwd(),
    json,
    language: 'es',
    flags: parsed.flags,
    positionals: parsed.positionals,
  }

  try {
    const result = await command.handler(ctx)
    printResult(parsed.command, result, json, ctx.language)
    return result.exitCode
  } catch (err) {
    if (err instanceof CliError) {
      const result: CommandResult = { exitCode: err.exitCode, diagnostics: [{ code: err.code, severity: 'error', message: err.message }], text: [`${err.code}: ${err.message}`] }
      printResult(parsed.command, result, json, ctx.language)
      return err.exitCode
    }
    throw err
  }
}

function printResult(command: string, result: CommandResult, json: boolean, language: Language): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(toEnvelope(command, result), null, 2)}\n`)
    return
  }
  const lines: string[] = [...(result.text ?? [])]
  for (const d of result.diagnostics) {
    const location = d.path ? ` ${path.relative(process.cwd(), d.path)}${d.line ? `:${d.line}` : ''}` : ''
    lines.push(`${d.severity === 'error' ? 'ERROR' : d.severity === 'warning' ? 'AVISO' : 'NOTA'}  ${d.code}${location} — ${d.message}`)
    if (d.suggestion) lines.push(`       ↳ ${d.suggestion}`)
  }
  const counts = countBySeverity(result.diagnostics)
  if (result.diagnostics.length > 0) {
    lines.push(`${counts.errors} ${msg('label.errors', language)}, ${counts.warnings} ${msg('label.warnings', language)}, ${counts.infos} ${msg('label.infos', language)}`)
  }
  if (lines.length > 0) process.stdout.write(`${lines.join('\n')}\n`)
}

export function requestFlag(flags: Flags, key: string): string | undefined {
  return flagString(flags, key)
}
