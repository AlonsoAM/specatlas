import path from 'node:path'
import { localDate } from './time.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { ensureDir, exists, writeText } from './fsx.js'
import type { AtlasConfig } from './config.js'
import type { ChangeMeta, Language, Lane } from './model.js'
import { changeMetaYaml, renderTemplate, templatesFor } from './templates.js'

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,49}$/

export interface NewChangeOptions {
  root: string
  slug: string
  lane?: Lane
  domain?: string
  title?: string
  language?: Language
  cfg?: AtlasConfig
  now?: Date
}

export interface NewChangeResult {
  slug: string
  dir: string
  files: string[]
  diagnostics: Diagnostic[]
}

export async function createChange(opts: NewChangeOptions): Promise<NewChangeResult> {
  const diagnostics: Diagnostic[] = []
  const slug = opts.slug.trim().toLowerCase()
  const language: Language = opts.language ?? opts.cfg?.project.language ?? 'es'
  const dir = path.join(path.resolve(opts.root), '.sdd', 'changes', slug)

  if (!SLUG_RE.test(slug)) {
    return {
      slug,
      dir,
      files: [],
      diagnostics: [diag('ATLAS-NEW-001', 'error', `Slug inválido: "${slug}"`, { suggestion: 'Usa kebab-case: minúsculas, números y guiones (2-50 caracteres)' })],
    }
  }
  if (await exists(dir)) {
    return {
      slug,
      dir,
      files: [],
      diagnostics: [diag('ATLAS-NEW-002', 'error', `El cambio "${slug}" ya existe`, { path: dir })],
    }
  }

  const lane: Lane = opts.lane ?? opts.cfg?.lanes.default ?? 'standard'
  const domain = (opts.domain ?? 'general').toLowerCase()
  const title = opts.title ?? slug.replace(/-/g, ' ')

  const meta: ChangeMeta = {
    schemaVersion: 1,
    slug,
    title,
    domain,
    lane,
    created: localDate(opts.now),
  }

  await ensureDir(dir)
  const templates = templatesFor(language)
  const files: string[] = []

  const metaFile = path.join(dir, 'meta.yaml')
  await writeText(metaFile, changeMetaYaml(meta))
  files.push(metaFile)

  if (lane === 'fix') {
    const fixFile = path.join(dir, 'fix.md')
    await writeText(fixFile, renderTemplate(templates.fix, { TITLE: title }))
    files.push(fixFile)
    return { slug, dir, files, diagnostics }
  }

  const proposalFile = path.join(dir, 'proposal.md')
  await writeText(proposalFile, renderTemplate(templates.proposal, { TITLE: title }))
  files.push(proposalFile)

  const domainUpper = domain.replace(/[^a-z0-9]/gi, '').toUpperCase() || 'GEN'
  const deltaFile = path.join(dir, 'spec.md')
  await writeText(deltaFile, templates.specDelta({ title, domainUpper, domain }))
  files.push(deltaFile)

  return { slug, dir, files, diagnostics }
}
