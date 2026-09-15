import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import type { Diagnostic } from '../diagnostics.js'
import { diag } from '../diagnostics.js'
import type { Evidence, VerifyFile } from '../model.js'
import { SCENARIO_ID_RE } from '../model.js'

const evidenceSchema = z.object({
  scenario: z.string().optional(),
  method: z.enum(['executable', 'automatic', 'semi', 'manual']),
  command: z.string().optional(),
  result: z.enum(['pass', 'fail', 'skipped']),
  output_hash: z.string().optional(),
  date: z.string(),
  by: z.string(),
  notes: z.string().optional(),
})

const FENCE_RE = /```evidence[ \t]*\r?\n([\s\S]*?)```/g
const HEAD_SCENARIO_RE = /^###\s+(REQ-[A-Z0-9-]+-S\d+)\b/

export function parseVerifyFile(content: string, filePath: string): VerifyFile {
  const diagnostics: Diagnostic[] = []
  const evidence: Evidence[] = []
  const normalized = content.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')

  for (const match of normalized.matchAll(FENCE_RE)) {
    const startIndex = match.index ?? 0
    const line = normalized.slice(0, startIndex).split('\n').length
    const raw = match[1] ?? ''
    let data: unknown
    try {
      data = parseYaml(raw)
    } catch (err) {
      diagnostics.push(diag('LINT-EVD-000', 'error', `Bloque evidence con YAML inválido: ${(err as Error).message}`, { path: filePath, line }))
      continue
    }
    const parsed = evidenceSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        diagnostics.push(diag('LINT-EVD-001', 'error', `Evidencia inválida (${issue.path.join('.') || 'raíz'}): ${issue.message}`, { path: filePath, line }))
      }
      continue
    }
    const value = parsed.data
    let scenario = value.scenario?.toUpperCase()
    if (!scenario) {
      scenario = findScenarioHeading(lines, line - 1)
    }
    if (!scenario) {
      diagnostics.push(diag('LINT-EVD-002', 'error', 'La evidencia no indica escenario (clave scenario: o encabezado ### REQ-…-S1)', { path: filePath, line }))
      continue
    }
    if (!SCENARIO_ID_RE.test(scenario)) {
      diagnostics.push(diag('LINT-EVD-002', 'error', `Escenario mal formado en evidencia: ${scenario}`, { path: filePath, line }))
    }
    if (value.method === 'executable' && !value.command) {
      diagnostics.push(diag('LINT-EVD-001', 'error', `La evidencia ${scenario} es ejecutable pero no declara command`, { path: filePath, line }))
    }
    if (value.output_hash !== undefined && !/^sha256:[0-9a-f]{8,64}$/i.test(value.output_hash)) {
      diagnostics.push(diag('LINT-EVD-003', 'warning', `output_hash con formato inesperado en ${scenario}`, { path: filePath, line, suggestion: 'Formato: sha256:<hex>' }))
    }
    const ev: Evidence = {
      scenario,
      method: value.method,
      result: value.result,
      date: value.date,
      by: value.by,
      line,
    }
    if (value.command !== undefined) ev.command = value.command
    if (value.output_hash !== undefined) ev.outputHash = value.output_hash
    if (value.notes !== undefined) ev.notes = value.notes
    evidence.push(ev)
  }

  return { path: filePath, evidence, diagnostics }
}

function findScenarioHeading(lines: string[], blockLineIndex: number): string | undefined {
  for (let i = blockLineIndex; i >= 0; i -= 1) {
    const m = HEAD_SCENARIO_RE.exec(lines[i] ?? '')
    if (m) return (m[1] ?? '').toUpperCase()
    if (/^###\s+/.test(lines[i] ?? '') && !HEAD_SCENARIO_RE.test(lines[i] ?? '')) {
      // otro encabezado de nivel 3 sin escenario: seguir buscando hacia arriba
      continue
    }
  }
  return undefined
}
