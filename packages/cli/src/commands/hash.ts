import { readTextIfExists, sha256 } from '@specatlas/core'
import { flagString } from '../args.js'
import type { CliContext, CommandResult } from '../cli.js'

export async function runHash(ctx: CliContext): Promise<CommandResult> {
  const text = flagString(ctx.flags, 'text')
  const target = ctx.positionals[0]

  let content: string | undefined
  let source: string
  if (text !== undefined) {
    content = text
    source = 'texto'
  } else if (target) {
    content = await readTextIfExists(target)
    source = target
    if (content === undefined) {
      return {
        exitCode: 3,
        diagnostics: [{ code: 'ATLAS-HASH-001', severity: 'error', message: `No se pudo leer el archivo: ${target}` }],
      }
    }
  } else {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-HASH-000', severity: 'error', message: 'Indica un archivo o --text "<contenido>"', suggestion: 'satlas hash salida.log  |  satlas hash --text "resultado"' }],
    }
  }

  const hash = sha256(content)
  return {
    exitCode: 0,
    diagnostics: [],
    data: { source, hash },
    text: [hash],
  }
}
