import path from 'node:path'
import type { Diagnostic, Language } from '@specatlas/core'
import { artifactHash, ensureDir, readTextIfExists, writeText } from '@specatlas/core'
import { loadWorkflow } from './workflow.js'
import { compileTarget, type AgentTarget, type CompiledFile } from './targets.js'

export interface CompileOptions {
  root: string
  workflowDir: string
  targets: AgentTarget[]
  language?: Language
  check?: boolean
  now?: Date
}

export interface CompiledEntry extends CompiledFile {
  hash: string
  status: 'new' | 'updated' | 'unchanged'
}

export interface CompileReport {
  files: CompiledEntry[]
  stale: string[]
  missing: string[]
  orphaned: string[]
  manifestPath: string
  sourceHash: string
  diagnostics: Diagnostic[]
  written: string[]
}

interface Manifest {
  schemaVersion: number
  generatedAt: string
  sourceHash: string
  language: Language
  targets: Record<string, Array<{ path: string; hash: string }>>
}

const MANIFEST_REL = path.join('.sdd', '.generated', 'manifest.json')
const BEGIN = '<!-- BEGIN specatlas -->'
const END = '<!-- END specatlas -->'

export async function compileTargets(opts: CompileOptions): Promise<CompileReport> {
  const root = path.resolve(opts.root)
  const language: Language = opts.language ?? 'es'
  const diagnostics: Diagnostic[] = []
  const sources = await loadWorkflow(opts.workflowDir)
  if (sources.phases.length === 0) {
    diagnostics.push({
      code: 'ATLAS-ADAPTERS-002',
      severity: 'error',
      message: `No hay fases en ${path.join(opts.workflowDir, 'phases')}`,
      suggestion: 'Revisa la carpeta workflow/phases del proyecto',
    })
  }

  const ctx = { sources, language, slugToken: '<slug>', commandPrefix: 'satlas' }
  const deduped = new Map<string, CompiledFile>()
  for (const target of opts.targets) {
    for (const file of compileTarget(target, ctx)) {
      // Varios targets pueden compartir un mismo archivo (AGENTS.md, prompts/): gana el primero.
      if (!deduped.has(file.path)) deduped.set(file.path, file)
    }
  }
  const compiled: CompiledFile[] = [...deduped.values()]

  const manifestPath = path.join(root, MANIFEST_REL)
  const previous = await readManifest(manifestPath)
  const previousHashes = new Map<string, string>()
  for (const files of Object.values(previous?.targets ?? {})) {
    for (const file of files) previousHashes.set(file.path, file.hash)
  }

  const files: CompiledEntry[] = []
  const written: string[] = []
  const stale: string[] = []
  const missing: string[] = []

  for (const file of compiled) {
    const abs = path.join(root, file.path)
    const finalContent = file.path === 'AGENTS.md' ? mergeAgentsBlock((await readTextIfExists(abs)) ?? '', file.content) : file.content
    const hash = artifactHash(finalContent)
    const existing = await readTextIfExists(abs)
    const existingHash = existing === undefined ? undefined : artifactHash(existing)

    let status: CompiledEntry['status'] = 'unchanged'
    if (existingHash === undefined) {
      status = 'new'
      missing.push(file.path)
    } else if (existingHash !== hash) {
      status = 'updated'
      stale.push(file.path)
    } else if (previousHashes.get(file.path) !== undefined && previousHashes.get(file.path) !== hash) {
      stale.push(file.path)
    }

    if (!opts.check && status !== 'unchanged') {
      await ensureDir(path.dirname(abs))
      await writeText(abs, finalContent)
      written.push(file.path)
    }
    files.push({ ...file, content: finalContent, hash, status })
  }

  const orphaned: string[] = []
  for (const p of previousHashes.keys()) {
    if (!compiled.some((f) => f.path === p)) orphaned.push(p)
  }

  const report: CompileReport = { files, stale, missing, orphaned, manifestPath, sourceHash: sources.sourceHash, diagnostics, written }

  if (!opts.check && diagnostics.every((d) => d.severity !== 'error')) {
    const manifest: Manifest = {
      schemaVersion: 1,
      generatedAt: (opts.now ?? new Date()).toISOString(),
      sourceHash: sources.sourceHash,
      language,
      targets: {},
    }
    for (const file of files) {
      const list = manifest.targets[file.target] ?? []
      list.push({ path: file.path, hash: file.hash })
      manifest.targets[file.target] = list
    }
    await writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  }

  return report
}

function mergeAgentsBlock(existing: string, block: string): string {
  const start = existing.indexOf(BEGIN)
  const end = existing.indexOf(END)
  if (start >= 0 && end >= 0) {
    const before = existing.slice(0, start)
    const after = existing.slice(end + END.length)
    return `${before}${block.trimEnd()}${after}`.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
  }
  const base = existing.trimEnd()
  if (base === '') return block
  return `${base}\n\n${block.trimEnd()}\n`
}

async function readManifest(manifestPath: string): Promise<Manifest | undefined> {
  const raw = await readTextIfExists(manifestPath)
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw) as Manifest
  } catch {
    return undefined
  }
}

export interface AdapterHealth {
  ok: boolean
  manifest: boolean
  sourceHash?: string
  stale: string[]
  missing: string[]
  orphaned: string[]
}

export async function checkAdapters(opts: { root: string; workflowDir: string; targets: AgentTarget[]; language?: Language }): Promise<AdapterHealth> {
  const manifestPath = path.join(path.resolve(opts.root), MANIFEST_REL)
  const manifestRaw = await readTextIfExists(manifestPath)
  if (manifestRaw === undefined) return { ok: false, manifest: false, stale: [], missing: [], orphaned: [] }
  const manifest = await readManifest(manifestPath)
  const report = await compileTargets({ ...opts, check: true })
  const sameSource = manifest?.sourceHash === report.sourceHash
  return {
    ok: sameSource && report.stale.length === 0 && report.missing.length === 0 && report.orphaned.length === 0,
    manifest: true,
    sourceHash: report.sourceHash,
    stale: report.stale,
    missing: report.missing,
    orphaned: report.orphaned,
  }
}
