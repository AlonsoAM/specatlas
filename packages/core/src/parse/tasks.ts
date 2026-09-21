import type { Diagnostic } from '../diagnostics.js'
import { diag } from '../diagnostics.js'
import { parseFrontmatter } from '../frontmatter.js'
import type { Task, TaskBlock, TasksFile } from '../model.js'
import { TASK_ID_RE } from '../model.js'

export const BLOCK_HEAD_RE = /^##\s+(?:Block|Bloque)\s+([A-Za-z0-9._-]+)\s*(?:—|-|–)\s*(.+?)\s*$/
export const TASK_LINE_RE = /^(\s*)-\s*\[([ xX])\]\s+(T[A-Za-z0-9]+\.\d+)\s+(.+?)\s*$/

const KEY_ALIASES: Record<string, string> = {
  files: 'files',
  archivos: 'files',
  covers: 'covers',
  cubre: 'covers',
  depends: 'depends',
  'depende de': 'depends',
  rollback: 'rollback',
  reversión: 'rollback',
  'infra': 'infra',
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Las claves se aceptan con o sin acentos ("Reversion" ≡ "Reversión").
const KEY_ALIASES_NORMALIZED: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_ALIASES).map(([key, value]) => [normalizeKey(key), value]),
)

const SEPARATOR = /\s+·\s+/
// Los metadatos también se aceptan como sub-viñetas debajo de la tarea:
//   - [ ] T1.1 Formulario
//     - Archivos: src/login.ts
//     - Cubre: REQ-AUTH-001-S1
const SUBBULLET_RE = /^(\s+)[-*]\s*([A-Za-zÁÉÍÓÚÑáéíóúñ ]+)\s*:\s*(.*)$/
const BARE_SUBBULLET_RE = /^(\s+)[-*]\s*([A-Za-zÁÉÍÓÚÑáéíóúñ ]+)\s*$/

export function parseTasksFile(content: string, filePath: string): TasksFile {
  const fm = parseFrontmatter(content, filePath)
  const lines = fm.body.replace(/\r\n?/g, '\n').split('\n')
  const diagnostics: Diagnostic[] = []
  const blocks: TaskBlock[] = []
  let current: TaskBlock | undefined
  let done = 0
  let total = 0

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const lineNo = fm.bodyStartLine + i

    const blockMatch = BLOCK_HEAD_RE.exec(line)
    if (blockMatch) {
      current = { id: blockMatch[1] ?? '', title: blockMatch[2] ?? '', line: lineNo, tasks: [] }
      blocks.push(current)
      continue
    }
    if (/^##\s+/.test(line)) {
      current = undefined
      continue
    }

    const taskMatch = TASK_LINE_RE.exec(line)
    if (taskMatch) {
      const isDone = (taskMatch[2] ?? '').toLowerCase() === 'x'
      const id = taskMatch[3] ?? ''
      const rest = taskMatch[4] ?? ''
      if (!TASK_ID_RE.test(id)) {
        diagnostics.push(diag('LINT-STR-003', 'error', `Id de tarea mal formado: ${id}`, { path: filePath, line: lineNo, suggestion: 'Formato: T<bloque>.<secuencia>, por ejemplo T1.2' }))
      }
      if (!current) {
        current = { id: id.split('.')[0]?.replace(/^T/, '') ?? '?', title: '(sin bloque)', line: lineNo, tasks: [] }
        blocks.push(current)
        diagnostics.push(diag('LINT-STR-004', 'warning', `Tarea ${id} fuera de un bloque (## Block N — Título)`, { path: filePath, line: lineNo }))
      }
      const parts = rest.split(SEPARATOR)
      const textParts: string[] = []
      const fields: Record<string, string> = {}
      let metaStarted = false
      for (const part of parts) {
        const kv = /^([A-Za-zÁÉÍÓÚÑáéíóúñ ]+)\s*:\s*(.*)$/.exec(part)
        const key = kv ? KEY_ALIASES_NORMALIZED[normalizeKey(kv[1] ?? '')] : undefined
        const bareKey = KEY_ALIASES_NORMALIZED[normalizeKey(part)]
        if (kv && key) {
          metaStarted = true
          fields[key] = (kv[2] ?? '').trim()
        } else if (bareKey) {
          metaStarted = true
          fields[bareKey] = ''
        } else if (!metaStarted) {
          textParts.push(part)
        }
      }
      // Sub-viñetas: mismo significado que `· Clave: valor`, con el formato que
      // sale natural al escribir markdown a mano.
      const indent = (taskMatch[1] ?? '').length
      let lookahead = i + 1
      while (lookahead < lines.length) {
        const next = lines[lookahead] ?? ''
        if (next.trim() === '') {
          lookahead += 1
          continue
        }
        if (TASK_LINE_RE.test(next) || /^#{1,6}\s+/.test(next)) break
        const pair = SUBBULLET_RE.exec(next)
        const bare = pair ? undefined : BARE_SUBBULLET_RE.exec(next)
        const match = pair ?? bare
        if (!match || (match[1] ?? '').length <= indent) break
        const subKey = KEY_ALIASES_NORMALIZED[normalizeKey(match[2] ?? '')]
        if (!subKey) break
        fields[subKey] = pair ? (pair[3] ?? '').trim() : ''
        i = lookahead
        lookahead += 1
      }

      const text = textParts.join(' · ').trim()
      const task: Task = {
        id,
        block: current.id,
        text,
        done: isDone,
        files: splitList(fields['files']),
        covers: splitList(fields['covers']).map((c) => c.toUpperCase()),
        dependsOn: splitList(fields['depends']).map((d) => d.toUpperCase()),
        infra: fields['infra'] !== undefined,
        line: lineNo,
      }
      if (fields['rollback'] !== undefined) task.rollback = fields['rollback']
      if (task.files.length === 0 && !task.infra) {
        diagnostics.push(
          diag('LINT-TSK-001', 'warning', `La tarea ${id} no declara Archivos:`, {
            path: filePath,
            line: lineNo,
            suggestion: 'Añade `· Archivos: ruta/archivo.ext` en la misma línea, o una sub-viñeta `- Archivos: ruta/archivo.ext` debajo',
          }),
        )
      }
      if (task.covers.length === 0 && !task.infra) {
        diagnostics.push(
          diag('TRACE-004', 'error', `La tarea ${id} no declara Cubre:`, {
            path: filePath,
            line: lineNo,
            suggestion: 'Añade `· Cubre: REQ-…-S1` en la misma línea, o una sub-viñeta `- Cubre: REQ-…-S1` debajo; si es infraestructura, márcala con `· Infra`',
          }),
        )
      }
      current.tasks.push(task)
      total += 1
      if (isDone) done += 1
      continue
    }
  }

  return { path: filePath, blocks, diagnostics, counts: { done, total } }
}

function splitList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}
