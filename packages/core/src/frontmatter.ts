import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'

export interface FrontmatterResult {
  data: Record<string, unknown>
  body: string
  bodyStartLine: number
  diagnostics: Diagnostic[]
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function parseFrontmatter(content: string, filePath?: string): FrontmatterResult {
  const diagnostics: Diagnostic[] = []
  const match = FM_RE.exec(content)
  if (!match) {
    return { data: {}, body: content, bodyStartLine: 1, diagnostics }
  }
  const rawYaml = match[1] ?? ''
  let data: unknown
  try {
    data = parseYaml(rawYaml) ?? {}
  } catch (err) {
    diagnostics.push(
      diag('LINT-STR-000', 'error', `Frontmatter YAML inválido: ${(err as Error).message}`, {
        path: filePath,
        line: 1,
      }),
    )
    return { data: {}, body: content.slice(match[0].length), bodyStartLine: 1, diagnostics }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    diagnostics.push(diag('LINT-STR-000', 'error', 'El frontmatter debe ser un objeto YAML', { path: filePath, line: 1 }))
    data = {}
  }
  const consumed = match[0].split('\n').length - 1
  return { data: data as Record<string, unknown>, body: content.slice(match[0].length), bodyStartLine: consumed + 1, diagnostics }
}

export function emitFrontmatter(data: Record<string, unknown>, body: string): string {
  if (Object.keys(data).length === 0) return body
  const yaml = stringifyYaml(data, { lineWidth: 120 }).trimEnd()
  return `---\n${yaml}\n---\n\n${body}`
}

export function getString(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key]
  return typeof v === 'string' ? v : undefined
}

export function getNumber(data: Record<string, unknown>, key: string): number | undefined {
  const v = data[key]
  return typeof v === 'number' ? v : undefined
}
