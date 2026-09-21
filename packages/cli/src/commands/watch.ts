import { watch } from 'node:fs'
import path from 'node:path'
import { countBySeverity, findWorkspaceRoot, stateLabel } from '@specatlas/core'
import { CliError, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'
import { runNext } from './next.js'
import { runValidate } from './validate.js'
import { runTrace } from './trace.js'

const DEBOUNCE_MS = 250

function stamp(now: Date): string {
  return now.toTimeString().slice(0, 8)
}

/**
 * Bucle de retroalimentación fuera del editor: cada vez que cambia algo en
 * `.sdd/`, se vuelven a correr las comprobaciones deterministas y se dice cuál
 * es el siguiente paso. No escribe nada.
 */
export async function runWatch(ctx: CliContext): Promise<CommandResult> {
  const root = await findWorkspaceRoot(ctx.cwd)
  if (!root) throw new CliError('ATLAS-WS-001', msg('cli.noWorkspace', ctx.language), 2)
  if (ctx.json) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-WATCH-001', severity: 'error', message: '`satlas watch` es interactivo y no admite --json', suggestion: 'Usa `satlas ci --json` en una tubería' }],
    }
  }

  const sddDir = path.join(root, '.sdd')
  const write = (line: string): void => {
    process.stdout.write(`${line}\n`)
  }

  const pass = async (): Promise<void> => {
    const validate = await runValidate({ ...ctx, flags: {} })
    const trace = await runTrace({ ...ctx, flags: {} })
    const next = await runNext({ ...ctx, flags: {}, positionals: [] })

    const findings = [...validate.diagnostics, ...trace.diagnostics]
    const counts = countBySeverity(findings)
    write('')
    write(`─── ${stamp(new Date())} ───────────────────────────────`)
    if (findings.length === 0) {
      write('  sin hallazgos')
    } else {
      write(`  ${counts.errors} errores, ${counts.warnings} avisos`)
      for (const finding of findings.slice(0, 8)) {
        const where = finding.path ? ` ${path.relative(root, finding.path)}${finding.line ? `:${finding.line}` : ''}` : ''
        write(`  ${finding.severity === 'error' ? 'ERROR' : 'AVISO'} ${finding.code}${where} — ${finding.message}`)
      }
      if (findings.length > 8) write(`  … y ${findings.length - 8} más (satlas validate)`)
    }

    const changes = (next.data as { changes?: Array<{ slug: string; state: string; next: string }> } | undefined)?.changes ?? []
    for (const change of changes) {
      write(`  ${change.slug} — ${stateLabel(change.state as Parameters<typeof stateLabel>[0])} · siguiente: ${change.next}`)
    }
    if (changes.length === 0) write('  sin cambios activos')
  }

  write(`Vigilando ${path.relative(ctx.cwd, sddDir) || '.sdd'} — Ctrl+C para salir`)
  await pass()

  await new Promise<void>((resolve) => {
    let timer: NodeJS.Timeout | undefined
    let running = false
    const schedule = (): void => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (running) return
        running = true
        void pass()
          .catch((error: unknown) => write(`  (no se pudo releer el workspace: ${(error as Error).message})`))
          .finally(() => {
            running = false
          })
      }, DEBOUNCE_MS)
    }

    const watcher = watch(sddDir, { recursive: true }, () => schedule())
    const stop = (): void => {
      watcher.close()
      resolve()
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })

  return { exitCode: 0, diagnostics: [], text: [] }
}
