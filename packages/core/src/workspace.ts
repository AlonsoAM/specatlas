import path from 'node:path'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, isDirectory, listDir, listDirs, readText, readTextIfExists } from './fsx.js'
import type { AtlasConfig } from './config.js'
import { loadConfig } from './config.js'
import type { Change, SpecRef, Workspace } from './model.js'
import { parseSpecFile } from './parse/spec.js'
import { parseDelta } from './parse/delta.js'
import { parseTasksFile } from './parse/tasks.js'
import { parseVerifyFile } from './parse/evidence.js'
import { parseApprovals, parseChangeMeta } from './parse/meta.js'
import { parseClarify } from './parse/clarify.js'
import { parseReview } from './parse/review.js'
import { parseFixCovers } from './fixes.js'
import { loadContracts } from './contracts.js'
import { LINKS_FILE, loadLinks } from './links.js'

export const SDD_DIR = '.sdd'

export async function findWorkspaceRoot(start: string): Promise<string | undefined> {
  let current = path.resolve(start)
  for (let i = 0; i < 40; i += 1) {
    if (await isDirectory(path.join(current, SDD_DIR))) return current
    const parent = path.dirname(current)
    if (parent === current) return undefined
    current = parent
  }
  return undefined
}

export interface ApprovalsIndex {
  byArtifact: Map<string, { hash: string; by: string; at: string }>
  diagnostics: Diagnostic[]
}

export async function loadApprovals(sddDir: string): Promise<ApprovalsIndex> {
  const file = path.join(sddDir, 'approvals.yaml')
  const raw = await readTextIfExists(file)
  if (raw === undefined) return { byArtifact: new Map(), diagnostics: [] }
  const parsed = parseApprovals(raw, file)
  const map = new Map<string, { hash: string; by: string; at: string }>()
  for (const a of parsed.approvals?.approvals ?? []) {
    map.set(a.artifact.split(path.sep).join('/'), { hash: a.artifactHash, by: a.approvedBy, at: a.approvedAt })
  }
  return { byArtifact: map, diagnostics: parsed.diagnostics }
}

export async function loadSpecs(sddDir: string): Promise<SpecRef[]> {
  const specsDir = path.join(sddDir, 'specs')
  const domains = await listDirs(specsDir)
  const out: SpecRef[] = []
  for (const domain of domains) {
    const file = path.join(specsDir, domain, 'spec.md')
    if (!(await exists(file))) continue
    const content = await readText(file)
    out.push({ domain, path: file, spec: parseSpecFile(content, file) })
  }
  return out
}

export async function loadChange(root: string, slug: string, relDir?: string): Promise<Change> {
  const dir = path.join(root, SDD_DIR, 'changes', relDir ?? slug)
  const diagnostics: Diagnostic[] = []
  const change: Change = { slug, dir, diagnostics }

  const metaFile = path.join(dir, 'meta.yaml')
  const metaRaw = await readTextIfExists(metaFile)
  if (metaRaw === undefined) {
    diagnostics.push(diag('ATLAS-FILES-001', 'error', `El cambio "${slug}" no tiene meta.yaml`, { path: metaFile, suggestion: 'Crea meta.yaml con slug, lane y dominio' }))
  } else {
    const parsed = parseChangeMeta(metaRaw, metaFile)
    diagnostics.push(...parsed.diagnostics)
    if (parsed.meta) change.meta = parsed.meta
  }

  const deltaFile = path.join(dir, 'spec.md')
  const deltaRaw = await readTextIfExists(deltaFile)
  if (deltaRaw !== undefined) {
    change.delta = parseDelta(deltaRaw, deltaFile)
    diagnostics.push(...change.delta.diagnostics)
  } else {
    diagnostics.push(diag('ATLAS-FILES-002', 'warning', `El cambio "${slug}" no tiene spec.md (delta)`, { path: deltaFile }))
  }

  const planFile = path.join(dir, 'plan.md')
  if (await exists(planFile)) change.planPath = planFile

  const reviewFile = path.join(dir, 'review.md')
  const reviewRaw = await readTextIfExists(reviewFile)
  if (reviewRaw !== undefined) {
    change.reviewPath = reviewFile
    change.review = parseReview(reviewRaw, reviewFile)
    diagnostics.push(...change.review.diagnostics)
  }

  const presentationFile = path.join(dir, 'presentation', 'index.html')
  if (await exists(presentationFile)) change.presentationPath = presentationFile

  const tasksFile = path.join(dir, 'tasks.md')
  const tasksRaw = await readTextIfExists(tasksFile)
  if (tasksRaw !== undefined) {
    change.tasks = parseTasksFile(tasksRaw, tasksFile)
    diagnostics.push(...change.tasks.diagnostics)
  }

  const verifyFile = path.join(dir, 'verify.md')
  const verifyRaw = await readTextIfExists(verifyFile)
  if (verifyRaw !== undefined) {
    change.verify = parseVerifyFile(verifyRaw, verifyFile)
    diagnostics.push(...change.verify.diagnostics)
  }

  const fixFile = path.join(dir, 'fix.md')
  const fixRaw = await readTextIfExists(fixFile)
  if (fixRaw !== undefined) {
    change.fix = parseVerifyFile(fixRaw, fixFile)
    diagnostics.push(...change.fix.diagnostics)
    change.fixCovers = parseFixCovers(fixRaw)
  }

  const clarifyFile = path.join(dir, 'clarify.md')
  const clarifyRaw = await readTextIfExists(clarifyFile)
  if (clarifyRaw !== undefined) {
    change.clarify = parseClarify(clarifyRaw, clarifyFile)
    change.clarifyPath = clarifyFile
    diagnostics.push(...change.clarify.diagnostics)
  }

  const docsPaths: string[] = []
  for (const name of ['tecnica.md', 'manual.md']) {
    const docFile = path.join(dir, 'docs', name)
    if (await exists(docFile)) docsPaths.push(docFile)
  }
  if (docsPaths.length > 0) change.docsPaths = docsPaths

  const contracts = await loadContracts(dir)
  if (contracts.files.length > 0) change.contracts = contracts

  const mockupManifest = path.join(dir, 'mockups', 'manifest.yaml')
  if (await exists(mockupManifest)) change.mockupManifestPath = mockupManifest

  return change
}

export async function listChangeSlugs(root: string, opts: { includeArchived?: boolean } = {}): Promise<string[]> {
  const changesDir = path.join(root, SDD_DIR, 'changes')
  const dirs = await listDirs(changesDir)
  return dirs.filter((d) => (opts.includeArchived ? true : d !== 'archive'))
}

export async function loadWorkspace(root: string): Promise<{ workspace: Workspace; config: AtlasConfig }> {
  const sddDir = path.join(root, SDD_DIR)
  const { config, diagnostics: configDiags } = await loadConfig(sddDir)
  const diagnostics: Diagnostic[] = [...configDiags]
  const specs = await loadSpecs(sddDir)
  for (const spec of specs) diagnostics.push(...spec.spec.diagnostics)

  const slugs = await listChangeSlugs(root)
  const changes: Change[] = []
  for (const slug of slugs) {
    const change = await loadChange(root, slug)
    changes.push(change)
    diagnostics.push(...change.diagnostics)
  }

  const archived: Change[] = []
  const archivedDir = path.join(sddDir, 'changes', 'archive')
  if (await isDirectory(archivedDir)) {
    for (const entry of await listDirs(archivedDir)) {
      archived.push(await loadChange(root, entry.replace(/^\d{4}-\d{2}-/, ''), path.join('archive', entry)))
    }
  }

  const workspace: Workspace = { root, sddDir, specs, changes, archived, diagnostics }
  if (await exists(path.join(sddDir, LINKS_FILE))) {
    workspace.links = await loadLinks(root)
  }
  return { workspace, config }
}

export async function ensureSddDirs(sddDir: string): Promise<string[]> {
  const created: string[] = []
  const dirs = ['specs', 'changes', 'runs', 'metrics', 'fixes', path.join('profiles', 'custom')]
  const { ensureDir } = await import('./fsx.js')
  for (const d of dirs) {
    const full = path.join(sddDir, d)
    if (!(await exists(full))) {
      await ensureDir(full)
      created.push(full)
    }
  }
  return created
}
