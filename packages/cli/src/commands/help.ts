import type { Language } from '@specatlas/core'
import { CATALOG } from '../catalog.js'
import type { CliContext, CommandResult } from '../cli.js'
import { msg } from '../messages.js'
import { cliVersion } from '../version.js'

export async function runHelp(ctx: CliContext, commandName?: string): Promise<CommandResult> {
  const language: Language = ctx.language
  const lines: string[] = []
  lines.push(`${msg('cli.title', language)} ${cliVersion()} — kernel determinista de Spec-Driven Development`)
  lines.push('')
  if (commandName) {
    const spec = CATALOG.find((c) => c.name === commandName)
    if (!spec) {
      return { exitCode: 2, diagnostics: [{ code: 'ATLAS-CLI-001', severity: 'error', message: `${msg('cli.unknownCommand', language)}: ${commandName}` }], text: lines }
    }
    lines.push(`satlas ${spec.name} — ${spec.description}`)
    lines.push(`  ${spec.usage ?? `satlas ${spec.name}`}`)
    return { exitCode: 0, diagnostics: [], text: lines }
  }
  lines.push(msg('cli.usage', language))
  lines.push('')
  for (const spec of CATALOG) {
    lines.push(`  ${spec.name.padEnd(9)} ${spec.description}`)
  }
  lines.push('')
  lines.push('Documentación: ARQUITECTURA.md y PROPUESTA.md en el repositorio.')
  return { exitCode: 0, diagnostics: [], text: lines }
}
