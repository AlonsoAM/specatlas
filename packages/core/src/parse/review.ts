import type { Diagnostic } from '../diagnostics.js'
import { diag } from '../diagnostics.js'
import { parseFrontmatter } from '../frontmatter.js'

export type ReviewVerdict = 'pass' | 'fail' | 'pending'
export type ReviewSeverity = 'bloqueante' | 'menor' | 'sugerencia'

export interface ReviewFinding {
  text: string
  severity: ReviewSeverity
  resolved: boolean
  line: number
  location?: string
}

export interface ReviewFile {
  path: string
  verdict: ReviewVerdict
  by?: string
  date?: string
  findings: ReviewFinding[]
  diagnostics: Diagnostic[]
}

const VERDICT_RE = /^\s*-\s*(?:resultado|verdict)\s*:\s*(pass|fail|pending|aprobado|rechazado|pendiente)\s*$/i
const BY_RE = /^\s*-\s*(?:por|by)\s*:\s*(.+?)\s*$/i
const DATE_RE = /^\s*-\s*(?:fecha|date)\s*:\s*(.+?)\s*$/i
const FINDING_RE = /^\s*-\s*\[([ xX])\]\s+(.+?)\s*$/
const SEVERITY_RE = /\((bloqueante|blocking|menor|minor|sugerencia|nit)\)/i
const LOCATION_RE = /(?:·|\|)\s*(?:Archivo|File)\s*:\s*(.+?)\s*$/i

const VERDICTS: Record<string, ReviewVerdict> = {
  pass: 'pass',
  aprobado: 'pass',
  fail: 'fail',
  rechazado: 'fail',
  pending: 'pending',
  pendiente: 'pending',
}

const SEVERITIES: Record<string, ReviewSeverity> = {
  bloqueante: 'bloqueante',
  blocking: 'bloqueante',
  menor: 'menor',
  minor: 'menor',
  sugerencia: 'sugerencia',
  nit: 'sugerencia',
}

/**
 * La revisión la escribe el agente (o una persona) en `review.md`; aquí solo se
 * lee lo que decide el gate: el veredicto y los hallazgos sin resolver.
 */
export function parseReview(content: string, filePath: string): ReviewFile {
  const fm = parseFrontmatter(content, filePath)
  const lines = fm.body.replace(/\r\n?/g, '\n').split('\n')
  const findings: ReviewFinding[] = []
  const diagnostics: Diagnostic[] = [...fm.diagnostics]
  let verdict: ReviewVerdict | undefined
  let by: string | undefined
  let date: string | undefined

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const lineNo = fm.bodyStartLine + i

    const verdictMatch = VERDICT_RE.exec(line)
    if (verdictMatch) {
      verdict = VERDICTS[(verdictMatch[1] ?? '').toLowerCase()] ?? 'pending'
      continue
    }
    const byMatch = BY_RE.exec(line)
    if (byMatch && by === undefined) {
      const value = (byMatch[1] ?? '').trim()
      if (!/^\(.*\)$/.test(value)) by = value
      continue
    }
    const dateMatch = DATE_RE.exec(line)
    if (dateMatch && date === undefined) {
      const value = (dateMatch[1] ?? '').trim()
      if (!/^\(.*\)$/.test(value)) date = value
      continue
    }

    const findingMatch = FINDING_RE.exec(line)
    if (findingMatch) {
      const raw = findingMatch[2] ?? ''
      const severityMatch = SEVERITY_RE.exec(raw)
      const locationMatch = LOCATION_RE.exec(raw)
      const finding: ReviewFinding = {
        text: raw.replace(SEVERITY_RE, '').replace(LOCATION_RE, '').replace(/\s+·\s*$/, '').trim(),
        severity: SEVERITIES[(severityMatch?.[1] ?? '').toLowerCase()] ?? 'menor',
        resolved: (findingMatch[1] ?? '').toLowerCase() === 'x',
        line: lineNo,
      }
      if (locationMatch?.[1] !== undefined) finding.location = locationMatch[1].trim()
      findings.push(finding)
    }
  }

  if (verdict === undefined) {
    diagnostics.push(
      diag('ATLAS-REVIEW-002', 'warning', 'La revisión no declara resultado', {
        path: filePath,
        suggestion: 'Añade `- resultado: pass` (o `fail`) en la sección Veredicto',
      }),
    )
  }

  const file: ReviewFile = { path: filePath, verdict: verdict ?? 'pending', findings, diagnostics }
  if (by !== undefined) file.by = by
  if (date !== undefined) file.date = date
  return file
}

export function openBlockingFindings(review: ReviewFile): ReviewFinding[] {
  return review.findings.filter((finding) => !finding.resolved && finding.severity === 'bloqueante')
}

/** La revisión está cerrada cuando el veredicto es favorable y no queda nada bloqueante. */
export function reviewPassed(review: ReviewFile | undefined): boolean {
  if (!review) return false
  return review.verdict === 'pass' && openBlockingFindings(review).length === 0
}
