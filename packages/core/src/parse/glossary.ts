import type { Diagnostic } from '../diagnostics.js'
import { diag } from '../diagnostics.js'

export interface GlossaryTerm {
  term: string
  definition: string
  synonyms: string[]
}

export interface ParsedGlossary {
  terms: GlossaryTerm[]
  diagnostics: Diagnostic[]
}

const HEADER_KEYS = new Set(['término', 'termino', 'term', 'definición', 'definicion', 'definition', 'sinónimos', 'sinonimos', 'synonyms'])
const SEPARATOR_RE = /^:?-{2,}:?$/

export function parseGlossary(md: string, filePath?: string): ParsedGlossary {
  const diagnostics: Diagnostic[] = []
  const terms: GlossaryTerm[] = []
  const lines = md.replace(/\r\n?/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? ''
    if (!raw.trim().startsWith('|')) continue
    const inner = raw.trim().replace(/^\|/, '').replace(/\|$/, '')
    const cells = inner.split('|').map((c) => c.trim())
    if (cells.length < 2) {
      diagnostics.push(diag('LINT-GLO-001', 'warning', 'Fila del glosario sin columnas suficientes', { path: filePath, line: i + 1 }))
      continue
    }
    const first = cells[0] ?? ''
    if (HEADER_KEYS.has(first.toLowerCase()) || SEPARATOR_RE.test(first)) continue

    const term = first
    const definition = cells[1] ?? ''
    if (term === '' || definition === '') {
      diagnostics.push(diag('LINT-GLO-002', 'warning', 'Término o definición vacíos en el glosario', { path: filePath, line: i + 1 }))
      continue
    }
    const synonyms = (cells[2] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    terms.push({ term, definition, synonyms })
  }

  return { terms, diagnostics }
}
