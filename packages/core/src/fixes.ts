import path from 'node:path'
import { stringify as stringifyYaml } from 'yaml'
import { exists, listDir, listDirs, readTextIfExists, toPosix, writeText } from './fsx.js'
import { parseFrontmatter } from './frontmatter.js'
import { parseVerifyFile } from './parse/evidence.js'
import { parseChangeMeta } from './parse/meta.js'

export const LIVING_FIXES_DIR = path.join('.sdd', 'fixes')

const COMMENT_RE = /<!--[\s\S]*?-->/g

export interface LivingFix {
  slug: string
  file: string
  date: string
  result: string
  covers: string[]
  content: string
  source: 'living' | 'archive'
  domain?: string
  title?: string
}

export function parseFixCovers(content: string): string[] {
  const clean = content.replace(COMMENT_RE, '')
  const covers: string[] = []
  for (const line of clean.replace(/\r\n?/g, '\n').split('\n')) {
    const match = /^\s*-?\s*Cubre:\s*(.+?)\s*$/.exec(line)
    if (!match) continue
    for (const raw of (match[1] ?? '').split(',')) {
      const id = raw.trim().toUpperCase()
      if (/^REQ-[A-Z0-9-]+$/.test(id) && !covers.includes(id)) covers.push(id)
    }
  }
  return covers
}

function coversOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim().toUpperCase()).filter((v) => /^REQ-[A-Z0-9-]+$/.test(v))
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim().toUpperCase())
      .filter((v) => /^REQ-[A-Z0-9-]+$/.test(v))
  }
  return []
}

export function parseLivingFix(content: string, file: string): LivingFix {
  const fm = parseFrontmatter(content, file)
  const data = fm.data
  const base = path.basename(file).replace(/\.md$/i, '')
  const slug = typeof data['slug'] === 'string' && data['slug'].trim() !== '' ? data['slug'].trim() : base.replace(/^\d{4}-\d{2}-/, '')
  const fix: LivingFix = {
    slug,
    file,
    date: typeof data['date'] === 'string' ? data['date'] : '',
    result: typeof data['result'] === 'string' ? data['result'] : 'pass',
    covers: coversOf(data['covers']),
    content: fm.body.trimStart(),
    source: 'living',
  }
  if (typeof data['domain'] === 'string') fix.domain = data['domain']
  if (typeof data['title'] === 'string') fix.title = data['title']
  return fix
}

async function archivedFixes(root: string, known: Set<string>): Promise<LivingFix[]> {
  const archiveDir = path.join(root, '.sdd', 'changes', 'archive')
  const fixes: LivingFix[] = []
  for (const entry of await listDirs(archiveDir)) {
    const dir = path.join(archiveDir, entry)
    const fixFile = path.join(dir, 'fix.md')
    const fixRaw = await readTextIfExists(fixFile)
    if (fixRaw === undefined) continue
    const metaFile = path.join(dir, 'meta.yaml')
    const metaRaw = await readTextIfExists(metaFile)
    const meta = metaRaw !== undefined ? parseChangeMeta(metaRaw, metaFile).meta : undefined
    if (meta?.lane !== 'fix') continue
    const slug = entry.replace(/^\d{4}-\d{2}-/, '')
    if (known.has(slug)) continue
    const evidence = parseVerifyFile(fixRaw, fixFile).evidence
    const fix: LivingFix = {
      slug,
      file: fixFile,
      date: /^(\d{4}-\d{2})/.exec(entry)?.[1] ?? '',
      result: evidence.some((e) => e.result === 'pass') ? 'pass' : evidence.length > 0 ? 'fail' : 'pending',
      covers: parseFixCovers(fixRaw),
      content: parseFrontmatter(fixRaw, fixFile).body.trimStart(),
      source: 'archive',
    }
    if (meta.domain !== undefined) fix.domain = meta.domain
    if (meta.title !== undefined) fix.title = meta.title
    fixes.push(fix)
  }
  return fixes
}

export async function loadLivingFixes(root: string): Promise<LivingFix[]> {
  const dir = path.join(root, LIVING_FIXES_DIR)
  const entries = (await listDir(dir)).filter((entry) => entry.toLowerCase().endsWith('.md')).sort()
  const fixes: LivingFix[] = []
  for (const entry of entries) {
    const file = path.join(dir, entry)
    const content = await readTextIfExists(file)
    if (content === undefined) continue
    fixes.push(parseLivingFix(content, file))
  }
  fixes.push(...(await archivedFixes(root, new Set(fixes.map((fix) => fix.slug)))))
  return fixes.sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug))
}

export interface WriteLivingFixInput {
  slug: string
  date: string
  result?: string
  domain?: string
  title?: string
  covers?: string[]
  content: string
}

export interface WriteLivingFixResult {
  file: string
  relativePath: string
  created: boolean
}

export async function writeLivingFix(root: string, input: WriteLivingFixInput): Promise<WriteLivingFixResult> {
  const dir = path.join(root, LIVING_FIXES_DIR)
  const month = input.date.slice(0, 7)
  const file = path.join(dir, `${month}-${input.slug}.md`)
  const relativePath = toPosix(path.relative(root, file))
  if (await exists(file)) return { file, relativePath, created: false }

  const data: Record<string, unknown> = {
    slug: input.slug,
    date: input.date,
    result: input.result ?? 'pass',
  }
  if (input.domain) data['domain'] = input.domain
  if (input.title) data['title'] = input.title
  if (input.covers && input.covers.length > 0) data['covers'] = input.covers

  const body = input.content.replace(/^[\r\n]+/, '').trimEnd()
  const text = `---\n${stringifyYaml(data, { lineWidth: 120 })}---\n\n${body}\n`
  await writeText(file, text)
  return { file, relativePath, created: true }
}
