import type { Diagnostic } from '../diagnostics.js'
import { diag } from '../diagnostics.js'
import type { Delta, DeltaOp, Rename, Requirement } from '../model.js'
import { parseRequirementBlocks } from './spec.js'

interface SectionDef {
  op: DeltaOp
  re: RegExp
}

const NOUN = '(?:Requirements?|Requisitos?)'

function sectionRe(ops: string[]): RegExp {
  const words = ops.join('|')
  return new RegExp(`^##\\s+(?:(?:${words})\\s+${NOUN}|${NOUN}\\s+(?:${words}))\\s*$`, 'i')
}

const SECTION_DEFS: SectionDef[] = [
  { op: 'added', re: sectionRe(['ADDED', 'AGREGADOS', 'AGREGADAS', 'AÑADIDOS', 'AÑADIDAS']) },
  { op: 'modified', re: sectionRe(['MODIFIED', 'MODIFICADOS', 'MODIFICADAS']) },
  { op: 'removed', re: sectionRe(['REMOVED', 'ELIMINADOS', 'ELIMINADAS', 'QUITADOS', 'QUITADAS']) },
  { op: 'renamed', re: sectionRe(['RENAMED', 'RENOMBRADOS', 'RENOMBRADAS']) },
]

const FROM_RE = /^\s*-?\s*(?:FROM|DESDE):\s*(REQ-[A-Z0-9-]+)\s*(?:—|-|–)\s*(.+?)\s*$/i
const TO_RE = /^\s*-?\s*(?:TO|HACIA):\s*(REQ-[A-Z0-9-]+)\s*(?:—|-|–)\s*(.+?)\s*$/i
const REASON_RE = /^-\s*(?:Reason|Motivo|Razón):\s*(.+?)\s*$/im
const MIGRATION_RE = /^-\s*(?:Migration|Migración):\s*(.+?)\s*$/im

export function parseDelta(content: string, filePath: string): Delta {
  const diagnostics: Diagnostic[] = []
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const added: Requirement[] = []
  const modified: Requirement[] = []
  const removed: Requirement[] = []
  const renamed: Rename[] = []
  const sectionsFound: DeltaOp[] = []

  let currentOp: DeltaOp | undefined
  let buffer: string[] = []
  let bufferStart = 1

  const flush = (): void => {
    if (!currentOp || buffer.length === 0) {
      buffer = []
      return
    }
    const body = buffer.join('\n')
    if (currentOp === 'added' || currentOp === 'modified') {
      const parsed = parseRequirementBlocks(body, bufferStart, filePath)
      diagnostics.push(...parsed.diagnostics)
      if (currentOp === 'added') added.push(...parsed.requirements)
      else modified.push(...parsed.requirements)
    } else if (currentOp === 'removed') {
      const parsed = parseRequirementBlocks(body, bufferStart, filePath)
      diagnostics.push(...parsed.diagnostics)
      for (const req of parsed.requirements) {
        const blockText = body
        if (!REASON_RE.test(extractBlock(blockText, req.id))) {
          diagnostics.push(diag('LINT-DLT-002', 'error', `El requisito eliminado ${req.id} no declara "Motivo:"`, { path: filePath, line: req.line, suggestion: 'Añade - Motivo: ... y - Migración: ...' }))
        }
        const hasMigration = MIGRATION_RE.test(extractBlock(blockText, req.id))
        if (!hasMigration) {
          diagnostics.push(diag('LINT-DLT-002', 'error', `El requisito eliminado ${req.id} no declara "Migración:"`, { path: filePath, line: req.line, suggestion: 'Añade - Migración: ... indicando cómo migrar' }))
        }
        removed.push(req)
      }
    } else if (currentOp === 'renamed') {
      let pendingFrom: { id: string; title: string; line: number } | undefined
      for (let i = 0; i < buffer.length; i += 1) {
        const line = buffer[i] ?? ''
        const from = FROM_RE.exec(line)
        if (from) {
          pendingFrom = { id: (from[1] ?? '').toUpperCase(), title: from[2] ?? '', line: bufferStart + i }
          continue
        }
        const to = TO_RE.exec(line)
        if (to) {
          if (!pendingFrom) {
            diagnostics.push(diag('LINT-DLT-003', 'error', 'RENAMED: "TO/HACIA" sin "FROM/DESDE" previo', { path: filePath, line: bufferStart + i }))
            continue
          }
          renamed.push({ from: { id: pendingFrom.id, title: pendingFrom.title }, to: { id: (to[1] ?? '').toUpperCase(), title: to[2] ?? '' }, line: pendingFrom.line })
          pendingFrom = undefined
        }
      }
      if (pendingFrom) {
        diagnostics.push(diag('LINT-DLT-003', 'error', `RENAMED: ${pendingFrom.id} sin línea "TO/HACIA"`, { path: filePath, line: pendingFrom.line }))
      }
    }
    buffer = []
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const section = SECTION_DEFS.find((s) => s.re.test(line))
    if (section) {
      flush()
      currentOp = section.op
      sectionsFound.push(section.op)
      bufferStart = i + 2
      continue
    }
    if (currentOp) buffer.push(line)
  }
  flush()

  const ops = new Set(sectionsFound)
  for (const req of modified) {
    if (req.scenarios.length === 0) {
      diagnostics.push(diag('LINT-DLT-001', 'error', `MODIFIED ${req.id} debe copiar el bloque completo (incluye escenarios)`, { path: filePath, line: req.line, suggestion: 'Copia el bloque completo de la spec viva y edítalo' }))
    }
  }

  const delta: Delta = { path: filePath, added, modified, removed, renamed, sectionsFound: [...ops], diagnostics }
  return delta
}

function extractBlock(body: string, reqId: string): string {
  const lines = body.split('\n')
  const start = lines.findIndex((l) => l.includes(reqId))
  if (start < 0) return body
  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^###\s+/.test(lines[i] ?? '')) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join('\n')
}
