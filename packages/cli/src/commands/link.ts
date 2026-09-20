import path from 'node:path'
import { addLink, loadLinks, removeLink } from '@specatlas/core'
import { flagString } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runLink(ctx: CliContext): Promise<CommandResult> {
  const { root } = await requireWorkspace(ctx)
  const action = ctx.positionals[0] ?? 'list'

  if (action === 'list') {
    const state = await loadLinks(root)
    const lines: string[] = [msg('link.title', ctx.language), '']
    if (state.entries.length === 0) {
      lines.push('Sin enlaces. Añade uno con `satlas link add <ruta>`.')
    } else {
      for (const entry of state.entries) {
        const status = entry.available ? `${entry.requirements} requisito(s) · ${entry.domains.join(', ') || 'sin dominios'}` : 'NO DISPONIBLE'
        lines.push(`  ${entry.name}  ${path.relative(ctx.cwd, entry.path)}  ${status}`)
      }
    }
    return {
      exitCode: 0,
      diagnostics: [],
      data: {
        links: state.entries.map((entry) => ({
          name: entry.name,
          path: path.relative(ctx.cwd, entry.path),
          available: entry.available,
          requirements: entry.requirements,
          domains: entry.domains,
        })),
      },
      text: lines,
    }
  }

  if (action === 'add') {
    const target = ctx.positionals[1]
    if (!target) {
      return { exitCode: 2, diagnostics: [{ code: 'ATLAS-LINK-000', severity: 'error', message: 'Falta la ruta: satlas link add <ruta> [--name <nombre>]' }] }
    }
    const name = flagString(ctx.flags, 'name')
    const result = await addLink(root, { path: target, ...(name !== undefined ? { name } : {}) })
    const errors = result.diagnostics.filter((d) => d.severity === 'error')
    if (errors.length > 0) {
      return { exitCode: 2, diagnostics: result.diagnostics, data: { action: 'add' }, text: errors.map((error) => `${error.code} — ${error.message}`) }
    }
    return {
      exitCode: 0,
      diagnostics: result.diagnostics,
      data: { action: 'add', link: result.entry },
      text: [`Enlace añadido: ${result.entry?.name} → ${result.entry?.path}`],
    }
  }

  if (action === 'remove') {
    const ref = ctx.positionals[1]
    if (!ref) {
      return { exitCode: 2, diagnostics: [{ code: 'ATLAS-LINK-000', severity: 'error', message: 'Falta el nombre o la ruta: satlas link remove <nombre|ruta>' }] }
    }
    const result = await removeLink(root, ref)
    if (result.removed === undefined) {
      return { exitCode: 2, diagnostics: result.diagnostics, data: { action: 'remove' }, text: result.diagnostics.map((diagnostic) => `${diagnostic.code} — ${diagnostic.message}`) }
    }
    return { exitCode: 0, diagnostics: result.diagnostics, data: { action: 'remove', removed: result.removed }, text: [`Enlace quitado: ${result.removed}`] }
  }

  return {
    exitCode: 2,
    diagnostics: [{ code: 'ATLAS-LINK-000', severity: 'error', message: `Acción desconocida: ${action}`, suggestion: 'Usa: satlas link add <ruta> | satlas link list | satlas link remove <nombre|ruta>' }],
  }
}
