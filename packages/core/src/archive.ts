import { promises as fs } from 'node:fs'
import { cp, rename, rm } from 'node:fs/promises'
import { localDate, localMonth } from './time.js'
import path from 'node:path'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { ensureDir, exists, readText, readTextIfExists, writeText } from './fsx.js'
import { parseFrontmatter } from './frontmatter.js'
import type { AtlasConfig } from './config.js'
import type { Delta, Language } from './model.js'
import { renderRequirement } from './parse/spec.js'
import { loadChange, loadWorkspace } from './workspace.js'
import { indexMarkdown } from './templates.js'
import { loadLivingFixes, writeLivingFix } from './fixes.js'

const REQ_HEADER_RE = /^###\s+(?:Requisito|Requirement):\s+(REQ-[A-Z0-9-]+)\s*(?:—|-|–)\s*(.*)$/

export interface FoldOutcome {
  content: string
  applied: { added: string[]; modified: string[]; removed: string[]; renamed: string[] }
  diagnostics: Diagnostic[]
}

export function foldDelta(livingBody: string, delta: Delta, language: Language = 'es'): FoldOutcome {
  const diagnostics: Diagnostic[] = []
  let lines = livingBody.replace(/\r\n?/g, '\n').split('\n')
  const applied = { added: [] as string[], modified: [] as string[], removed: [] as string[], renamed: [] as string[] }

  const findRange = (id: string): { start: number; end: number } | undefined => {
    let start = -1
    for (let i = 0; i < lines.length; i += 1) {
      const m = REQ_HEADER_RE.exec(lines[i] ?? '')
      if (m && (m[1] ?? '').toUpperCase() === id) {
        start = i
        break
      }
    }
    if (start < 0) return undefined
    let end = lines.length
    for (let i = start + 1; i < lines.length; i += 1) {
      if (/^###\s+/.test(lines[i] ?? '')) {
        end = i
        break
      }
    }
    return { start, end }
  }

  for (const req of delta.modified) {
    const range = findRange(req.id)
    if (!range) {
      diagnostics.push(diag('TRACE-007', 'error', `No se puede modificar ${req.id}: no existe en la spec viva`, { path: delta.path, line: req.line }))
      continue
    }
    const rendered = renderRequirement(req, language).split('\n')
    lines = [...lines.slice(0, range.start), ...rendered, '', ...lines.slice(range.end)]
    applied.modified.push(req.id)
  }

  for (const req of delta.removed) {
    const range = findRange(req.id)
    if (!range) {
      diagnostics.push(diag('TRACE-007', 'error', `No se puede eliminar ${req.id}: no existe en la spec viva`, { path: delta.path, line: req.line }))
      continue
    }
    lines = [...lines.slice(0, range.start), ...lines.slice(range.end)]
    applied.removed.push(req.id)
  }

  for (const rename of delta.renamed) {
    const range = findRange(rename.from.id)
    if (!range) {
      diagnostics.push(diag('TRACE-007', 'error', `No se puede renombrar ${rename.from.id}: no existe en la spec viva`, { path: delta.path, line: rename.line }))
      continue
    }
    const header = lines[range.start] ?? ''
    const label = /Requirement/i.test(header) ? 'Requirement' : 'Requisito'
    lines[range.start] = header.replace(REQ_HEADER_RE, (_match, id: string) => `### ${label}: ${id} — ${rename.to.title}`)
    applied.renamed.push(rename.from.id)
  }

  for (const req of delta.added) {
    const rendered = renderRequirement(req, language)
    const trimmed = trimTrailingBlanks(lines)
    lines = [...trimmed, '', ...rendered.split('\n'), '']
    applied.added.push(req.id)
  }

  return { content: lines.join('\n'), applied, diagnostics }
}

function trimTrailingBlanks(lines: string[]): string[] {
  const out = [...lines]
  while (out.length > 0 && (out[out.length - 1] ?? '').trim() === '') out.pop()
  return out
}

const TRANSIENT_MOVE_CODES = new Set(['EPERM', 'EBUSY', 'ENOTEMPTY', 'EACCES'])

export interface MoveOps {
  rename?: typeof rename
  cp?: typeof cp
  rm?: typeof rm
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function moveDirectory(from: string, to: string, ops: MoveOps = {}): Promise<{ strategy: 'rename' | 'copy' }> {
  const doRename = ops.rename ?? rename
  const doCopy = ops.cp ?? cp
  const doRemove = ops.rm ?? rm
  let lastError: unknown

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await doRename(from, to)
      return { strategy: 'rename' }
    } catch (error) {
      lastError = error
      const code = (error as NodeJS.ErrnoException).code ?? ''
      if (!TRANSIENT_MOVE_CODES.has(code)) throw error
      await delay(250 * attempt)
    }
  }

  await doCopy(from, to, { recursive: true, force: true })
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await doRemove(from, { recursive: true, force: true, maxRetries: 2 })
      return { strategy: 'copy' }
    } catch (error) {
      lastError = error
      await delay(350 * attempt)
    }
  }
  await doRemove(to, { recursive: true, force: true }).catch(() => undefined)
  throw lastError
}

async function restoreFile(file: string, previous: string | undefined): Promise<void> {
  try {
    if (previous === undefined) await fs.rm(file, { force: true })
    else await writeText(file, previous)
  } catch {
    // el rollback es best-effort
  }
}

export interface ArchiveOptions {
  root: string
  slug: string
  language?: Language
  now?: Date
  dryRun?: boolean
}

export interface ArchiveResult {
  slug: string
  domain?: string
  archivedTo?: string
  livingFix?: string
  fold: FoldOutcome
  diagnostics: Diagnostic[]
  dryRun: boolean
}

export async function archiveChange(opts: ArchiveOptions): Promise<ArchiveResult> {
  const root = path.resolve(opts.root)
  const diagnostics: Diagnostic[] = []
  const { config } = await loadWorkspace(root)
  const language: Language = opts.language ?? config.project.language
  const change = await loadChange(root, opts.slug)
  diagnostics.push(...change.diagnostics)

  const emptyFold: FoldOutcome = { content: '', applied: { added: [], modified: [], removed: [], renamed: [] }, diagnostics: [] }

  if (!change.meta) {
    return { slug: opts.slug, fold: emptyFold, diagnostics, dryRun: opts.dryRun ?? false }
  }

  if (change.meta.lane === 'fix') {
    if (!change.fix) {
      diagnostics.push(diag('ATLAS-ARCH-005', 'error', `El fix "${opts.slug}" no tiene fix.md`, { path: change.dir }))
      return { slug: opts.slug, fold: emptyFold, diagnostics, dryRun: opts.dryRun ?? false }
    }
    const nowFix = opts.now ?? new Date()
    const targetFix = path.join(root, '.sdd', 'changes', 'archive', `${localMonth(nowFix)}-${opts.slug}`)
    if (await exists(targetFix)) {
      diagnostics.push(diag('ATLAS-ARCH-002', 'error', `Ya existe un cambio archivado en ${targetFix}`, { path: targetFix }))
      return { slug: opts.slug, fold: emptyFold, diagnostics, dryRun: opts.dryRun ?? false }
    }
    let livingFix: string | undefined
    let livingCreated = false
    if (!opts.dryRun) {
      const fixRaw = (await readTextIfExists(path.join(change.dir, 'fix.md'))) ?? ''
      try {
        const written = await writeLivingFix(root, {
          slug: opts.slug,
          date: localDate(nowFix),
          result: 'pass',
          ...(change.meta.domain !== undefined ? { domain: change.meta.domain } : {}),
          ...(change.meta.title !== undefined ? { title: change.meta.title } : {}),
          covers: change.fixCovers ?? [],
          content: fixRaw,
        })
        livingFix = written.relativePath
        livingCreated = written.created
      } catch (error) {
        diagnostics.push(
          diag('ATLAS-ARCH-006', 'error', `No se pudo conservar el fix vivo: ${(error as Error).message}`, {
            path: path.join(root, '.sdd', 'fixes'),
            suggestion: 'Revisa los permisos de .sdd/fixes y vuelve a intentar; el fix sigue sin archivar',
          }),
        )
        return { slug: opts.slug, fold: emptyFold, diagnostics, dryRun: false }
      }
    }
    if (!opts.dryRun) {
      await ensureDir(path.dirname(targetFix))
      try {
        await moveDirectory(change.dir, targetFix)
      } catch (error) {
        if (livingCreated && livingFix) await removeFile(path.join(root, livingFix))
        diagnostics.push(
          diag('ATLAS-ARCH-004', 'error', `No se pudo mover el cambio al histórico: ${(error as Error).message}`, {
            path: change.dir,
            suggestion: 'Cierra las pestañas con archivos de este cambio (y espera unos segundos si OneDrive está sincronizando) y vuelve a intentar',
          }),
        )
        return { slug: opts.slug, fold: emptyFold, diagnostics, dryRun: false }
      }
      await regenerateIndex(root, config, nowFix)
    }
    return {
      slug: opts.slug,
      archivedTo: targetFix,
      ...(livingFix !== undefined ? { livingFix } : {}),
      fold: emptyFold,
      diagnostics,
      dryRun: opts.dryRun ?? false,
    }
  }

  if (!change.delta) {
    diagnostics.push(diag('ATLAS-ARCH-003', 'error', `El cambio "${opts.slug}" no tiene spec.md (delta): no hay nada que plegar`, { path: change.dir }))
    return { slug: opts.slug, fold: emptyFold, diagnostics, dryRun: opts.dryRun ?? false }
  }
  const domain = change.meta.domain
  if (!domain) {
    diagnostics.push(diag('ATLAS-ARCH-001', 'error', `El cambio "${opts.slug}" no declara domain en meta.yaml`, { path: path.join(change.dir, 'meta.yaml') }))
    return { slug: opts.slug, fold: { content: '', applied: { added: [], modified: [], removed: [], renamed: [] }, diagnostics }, diagnostics, dryRun: opts.dryRun ?? false }
  }

  const specFile = path.join(root, '.sdd', 'specs', domain, 'spec.md')
  const existing = await readTextIfExists(specFile)
  const base = existing ?? `---\ndomain: ${domain}\ntitle: ${change.meta.title ?? domain}\nversion: 0\n---\n\n# ${change.meta.title ?? domain}\n`
  const fm = parseFrontmatter(base)
  const fold = foldDelta(fm.body, change.delta, language)
  diagnostics.push(...fold.diagnostics)

  const version = typeof fm.data['version'] === 'number' ? (fm.data['version'] as number) : 0
  const now = opts.now ?? new Date()
  const nextFm: Record<string, unknown> = {
    domain,
    title: fm.data['title'] ?? change.meta.title ?? domain,
    owner: fm.data['owner'],
    version: version + 1,
    updated: localDate(now),
  }
  for (const key of Object.keys(nextFm)) if (nextFm[key] === undefined) delete nextFm[key]
  const body = fold.content.replace(/^[\r\n]+/, '').trimEnd() + '\n'
  const nextContent = `---\n${Object.entries(nextFm)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('\n')}\n---\n\n${body}`

  const month = localMonth(now)
  const archiveDir = path.join(root, '.sdd', 'changes', 'archive')
  const target = path.join(archiveDir, `${month}-${opts.slug}`)
  if (await exists(target)) {
    diagnostics.push(diag('ATLAS-ARCH-002', 'error', `Ya existe un cambio archivado en ${target}`, { path: target }))
    return { slug: opts.slug, domain, fold, diagnostics, dryRun: opts.dryRun ?? false }
  }

  if (!opts.dryRun) {
    await writeText(specFile, nextContent)
    await ensureDir(archiveDir)
    try {
      await moveDirectory(change.dir, target)
    } catch (error) {
      await restoreFile(specFile, existing)
      diagnostics.push(
        diag('ATLAS-ARCH-004', 'error', `No se pudo mover el cambio al histórico: ${(error as Error).message}`, {
          path: change.dir,
          suggestion: 'Cierra las pestañas con archivos de este cambio (y espera unos segundos si OneDrive está sincronizando) y vuelve a intentar; el cambio y la spec viva quedaron como estaban',
        }),
      )
      return { slug: opts.slug, domain, fold, diagnostics, dryRun: false }
    }
    await regenerateIndex(root, config, now)
  }

  return { slug: opts.slug, domain, archivedTo: target, fold, diagnostics, dryRun: opts.dryRun ?? false }
}

export async function regenerateIndex(root: string, cfg?: AtlasConfig, now: Date = new Date()): Promise<void> {
  const { workspace, config } = cfg ? { workspace: (await loadWorkspace(root)).workspace, config: cfg } : await loadWorkspace(root)
  const archiveDir = path.join(root, '.sdd', 'changes', 'archive')
  const archived = (await exists(archiveDir)) ? (await fs.readdir(archiveDir)).filter((e) => !e.startsWith('.')).length : 0
  const fixes = await loadLivingFixes(root)
  const markdown = indexMarkdown({
    projectName: config.project.name,
    language: config.project.language,
    specs: workspace.specs.map((s) => ({ domain: s.domain, requirements: s.spec.requirements.length })),
    changes: workspace.changes.map((c) => ({ slug: c.slug, lane: c.meta?.lane ?? config.lanes.default })),
    fixes: fixes.map((fix) => ({ slug: fix.slug, date: fix.date, result: fix.result, ...(fix.domain !== undefined ? { domain: fix.domain } : {}) })),
    archived,
  })
  void now
  await writeText(path.join(root, '.sdd', 'INDEX.md'), markdown)
}

async function removeFile(file: string): Promise<void> {
  try {
    await rm(file, { force: true })
  } catch {
    // la limpieza es best-effort
  }
}
