import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export interface PdfOptions {
  title?: string
  project?: string
  generatedAt?: string
}

export interface PdfResult {
  bytes: Uint8Array
  pages: number
}

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 56
const FOOTER = 28

const COLORS = {
  ink: rgb(0.09, 0.11, 0.16),
  muted: rgb(0.38, 0.42, 0.5),
  accent: rgb(0.18, 0.43, 0.88),
  line: rgb(0.84, 0.87, 0.91),
  soft: rgb(0.95, 0.96, 0.98),
  code: rgb(0.12, 0.14, 0.2),
}

const SYMBOLS: Record<string, string> = {
  '◈': '*',
  '◇': '-',
  '▤': '-',
  '▦': '-',
  '✍': 'firma',
  '⌘': 'cmd',
  '⚙': '*',
  '⛨': '*',
  '⇪': '^',
  '⇄': '<->',
  '✓': 'ok',
  '✔': 'ok',
  '✕': 'x',
  '△': '!',
  '◍': 'o',
  '●': '-',
  '◆': '-',
  '▸': '>',
  '⌥': 'alt',
  '✚': '+',
  '∅': '-',
  '◌': 'o',
  '⌸': '!',
  '⛔': '!',
  '◷': 'o',
  '⋯': '...',
  '→': '->',
  '←': '<-',
  '·': '-',
  '≤': '<=',
  '≥': '>=',
}

const CP1252 = new Set([
  '\u2013',
  '\u2014',
  '\u2018',
  '\u2019',
  '\u201A',
  '\u201C',
  '\u201D',
  '\u201E',
  '\u2020',
  '\u2021',
  '\u2022',
  '\u2026',
  '\u2030',
  '\u2039',
  '\u203A',
  '\u20AC',
  '\u2122',
  '\u0152',
  '\u0153',
  '\u0160',
  '\u0161',
  '\u0178',
  '\u017D',
  '\u017E',
])

export function sanitizePdfText(text: string): string {
  // Los caracteres que WinAnsi s\u00ED conoce (\u2014 \u2013 \u00AB \u00BB comillas tipogr\u00E1ficas) se conservan tal cual.
  const mapped = text.replace(/[\u2000-\u2BFF\uE000-\uFAFF]/g, (char) => SYMBOLS[char] ?? (CP1252.has(char) ? char : ''))
  let out = ''
  for (const char of mapped) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0xff || CP1252.has(char)) out += char
  }
  return out
}

type Run = { text: string; bold?: boolean; italic?: boolean; mono?: boolean }
type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lines: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'rule' }

export function markdownToBlocks(markdown: string): Block[] {
  // Los comentarios HTML (marcadores del bloque gestionado) no se imprimen.
  const lines = markdown
    .replace(/\r\n?/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
  const blocks: Block[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (line.trim() === '') {
      index += 1
      continue
    }
    const fence = line.match(/^```/)
    if (fence) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !/^```/.test(lines[index] ?? '')) {
        code.push(lines[index] ?? '')
        index += 1
      }
      index += 1
      blocks.push({ kind: 'code', lines: code })
      continue
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      blocks.push({ kind: 'heading', level: (heading[1] ?? '#').length, text: heading[2] ?? '' })
      index += 1
      continue
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) {
      blocks.push({ kind: 'rule' })
      index += 1
      continue
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const tableLines: string[] = []
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index] ?? '')) {
        tableLines.push(lines[index] ?? '')
        index += 1
      }
      const rows = tableLines
        .filter((row) => !/^\s*\|[\s:|-]+\|\s*$/.test(row))
        .map((row) =>
          row
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim()),
        )
      if (rows.length > 0) blocks.push({ kind: 'table', header: rows[0] ?? [], rows: rows.slice(1) })
      continue
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) {
        quote.push((lines[index] ?? '').replace(/^>\s?/, ''))
        index += 1
      }
      blocks.push({ kind: 'quote', text: quote.join(' ') })
      continue
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (bullet || ordered) {
      const items: string[] = []
      const isOrdered = Boolean(ordered)
      while (index < lines.length) {
        const current = lines[index] ?? ''
        const match = isOrdered ? current.match(/^\s*\d+[.)]\s+(.*)$/) : current.match(/^\s*[-*]\s+(.*)$/)
        if (!match) break
        items.push(match[1] ?? '')
        index += 1
      }
      blocks.push({ kind: 'list', ordered: isOrdered, items })
      continue
    }
    const paragraph: string[] = []
    while (index < lines.length) {
      const current = lines[index] ?? ''
      if (
        current.trim() === '' ||
        /^```/.test(current) ||
        /^(#{1,4})\s+/.test(current) ||
        /^\s*\|.*\|\s*$/.test(current) ||
        /^>\s?/.test(current) ||
        /^\s*[-*]\s+/.test(current) ||
        /^\s*\d+[.)]\s+/.test(current)
      ) {
        break
      }
      paragraph.push(current.trim())
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
  }
  return blocks
}

function inlineRuns(text: string): Run[] {
  const runs: Run[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const token = match[0]
    const start = match.index ?? 0
    if (start > last) runs.push({ text: text.slice(last, start) })
    if (token.startsWith('**')) runs.push({ text: token.slice(2, -2), bold: true })
    else if (token.startsWith('`')) runs.push({ text: token.slice(1, -1), mono: true })
    else if (token.startsWith('*') || token.startsWith('_')) runs.push({ text: token.slice(1, -1), italic: true })
    else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      runs.push({ text: link ? `${link[1]} (${link[2]})` : token })
    }
    last = start + token.length
  }
  if (last < text.length) runs.push({ text: text.slice(last) })
  return runs.length > 0 ? runs : [{ text }]
}

interface Fonts {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
  mono: PDFFont
}

interface Cursor {
  page: PDFPage
  y: number
}

export async function renderPdf(markdown: string, opts: PdfOptions = {}): Promise<PdfResult> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(sanitizePdfText(opts.title ?? 'Documento'))
  pdf.setCreator('SpecAtlas')
  pdf.setProducer('SpecAtlas')
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    mono: await pdf.embedFont(StandardFonts.Courier),
  }
  const blocks = markdownToBlocks(markdown)
  const pages: PDFPage[] = []
  let cursor: Cursor = { page: addPage(pdf, pages), y: MARGIN }

  const bottom = () => A4.height - MARGIN - FOOTER

  const ensure = (space: number): void => {
    if (cursor.y + space <= bottom()) return
    cursor = { page: addPage(pdf, pages), y: MARGIN }
  }

  const leadingFor = (size: number): number => Math.max(13, Math.round(size * 1.5))

  const drawRuns = (runs: Run[], size: number, indent = 0, color = COLORS.ink, marker?: string): void => {
    const leading = leadingFor(size)
    const markerWidth = marker ? fonts.bold.widthOfTextAtSize(sanitizePdfText(marker), size) + 8 : 0
    const available = A4.width - MARGIN * 2 - indent - markerWidth
    const lines = wrapRuns(runs, fonts, size, available)
    lines.forEach((line, index) => {
      ensure(leading)
      if (marker && index === 0) {
        cursor.page.drawText(sanitizePdfText(marker), { x: MARGIN + indent, y: A4.height - cursor.y - size, size, font: fonts.bold, color: COLORS.ink })
      }
      let x = MARGIN + indent + markerWidth
      for (const piece of line) {
        if (piece.text === '') continue
        const font = fontFor(fonts, piece, size)
        const text = sanitizePdfText(piece.text)
        cursor.page.drawText(text, { x, y: A4.height - cursor.y - size, size, font, color })
        x += font.widthOfTextAtSize(text, size)
      }
      cursor.y += leading
    })
  }

  for (const block of blocks) {
    switch (block.kind) {
      case 'heading': {
        const size = block.level === 1 ? 19 : block.level === 2 ? 14.5 : block.level === 3 ? 12 : 11
        cursor.y += block.level === 1 ? 6 : 8
        ensure(size + 22)
        drawRuns([{ text: block.text, bold: true }], size, 0, block.level <= 2 ? COLORS.ink : COLORS.muted)
        if (block.level === 1) {
          cursor.page.drawLine({ start: { x: MARGIN, y: A4.height - cursor.y + 4 }, end: { x: A4.width - MARGIN, y: A4.height - cursor.y + 4 }, thickness: 0.8, color: COLORS.line })
          cursor.y += 6
        }
        cursor.y += 2
        break
      }
      case 'paragraph': {
        drawRuns(inlineRuns(block.text), 10.5)
        cursor.y += 6
        break
      }
      case 'list': {
        block.items.forEach((item, order) => {
          const marker = block.ordered ? `${order + 1}.` : '\u2022'
          drawRuns(inlineRuns(item), 10.5, 6, COLORS.ink, marker)
        })
        cursor.y += 6
        break
      }
      case 'quote': {
        ensure(leadingFor(10.5))
        const startY = cursor.y
        drawRuns(inlineRuns(block.text), 10.5, 14, COLORS.muted)
        cursor.page.drawLine({ start: { x: MARGIN + 4, y: A4.height - startY - 2 }, end: { x: MARGIN + 4, y: A4.height - cursor.y + 10 }, thickness: 2, color: COLORS.accent })
        cursor.y += 6
        break
      }
      case 'code': {
        const size = 9
        const leading = leadingFor(size)
        for (const raw of block.lines) {
          const text = sanitizePdfText(raw).slice(0, 96)
          ensure(leading)
          cursor.page.drawRectangle({ x: MARGIN, y: A4.height - cursor.y - size - 4, width: A4.width - MARGIN * 2, height: leading, color: COLORS.soft })
          cursor.page.drawText(text, { x: MARGIN + 8, y: A4.height - cursor.y - size, size, font: fonts.mono, color: COLORS.code })
          cursor.y += leading
        }
        cursor.y += 6
        break
      }
      case 'table': {
        const columns = Math.max(block.header.length, ...block.rows.map((row) => row.length), 1)
        const total = A4.width - MARGIN * 2
        const weights = Array.from({ length: columns }, (_, index) => {
          const cells = [block.header[index] ?? '', ...block.rows.map((row) => row[index] ?? '')]
          return Math.min(40, Math.max(8, Math.max(...cells.map((cell) => cell.length))))
        })
        const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
        const widths = weights.map((weight) => (weight / weightSum) * total)
        const size = 9.5
        const drawRow = (cells: string[], bold: boolean, background?: typeof COLORS.soft): void => {
          const wrapped = cells.map((cell, index) => wrapRuns(inlineRuns(cell), fonts, size, widths[index]! - 12))
          const height = Math.max(...wrapped.map((lines) => lines.length)) * 13 + 8
          ensure(height + 2)
          let x = MARGIN
          if (background) cursor.page.drawRectangle({ x: MARGIN, y: A4.height - cursor.y - height, width: total, height, color: background })
          wrapped.forEach((lines, index) => {
            let y = cursor.y + 4
            for (const line of lines) {
              let cellX = x + 6
              for (const piece of line) {
                const font = fontFor(fonts, { ...piece, bold: bold || piece.bold }, size)
                cursor.page.drawText(sanitizePdfText(piece.text), { x: cellX, y: A4.height - y - size, size, font, color: COLORS.ink })
                cellX += font.widthOfTextAtSize(piece.text, size)
              }
              y += 13
            }
            x += widths[index]!
          })
          cursor.page.drawRectangle({ x: MARGIN, y: A4.height - cursor.y - height, width: total, height, borderColor: COLORS.line, borderWidth: 0.6 })
          widths.forEach((width, index) => {
            const offset = widths.slice(0, index).reduce((sum, item) => sum + item, 0)
            if (index === 0) return
            cursor.page.drawLine({
              start: { x: MARGIN + offset, y: A4.height - cursor.y },
              end: { x: MARGIN + offset, y: A4.height - cursor.y - height },
              thickness: 0.6,
              color: COLORS.line,
            })
            void width
          })
          cursor.y += height
        }
        if (block.header.length > 0) drawRow(block.header, true, COLORS.soft)
        for (const row of block.rows) drawRow(row, false)
        cursor.y += 8
        break
      }
      case 'rule': {
        ensure(14)
        cursor.page.drawLine({ start: { x: MARGIN, y: A4.height - cursor.y }, end: { x: A4.width - MARGIN, y: A4.height - cursor.y }, thickness: 0.7, color: COLORS.line })
        cursor.y += 12
        break
      }
    }
  }

  const header = sanitizePdfText([opts.project, opts.title].filter(Boolean).join(' \u00b7 '))
  pages.forEach((page, index) => {
    page.drawText(header, { x: MARGIN, y: A4.height - MARGIN + 18, size: 8.5, font: fonts.regular, color: COLORS.muted })
    page.drawLine({ start: { x: MARGIN, y: A4.height - MARGIN + 12 }, end: { x: A4.width - MARGIN, y: A4.height - MARGIN + 12 }, thickness: 0.6, color: COLORS.line })
    const label = sanitizePdfText(`pagina ${index + 1} de ${pages.length}${opts.generatedAt ? ` \u00b7 ${opts.generatedAt}` : ''}`)
    const width = fonts.regular.widthOfTextAtSize(label, 8.5)
    page.drawText(label, { x: A4.width - MARGIN - width, y: FOOTER - 8, size: 8.5, font: fonts.regular, color: COLORS.muted })
  })

  const bytes = await pdf.save()
  return { bytes, pages: pages.length }
}

function addPage(pdf: PDFDocument, pages: PDFPage[]): PDFPage {
  const page = pdf.addPage([A4.width, A4.height])
  pages.push(page)
  return page
}

function fontFor(fonts: Fonts, run: Run, _size: number): PDFFont {
  if (run.mono) return fonts.mono
  if (run.bold) return fonts.bold
  if (run.italic) return fonts.italic
  return fonts.regular
}

function wrapRuns(runs: Run[], fonts: Fonts, size: number, maxWidth: number): Run[][] {
  const lines: Run[][] = []
  let current: Run[] = []
  let width = 0
  const flush = (): void => {
    if (current.length > 0) lines.push(current)
    current = []
    width = 0
  }
  const measure = (run: Run, text: string): number => fontFor(fonts, run, size).widthOfTextAtSize(sanitizePdfText(text), size)
  for (const run of runs) {
    const parts = sanitizePdfText(run.text)
      .split(/(\s+)/)
      .filter((part) => part !== '')
    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        const last = current[current.length - 1]
        if (last && sameStyle(last, run)) last.text += ' '
        else current.push({ ...run, text: ' ' })
        width += measure(run, ' ')
        continue
      }
      const wordWidth = measure(run, part)
      if (width > 0 && width + wordWidth > maxWidth) flush()
      const last = current[current.length - 1]
      if (last && sameStyle(last, run)) last.text += part
      else current.push({ ...run, text: part })
      width += wordWidth
    }
  }
  flush()
  return lines
}

function sameStyle(a: Run, b: Run): boolean {
  return Boolean(a.bold) === Boolean(b.bold) && Boolean(a.italic) === Boolean(b.italic) && Boolean(a.mono) === Boolean(b.mono)
}
