import path from 'node:path'
import { createChange, type Lane, type Language } from '@specatlas/core'
import { flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runNew(ctx: CliContext): Promise<CommandResult> {
  const slug = ctx.positionals[0]
  if (!slug) {
    return {
      exitCode: 2,
      diagnostics: [{ code: 'ATLAS-NEW-000', severity: 'error', message: `${msg('cli.changeRequired', ctx.language)}: satlas new <slug>` }],
    }
  }
  const { config } = await requireWorkspace(ctx)
  const laneFlag = flagString(ctx.flags, 'lane') as Lane | undefined
  const languageFlag = flagString(ctx.flags, 'language') as Language | undefined

  const result = await createChange({
    root: ctx.cwd,
    slug,
    lane: laneFlag,
    domain: flagString(ctx.flags, 'domain'),
    title: flagString(ctx.flags, 'title'),
    language: languageFlag ?? config.project.language,
    cfg: config,
  })

  const hasErrors = result.diagnostics.some((d) => d.severity === 'error')
  const lines = hasErrors
    ? []
    : [
        msg('new.title', ctx.language),
        '',
        msg('new.done', ctx.language),
        ...result.files.map((f) => `  + ${path.relative(ctx.cwd, f)}`),
        '',
        `Siguiente: /satlas.specify ${result.slug} — escribe la especificación 100% funcional y de negocio.`,
      ]

  return {
    exitCode: hasErrors ? 1 : 0,
    diagnostics: result.diagnostics,
    data: { slug: result.slug, files: result.files.map((f) => path.relative(ctx.cwd, f)) },
    text: lines,
  }
}
