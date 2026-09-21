import path from 'node:path'
import { loadAllAnchors, splitAnchor, writeAnchors, type AnchorsFile, type RequirementAnchor } from './anchors.js'
import type { AtlasConfig } from './config.js'
import type { Diagnostic, Severity } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, readTextIfExists, toPosix, walkFiles } from './fsx.js'

export type DriftKind = 'missing-file' | 'missing-symbol'

export interface DriftFinding {
  domain: string
  requirement: string
  anchor: string
  kind: DriftKind
  specPath: string
}

export interface DriftReport {
  findings: Diagnostic[]
  drifted: DriftFinding[]
  /** Anclas comprobadas (archivos declarados por los requisitos de las specs vivas). */
  checked: number
  domains: number
  mode: AtlasConfig['ci']['drift']
}

function hasGlob(pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?')
}

function globToRegExp(pattern: string): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i] ?? ''
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        out += '.*'
        i += 1
        if (pattern[i + 1] === '/') i += 1
      } else {
        out += '[^/]*'
      }
      continue
    }
    if (char === '?') {
      out += '[^/]'
      continue
    }
    out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${out}$`, 'i')
}

/** El símbolo se busca como palabra completa: vale para cualquier lenguaje. */
export function containsSymbol(content: string, symbol: string): boolean {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'u').test(content)
}

interface Resolution {
  files: string[]
}

async function resolveAnchorFiles(root: string, pattern: string, repoFiles: () => Promise<string[]>): Promise<Resolution> {
  if (!hasGlob(pattern)) {
    const absolute = path.join(root, pattern)
    return { files: (await exists(absolute)) ? [absolute] : [] }
  }
  const re = globToRegExp(toPosix(pattern))
  const all = await repoFiles()
  return { files: all.filter((file) => re.test(toPosix(path.relative(root, file)))).map((file) => file) }
}

export interface DriftOptions {
  root: string
  config: Pick<AtlasConfig, 'ci'>
  /** Anclas ya cargadas (evita releerlas cuando el llamador ya las tiene). */
  anchors?: AnchorsFile[]
}

/**
 * Compara las anclas de las specs vivas con el código real: un ancla que ya no
 * existe significa que el código se movió debajo de la especificación.
 *
 * Nunca bloquea el flujo local: el modo `ci.drift` decide si avisa o falla.
 */
export async function checkDrift(opts: DriftOptions): Promise<DriftReport> {
  const root = path.resolve(opts.root)
  const mode = opts.config.ci.drift
  const severity: Severity = mode === 'strict' ? 'error' : 'warning'
  const anchorFiles = opts.anchors ?? (await loadAllAnchors(root))

  const findings: Diagnostic[] = anchorFiles.flatMap((file) => file.diagnostics)
  const drifted: DriftFinding[] = []
  let checked = 0

  let cached: string[] | undefined
  const repoFiles = async (): Promise<string[]> => {
    cached ??= (await walkFiles(root)).map((entry) => entry.path)
    return cached
  }

  for (const anchorFile of anchorFiles) {
    for (const anchor of anchorFile.anchors) {
      for (const declared of anchor.files) {
        checked += 1
        const { file, symbol } = splitAnchor(declared)
        if (file.length === 0) continue
        const resolved = await resolveAnchorFiles(root, file, repoFiles)
        if (resolved.files.length === 0) {
          drifted.push({ domain: anchorFile.domain, requirement: anchor.requirement, anchor: declared, kind: 'missing-file', specPath: anchorFile.path })
          findings.push(
            diag('ATLAS-DRIFT-001', severity, `${anchor.requirement}: el ancla "${declared}" ya no existe en el código`, {
              path: anchorFile.path,
              suggestion: `Actualiza el ancla en .sdd/specs/${anchorFile.domain}/anchors.yaml o repón el archivo; si el comportamiento cambió, especifícalo con un cambio`,
            }),
          )
          continue
        }
        if (symbol === undefined) continue
        let found = false
        for (const candidate of resolved.files) {
          const content = await readTextIfExists(candidate)
          if (content !== undefined && containsSymbol(content, symbol)) {
            found = true
            break
          }
        }
        if (!found) {
          drifted.push({ domain: anchorFile.domain, requirement: anchor.requirement, anchor: declared, kind: 'missing-symbol', specPath: anchorFile.path })
          findings.push(
            diag('ATLAS-DRIFT-002', severity, `${anchor.requirement}: el ancla "${declared}" apunta a un símbolo que ya no está en el archivo`, {
              path: anchorFile.path,
              suggestion: `Renombra el ancla en .sdd/specs/${anchorFile.domain}/anchors.yaml o recupera el símbolo`,
            }),
          )
        }
      }
    }
  }

  return { findings, drifted, checked, domains: anchorFiles.length, mode }
}

export interface PruneResult {
  domain: string
  removed: Array<{ requirement: string; anchor: string }>
  path: string
}

/**
 * Quita de `anchors.yaml` las anclas que el código ya no tiene. Es una acción
 * explícita: si lo que cambió es el comportamiento, lo que toca es un cambio,
 * no borrar el ancla.
 */
export async function pruneAnchors(root: string, drifted: DriftFinding[], anchorFiles: AnchorsFile[], language: 'es' | 'en' = 'es'): Promise<PruneResult[]> {
  const byDomain = new Map<string, Set<string>>()
  for (const item of drifted) {
    const set = byDomain.get(item.domain) ?? new Set<string>()
    set.add(`${item.requirement}|${item.anchor}`)
    byDomain.set(item.domain, set)
  }

  const results: PruneResult[] = []
  for (const file of anchorFiles) {
    const broken = byDomain.get(file.domain)
    if (!broken || broken.size === 0) continue
    const removed: PruneResult['removed'] = []
    const kept: RequirementAnchor[] = []
    for (const anchor of file.anchors) {
      const files = anchor.files.filter((declared) => {
        if (!broken.has(`${anchor.requirement}|${declared}`)) return true
        removed.push({ requirement: anchor.requirement, anchor: declared })
        return false
      })
      if (files.length > 0) kept.push({ ...anchor, files })
    }
    if (removed.length === 0) continue
    const written = await writeAnchors(root, file.domain, kept, language)
    results.push({ domain: file.domain, removed, path: written })
  }
  return results
}
