import type { ClarifyFile, ClarifyItem } from '../model.js'
import { parseFrontmatter } from '../frontmatter.js'

const OPEN_RE = /^\s*-\s*\[\s\]\s+(.+?)\s*$/
const DONE_RE = /^\s*-\s*\[[xX]\]\s+(.+?)\s*$/
const ANSWER_SEPARATOR = ' — '

function splitAnswer(raw: string): { text: string; answer?: string } {
  const index = raw.indexOf(ANSWER_SEPARATOR)
  if (index === -1) return { text: raw.trim() }
  return { text: raw.slice(0, index).trim(), answer: raw.slice(index + ANSWER_SEPARATOR.length).trim() }
}

export function parseClarify(content: string, filePath: string): ClarifyFile {
  const fm = parseFrontmatter(content, filePath)
  const lines = fm.body.replace(/\r\n?/g, '\n').split('\n')
  const open: ClarifyItem[] = []
  const resolved: ClarifyItem[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const lineNo = fm.bodyStartLine + i
    const done = DONE_RE.exec(line)
    if (done) {
      const item = splitAnswer(done[1] ?? '')
      resolved.push({ text: item.text, line: lineNo, ...(item.answer !== undefined ? { answer: item.answer } : {}) })
      continue
    }
    const pending = OPEN_RE.exec(line)
    if (pending) open.push({ text: pending[1] ?? '', line: lineNo })
  }

  return { path: filePath, open, resolved, diagnostics: [] }
}
