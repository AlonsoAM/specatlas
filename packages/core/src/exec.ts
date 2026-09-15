import { execFile } from 'node:child_process'

export interface ExecResult {
  ok: boolean
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  command: string
  resolvedBinary: string
}

export interface ExecOptions {
  cwd?: string
  timeoutMs?: number
  maxBytes?: number
  input?: string
}

const SHELL_META = /[;&|<>`$()\r\n]|[%!^]|&&|\|\|/

export function hasShellMetacharacters(command: string): boolean {
  return SHELL_META.test(command)
}

export function splitCommand(command: string): string[] {
  const parts: string[] = []
  let current = ''
  let quote: '"' | "'" | undefined
  for (const ch of command.trim()) {
    if (quote) {
      if (ch === quote) quote = undefined
      else current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (current !== '') parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current !== '') parts.push(current)
  return parts
}

export function firstToken(command: string): string {
  return splitCommand(command)[0] ?? ''
}

function run(binary: string, args: string[], opts: ExecOptions): Promise<ExecResult> {
  const timeoutMs = opts.timeoutMs ?? 120_000
  const maxBytes = opts.maxBytes ?? 200_000
  const started = Date.now()
  return new Promise((resolve) => {
    const child = execFile(binary, args, { cwd: opts.cwd, timeout: timeoutMs, windowsHide: true, maxBuffer: maxBytes }, (error, stdout, stderr) => {
      const durationMs = Date.now() - started
      const err = error as (Error & { code?: number | string }) | null
      const exitCode = err && typeof err.code === 'number' ? err.code : err ? 1 : 0
      resolve({
        ok: !err,
        exitCode,
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        durationMs,
        command: [binary, ...args].join(' '),
        resolvedBinary: binary,
      })
    })
    child.on('error', () => {
      // manejado por el callback
    })
    if (opts.input !== undefined && child.stdin) {
      child.stdin.write(opts.input)
      child.stdin.end()
    }
  })
}

/**
 * Ejecuta un comando sin shell, con timeout y sin interpretar metacaracteres.
 * En Windows prueba el sufijo .cmd para binarios de npm cuando hace falta.
 */
export async function runProcess(command: string, opts: ExecOptions = {}): Promise<ExecResult> {
  if (hasShellMetacharacters(command)) {
    return {
      ok: false,
      exitCode: 126,
      stdout: '',
      stderr: `Comando rechazado: contiene metacaracteres de shell (; | & < > \` $ ( ) % !). Ejecuta un único comando sin redirecciones.`,
      durationMs: 0,
      command,
      resolvedBinary: '',
    }
  }
  const parts = splitCommand(command)
  const bin = parts[0] ?? ''
  const args = parts.slice(1)
  if (bin === '') {
    return { ok: false, exitCode: 127, stdout: '', stderr: 'Comando vacío', durationMs: 0, command, resolvedBinary: '' }
  }

  const first = await run(bin, args, opts)
  if (!first.ok && first.exitCode !== 0 && /ENOENT/.test(first.stderr) && process.platform === 'win32' && !/\.(exe|cmd|bat|ps1)$/i.test(bin)) {
    const withCmd = await run(`${bin}.cmd`, args, opts)
    if (withCmd.resolvedBinary.endsWith('.cmd')) return { ...withCmd, command }
    return { ...first, command }
  }
  return { ...first, command }
}

export function isCommandAllowed(command: string, allowedPrefixes: string[]): boolean {
  const token = firstToken(command).toLowerCase()
  const base = token.replace(/\.(cmd|exe|bat|ps1)$/i, '')
  return allowedPrefixes.some((prefix) => {
    const first = firstToken(prefix).toLowerCase().replace(/\.(cmd|exe|bat|ps1)$/i, '')
    return first === base
  })
}
