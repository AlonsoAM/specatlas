import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import powershell from 'highlight.js/lib/languages/powershell'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const LANGUAGES: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  bash, csharp, css, dockerfile, go, java, javascript, js: javascript, json, markdown, php, powershell,
  python, ruby, rust, sql, ts: typescript, typescript, xml, html: xml, yaml, yml: yaml,
}

let registered = false
function ensureLanguages(): void {
  if (registered) return
  for (const [name, definition] of Object.entries(LANGUAGES)) {
    try {
      hljs.registerLanguage(name, definition)
    } catch {
      // idioma ya registrado
    }
  }
  registered = true
}

export interface DesignTokens {
  accent: string
  accentSoft: string
  bg: string
  card: string
  ink: string
  muted: string
  line: string
  codeBg: string
  codeInk: string
  ok: string
  warn: string
  danger: string
  fontSans: string
  fontMono: string
  radius: string
}

export const defaultTokens: DesignTokens = {
  accent: '#0f766e',
  accentSoft: '#ccfbf1',
  bg: '#f8fafc',
  card: '#ffffff',
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  codeBg: '#0b1220',
  codeInk: '#e2e8f0',
  ok: '#15803d',
  warn: '#b45309',
  danger: '#dc2626',
  fontSans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  radius: '12px',
}

export type RenderTheme = 'auto' | 'light' | 'dark' | 'vscode'

export interface RenderOptions {
  theme?: RenderTheme
  tokens?: Partial<DesignTokens>
  highlight?: boolean
  mermaid?: 'code' | 'script'
  mermaidScriptUri?: string
  nonce?: string
  cspSource?: string
  title?: string
  description?: string
  bodyClass?: string
  toc?: boolean
  tocTitle?: string
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function inlineMarkdown(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+|#[^)\s]+)\)/g, '<a href="$2">$1</a>')
  return out
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function renderStyles(opts: RenderOptions = {}): string {
  const tokens = { ...defaultTokens, ...opts.tokens }
  const vars = Object.entries(tokens)
    .map(([key, value]) => `  --atlas-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${value};`)
    .join('\n')

  const theme = opts.theme ?? 'auto'
  const base = `:root {\n${vars}\n  color-scheme: ${theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'light dark'};\n}`
  const autoDark =
    theme === 'auto'
      ? `@media (prefers-color-scheme: dark) {\n:root {\n  --atlas-bg: #0b1220; --atlas-card: #111a2c; --atlas-ink: #e2e8f0; --atlas-muted: #94a3b8; --atlas-line: #1e293b; --atlas-accent: #2dd4bf; --atlas-accent-soft: #134e4a; --atlas-ok: #4ade80; --atlas-warn: #f59e0b;\n}\n}`
      : ''
  const vscode =
    theme === 'vscode'
      ? `:root {\n  --atlas-bg: var(--vscode-editor-background, #1f1f1f);\n  --atlas-card: var(--vscode-editorWidget-background, #252526);\n  --atlas-ink: var(--vscode-foreground, #cccccc);\n  --atlas-muted: var(--vscode-descriptionForeground, #9d9d9d);\n  --atlas-line: var(--vscode-panel-border, #3c3c3c);\n  --atlas-accent: var(--vscode-textLink-foreground, #3794ff);\n  --atlas-accent-soft: var(--vscode-textBlockQuote-background, #2a2d2e);\n  --atlas-code-bg: var(--vscode-textCodeBlock-background, #2a2d2e);\n  --atlas-code-ink: var(--vscode-editor-foreground, #d4d4d4);\n  --atlas-ok: var(--vscode-charts-green, #89d185);\n  --atlas-warn: var(--vscode-charts-orange, #d18616);\n  --atlas-danger: var(--vscode-charts-red, #f14c4c);\n  --atlas-font-sans: var(--vscode-font-family, sans-serif);\n  --atlas-font-mono: var(--vscode-editor-font-family, monospace);\n}`
      : ''

  return `${base}\n${autoDark}\n${vscode}\n${STYLES}`
}

const STYLES = `
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--atlas-bg); color: var(--atlas-ink); font: 15px/1.65 var(--atlas-font-sans); }
.atlas-doc { max-width: 900px; margin: 0 auto; padding: 28px 22px 80px; }
h1, h2, h3, h4 { line-height: 1.25; margin: 1.4em 0 .5em; }
h1 { font-size: 26px; border-bottom: 1px solid var(--atlas-line); padding-bottom: 10px; }
h2 { font-size: 20px; }
h3 { font-size: 17px; }
h4 { font-size: 15px; color: var(--atlas-muted); }
p { margin: .6em 0; }
a { color: var(--atlas-accent); }
code { font-family: var(--atlas-font-mono); background: color-mix(in srgb, var(--atlas-line) 55%, transparent); padding: 1px 5px; border-radius: 6px; font-size: 13px; }
pre { background: var(--atlas-code-bg); color: var(--atlas-code-ink); padding: 14px 16px; border-radius: var(--atlas-radius); overflow: auto; font-size: 13px; line-height: 1.55; }
pre code { background: transparent; color: inherit; padding: 0; }
pre .hljs-keyword, pre .hljs-selector-tag, pre .hljs-built_in, pre .hljs-name { color: #7dd3fc; }
pre .hljs-string, pre .hljs-attr, pre .hljs-template-variable { color: #86efac; }
pre .hljs-number, pre .hljs-literal { color: #fca5a5; }
pre .hljs-comment, pre .hljs-quote { color: #94a3b8; font-style: italic; }
pre .hljs-title, pre .hljs-function, pre .hljs-section { color: #fde68a; }
pre .hljs-type, pre .hljs-class { color: #c4b5fd; }
pre .hljs-variable, pre .hljs-params { color: #e2e8f0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 14px; }
.table-wrap { overflow-x: auto; margin: 1em 0; }
.table-wrap table { margin: 0; }
th, td { border: 1px solid var(--atlas-line); padding: 9px 12px; text-align: left; vertical-align: top; }
th { background: color-mix(in srgb, var(--atlas-accent-soft) 45%, transparent); }
tbody tr:nth-child(even) td { background: color-mix(in srgb, var(--atlas-line) 9%, transparent); }
tbody tr:hover td { background: color-mix(in srgb, var(--atlas-accent) 7%, transparent); }
th code, td code { white-space: nowrap; }
blockquote, .callout { border-left: 4px solid var(--atlas-accent); background: color-mix(in srgb, var(--atlas-accent-soft) 35%, transparent); margin: 1em 0; padding: 10px 14px; border-radius: 8px; }
.callout p { margin: .3em 0; }
hr { border: 0; border-top: 1px solid var(--atlas-line); margin: 1.8em 0; }
ul, ol { padding-left: 1.4em; }
li { margin: .25em 0; }
ul.checklist { list-style: none; padding-left: .2em; }
ul.checklist > li.task-item { margin: .55em 0; padding: .45em .6em .5em; border: 1px solid color-mix(in srgb, var(--atlas-line) 70%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--atlas-card) 55%, transparent); }
ul.checklist > li.task-item.done { opacity: .72; }
.task-box { font-size: 14px; margin-right: 4px; }
.task-title { font-weight: 600; }
.task-meta { display: flex; flex-wrap: wrap; gap: 6px; margin: 5px 0 1px 20px; }
.meta-line { display: flex; flex-wrap: wrap; gap: 6px; margin: .2em 0 .35em; }
.meta-chip { font-family: var(--atlas-font-mono); font-size: 11.5px; color: var(--atlas-muted); border: 1px solid color-mix(in srgb, var(--atlas-line) 75%, transparent); background: color-mix(in srgb, var(--atlas-line) 18%, transparent); border-radius: 999px; padding: 2px 9px; }
.meta-chip b { color: var(--atlas-ink); font-weight: 600; }
small, .muted { color: var(--atlas-muted); }
.mermaid-block pre { background: color-mix(in srgb, var(--atlas-accent-soft) 25%, transparent); color: var(--atlas-ink); }
.diagram-tools { display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 6px; }
.diagram-tools button { background: transparent; color: var(--atlas-muted); border: 1px solid color-mix(in srgb, var(--atlas-line) 75%, transparent); border-radius: 6px; padding: 2px 9px; font: inherit; line-height: 1.4; cursor: pointer; min-width: 30px; }
.diagram-tools button:hover { color: var(--atlas-ink); border-color: var(--atlas-ink); }
.diagram-tools button[data-diagram-fit].active { color: var(--atlas-ink); border-color: var(--atlas-accent); }
.diagram-tools [data-diagram-level] { min-width: 52px; font-variant-numeric: tabular-nums; }
.diagram-canvas { overflow: auto; border: 1px solid color-mix(in srgb, var(--atlas-line) 60%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--atlas-card) 60%, transparent); padding: 12px; cursor: grab; }
.diagram-canvas.panning { cursor: grabbing; user-select: none; }
.diagram-canvas pre.mermaid { margin: 0; background: transparent; }
.diagram-canvas svg { display: block; margin: 0 auto; max-width: 100%; height: auto; }
.diagram-canvas[data-fit="off"] svg { max-width: none; margin: 0; }
.mermaid-block.diagram-fullscreen { position: fixed; inset: 0; z-index: 999; margin: 0; padding: 12px; background: var(--atlas-bg); display: flex; flex-direction: column; }
.mermaid-block.diagram-fullscreen .diagram-canvas { flex: 1; }
.atlas-toc { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius); background: var(--atlas-card); padding: 16px 22px; margin: 0 0 26px; }
.atlas-toc h2 { margin: 0 0 8px; font-size: 15px; text-transform: uppercase; letter-spacing: .1em; color: var(--atlas-muted); }
.atlas-toc ul { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 28px; }
.atlas-toc li { margin: 3px 0; break-inside: avoid; }
.atlas-toc .toc-h1 { font-weight: 700; margin-top: 10px; }
.atlas-toc .toc-h2 { padding-left: 14px; }
.atlas-toc .toc-h3 { padding-left: 28px; font-size: 13px; }
@media (max-width: 720px) { .atlas-toc ul { columns: 1; } }
`

function highlightCode(code: string, language: string | undefined, enabled: boolean): string {
  if (!enabled) return `<pre><code>${escapeHtml(code)}</code></pre>`
  ensureLanguages()
  const lang = language && hljs.getLanguage(language) ? language : undefined
  try {
    const result = lang ? hljs.highlight(code, { language: lang, ignoreIllegals: true }) : hljs.highlightAuto(code)
    return `<pre><code class="hljs${lang ? ` language-${escapeHtml(lang)}` : ''}">${result.value}</code></pre>`
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`
  }
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index] ?? ''
    if (char === '\\' && trimmed[index + 1] === '|') {
      current += '|'
      index += 1
      continue
    }
    if (char === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export interface TocEntry {
  level: number
  text: string
  id: string
}

export function tableOfContents(markdown: string, maxLevel = 2): TocEntry[] {
  const entries: TocEntry[] = []
  let inFence = false
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^(#{1,4})\s+(.*)$/.exec(line)
    if (!match) continue
    const level = (match[1] ?? '').length
    if (level > maxLevel) continue
    const text = match[2] ?? ''
    entries.push({ level, text, id: slugify(text) })
  }
  return entries
}

function renderToc(entries: TocEntry[], title: string): string {
  if (entries.length === 0) return ''
  const items = entries
    .map((entry) => `<li class="toc-h${entry.level}"><a href="#${entry.id}">${inlineMarkdown(entry.text)}</a></li>`)
    .join('')
  return `<nav class="atlas-toc"><h2>${escapeHtml(title)}</h2><ul>${items}</ul></nav>\n`
}

export function renderMarkdown(markdown: string, opts: RenderOptions = {}): string {
  const highlight = opts.highlight !== false
  const mermaidMode = opts.mermaid ?? 'code'
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  const paragraph: string[] = []
  const flush = (): void => {
    if (paragraph.length > 0) {
      out.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
      paragraph.length = 0
    }
  }

  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (/^```/.test(line)) {
      flush()
      const lang = line.slice(3).trim().toLowerCase()
      const code: string[] = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i] ?? '')) {
        code.push(lines[i] ?? '')
        i += 1
      }
      i += 1
      const source = code.join('\n')
      if (lang === 'mermaid') {
        if (mermaidMode === 'script' && opts.mermaidScriptUri) {
          out.push(`<div class="mermaid-block">
  <div class="diagram-tools" role="toolbar" aria-label="Herramientas del diagrama">
    <button type="button" data-diagram-zoom="out" title="Alejar (Ctrl + rueda)" aria-label="Alejar">−</button>
    <button type="button" data-diagram-zoom="reset" data-diagram-level title="Tamaño original" aria-label="Tamaño original">100%</button>
    <button type="button" data-diagram-zoom="in" title="Acercar (Ctrl + rueda)" aria-label="Acercar">＋</button>
    <button type="button" data-diagram-fit title="Ajustar al ancho / tamaño real" aria-label="Ajustar al ancho">⤢</button>
    <button type="button" data-diagram-fullscreen title="Pantalla completa (Esc para salir)" aria-label="Pantalla completa">⛶</button>
    <button type="button" data-diagram-download title="Descargar SVG" aria-label="Descargar SVG">⤓</button>
  </div>
  <div class="diagram-canvas"><pre class="mermaid">${escapeHtml(source)}</pre></div>
</div>`)
        } else {
          out.push(
            `<div class="mermaid-block callout"><pre class="mermaid">${escapeHtml(source)}</pre><p><small>Diagrama mermaid — visible con la vista previa de Markdown del editor.</small></p></div>`,
          )
        }
      } else {
        out.push(highlightCode(source, lang === '' ? undefined : lang, highlight))
      }
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      const level = (heading[1] ?? '').length
      const text = heading[2] ?? ''
      out.push(`<h${level} id="${slugify(text)}">${inlineMarkdown(text)}</h${level}>`)
      i += 1
      continue
    }

    if (/^(---|\*\*\*)\s*$/.test(line)) {
      flush()
      out.push('<hr>')
      i += 1
      continue
    }

    if (/^>\s?\[!/.test(line)) {
      flush()
      const kindMatch = /^>\s?\[!(\w+)\]\s*(.*)$/.exec(line)
      const kind = (kindMatch?.[1] ?? 'NOTE').toLowerCase()
      const first = kindMatch?.[2] ?? ''
      const quote: string[] = first ? [first] : []
      i += 1
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quote.push((lines[i] ?? '').replace(/^>\s?/, ''))
        i += 1
      }
      out.push(`<div class="callout callout-${escapeHtml(kind)}"><p>${inlineMarkdown(quote.join(' '))}</p></div>`)
      continue
    }

    if (/^>\s?/.test(line)) {
      flush()
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quote.push((lines[i] ?? '').replace(/^>\s?/, ''))
        i += 1
      }
      const chips: string[] = []
      const prose: string[] = []
      const chipFor = (label: string, value: string): string => `<span class="meta-chip"><b>${inlineMarkdown(label)}:</b> ${inlineMarkdown(value)}</span>`
      for (const rawLine of quote) {
        const line = rawLine.trim()
        if (!line) continue
        const whole = /^(?:\*{0,2})([\p{L}][\p{L}\s/()-]{1,32}?)(?:\*{0,2})\s*:\s*(.+)$/u.exec(line)
        const hasInlineLabels = / · \s*\*{0,2}[\p{L}][\p{L}\s/()-]{1,32}\*{0,2}:\s/u.test(line)
        if (whole && !hasInlineLabels && whole[1]!.trim().split(/\s+/).length <= 4) {
          chips.push(chipFor(whole[1]!, whole[2]!))
          continue
        }
        const labelRe = /(?:^|\s|\*{0,2})([\p{L}][\p{L}\s/()-]{1,32}?)\*{0,2}:\s/gu
        const hits: Array<{ start: number; end: number; label: string }> = []
        let hitMatch: RegExpExecArray | null
        while ((hitMatch = labelRe.exec(line)) !== null) {
          if (hitMatch[1]!.trim().split(/\s+/).length > 4) continue
          const prefix = /^\*+/.exec(hitMatch[0])?.[0].length ?? 0
          hits.push({ start: hitMatch.index + prefix, end: hitMatch.index + hitMatch[0].length, label: hitMatch[1]! })
        }
        if (hits.length === 0) {
          prose.push(line)
          continue
        }
        let cursor = 0
        for (let h = 0; h < hits.length; h += 1) {
          const hit = hits[h]!
          const before = line.slice(cursor, hit.start).replace(/[\s·*]+$/u, '').trim()
          if (before) prose.push(before)
          const valueEnd = h + 1 < hits.length ? hits[h + 1]!.start : line.length
          let value = line.slice(hit.end, valueEnd).replace(/[\s·*]+$/u, '').trim()
          const sentenceBreak = /[·.]\s+(?=[\p{Lu}][\p{L}]+(?:\s+[\p{L}]+){3,})/u.exec(value)
          if (sentenceBreak) {
            const note = value.slice(sentenceBreak.index + 1).trim()
            if (note) prose.push(note)
            value = value.slice(0, sentenceBreak.index + 1)
          }
          chips.push(chipFor(hit.label, value))
          cursor = valueEnd
        }
        const tail = line.slice(cursor).replace(/^[\s·*]+/u, '').trim()
        if (tail) prose.push(tail)
      }
      const chipLine = chips.length > 0 ? `<div class="meta-line">${chips.join('')}</div>` : ''
      const proseHtml = prose.length > 0 ? `<p>${inlineMarkdown(prose.join(' · '))}</p>` : ''
      out.push(`<blockquote>${chipLine}${proseHtml}</blockquote>`)
      continue
    }

    if (/^\|/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1] ?? '')) {
      flush()
      const header = splitRow(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && /^\|/.test(lines[i] ?? '')) {
        rows.push(splitRow(lines[i] ?? ''))
        i += 1
      }
      const width = Math.max(header.length, ...rows.map((row) => row.length))
      const pad = (cells: string[]): string[] => [...cells, ...Array.from({ length: Math.max(0, width - cells.length) }, () => '')]
      const paddedHeader = pad(header)
      const paddedRows = rows.map((row) => pad(row))
      out.push(
        `<div class="table-wrap"><table><thead><tr>${paddedHeader.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${paddedRows
          .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      )
      continue
    }

    if (/^\s*-\s+\[[ xX]\]\s+/.test(line)) {
      flush()
      const items: string[] = []
      while (i < lines.length && /^\s*-\s+\[[ xX]\]\s+/.test(lines[i] ?? '')) {
        const match = /^\s*-\s+\[([ xX])\]\s+(.*)$/.exec(lines[i] ?? '')
        const done = match?.[1]?.toLowerCase() === 'x'
        const segments = (match?.[2] ?? '').split(' · ')
        const title = segments.shift() ?? ''
        const meta =
          segments.length > 0
            ? `<div class="task-meta">${segments.map((segment) => `<span class="meta-chip">${inlineMarkdown(segment)}</span>`).join('')}</div>`
            : ''
        items.push(
          `<li class="task-item${done ? ' done' : ''}"><span class="task-box">${done ? '☑' : '☐'}</span> <span class="task-title">${inlineMarkdown(title)}</span>${meta}</li>`,
        )
        i += 1
      }
      out.push(`<ul class="checklist">${items.join('')}</ul>`)
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flush()
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '') && !/^\s*[-*]\s+\[[ xX]\]\s+/.test(lines[i] ?? '')) {
        items.push(`<li>${inlineMarkdown((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''))}</li>`)
        i += 1
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      flush()
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        items.push(`<li>${inlineMarkdown((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''))}</li>`)
        i += 1
      }
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    if (line.trim() === '') {
      flush()
      i += 1
      continue
    }

    paragraph.push(line.trim())
    i += 1
  }

  flush()
  const html = out.join('\n')
  if (opts.toc) {
    return renderToc(tableOfContents(markdown), opts.tocTitle ?? 'Índice') + html
  }
  return html
}

const DIAGRAM_TOOLS_SCRIPT = `
(function () {
  var attempts = 0;
  function wire() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll('.mermaid-block'));
    var pending = false;
    blocks.forEach(function (block) {
      var canvas = block.querySelector('.diagram-canvas');
      var svg = canvas ? canvas.querySelector('svg') : null;
      if (!canvas) return;
      if (!svg) { pending = true; return; }
      if (block.getAttribute('data-wired') === '1') return;
      block.setAttribute('data-wired', '1');
      block.setAttribute('data-zoom', '1');
      canvas.setAttribute('data-fit', 'on');
      var level = block.querySelector('[data-diagram-level]');
      var fitButton = block.querySelector('[data-diagram-fit]');
      if (fitButton) fitButton.classList.add('active');
      function apply() {
        var fit = canvas.getAttribute('data-fit') !== 'off';
        var z = Number(block.getAttribute('data-zoom') || '1');
        if (fit) {
          svg.style.zoom = '';
          if (level) level.textContent = 'Ajustar';
        } else {
          svg.style.zoom = z === 1 ? '' : String(z);
          if (level) level.textContent = Math.round(z * 100) + '%';
        }
      }
      function setZoom(z) {
        block.setAttribute('data-zoom', String(z));
        if (z !== 1 && canvas.getAttribute('data-fit') !== 'off') {
          canvas.setAttribute('data-fit', 'off');
          if (fitButton) fitButton.classList.remove('active');
        }
        apply();
      }
      Array.prototype.slice.call(block.querySelectorAll('[data-diagram-zoom]')).forEach(function (button) {
        button.addEventListener('click', function () {
          var action = button.getAttribute('data-diagram-zoom');
          var z = Number(block.getAttribute('data-zoom') || '1');
          if (action === 'in') setZoom(Math.min(3, z + 0.25));
          else if (action === 'out') setZoom(Math.max(0.25, z - 0.25));
          else setZoom(1);
        });
      });
      if (fitButton) fitButton.addEventListener('click', function () {
        var next = canvas.getAttribute('data-fit') === 'on' ? 'off' : 'on';
        canvas.setAttribute('data-fit', next);
        fitButton.classList.toggle('active', next === 'on');
        apply();
      });
      canvas.addEventListener('wheel', function (event) {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        var z = Number(block.getAttribute('data-zoom') || '1');
        setZoom(Math.min(3, Math.max(0.25, z + (event.deltaY < 0 ? 0.15 : -0.15))));
      }, { passive: false });
      var panning = false;
      var startX = 0;
      var startY = 0;
      var startLeft = 0;
      var startTop = 0;
      canvas.addEventListener('mousedown', function (event) {
        panning = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = canvas.scrollLeft;
        startTop = canvas.scrollTop;
        canvas.classList.add('panning');
      });
      window.addEventListener('mousemove', function (event) {
        if (!panning) return;
        canvas.scrollLeft = startLeft - (event.clientX - startX);
        canvas.scrollTop = startTop - (event.clientY - startY);
      });
      window.addEventListener('mouseup', function () {
        panning = false;
        canvas.classList.remove('panning');
      });
      var fullscreen = block.querySelector('[data-diagram-fullscreen]');
      if (fullscreen) fullscreen.addEventListener('click', function () {
        var active = block.classList.toggle('diagram-fullscreen');
        document.body.style.overflow = active ? 'hidden' : '';
      });
      var download = block.querySelector('[data-diagram-download]');
      if (download) download.addEventListener('click', function () {
        var clone = svg.cloneNode(true);
        clone.style.zoom = '';
        var data = new XMLSerializer().serializeToString(clone);
        var link = document.createElement('a');
        link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
        link.download = 'diagrama.svg';
        link.click();
      });
      apply();
    });
    if (pending && attempts < 40) { attempts += 1; setTimeout(wire, 250); }
  }
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    Array.prototype.slice.call(document.querySelectorAll('.diagram-fullscreen')).forEach(function (block) { block.classList.remove('diagram-fullscreen'); });
    document.body.style.overflow = '';
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})()
`

export function renderDocument(markdown: string, opts: RenderOptions = {}): string {
  const theme = opts.theme ?? 'auto'
  const body = renderMarkdown(markdown, opts)
  const csp =
    opts.cspSource !== undefined
      ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${opts.cspSource} 'unsafe-inline'; img-src ${opts.cspSource} data:; font-src ${opts.cspSource}; script-src 'nonce-${opts.nonce ?? ''}' ${opts.cspSource};">\n`
      : ''
  const mermaidTheme =
    theme === 'dark'
      ? "'dark'"
      : theme === 'vscode'
        ? "(document.body.classList.contains('vscode-light') ? 'default' : 'dark')"
        : "'default'"
  const mermaidScript =
    opts.mermaid === 'script' && opts.mermaidScriptUri
      ? `<script nonce="${opts.nonce ?? ''}" src="${opts.mermaidScriptUri}"></script>\n<script nonce="${opts.nonce ?? ''}">\n  const theme = ${mermaidTheme};\n  if (window.mermaid) { mermaid.initialize({ startOnLoad: true, theme, themeVariables: theme === 'dark' ? { fontSize: '13px', lineColor: '#64748b', primaryColor: '#1e293b', primaryTextColor: '#e2e8f0', primaryBorderColor: '#475569', tertiaryColor: '#0f172a' } : { fontSize: '13px' } }); }\n${DIAGRAM_TOOLS_SCRIPT}\n</script>\n`
      : ''
  const title = opts.title ? `<title>${escapeHtml(opts.title)}</title>\n` : ''
  const description = opts.description ? `<meta name="description" content="${escapeHtml(opts.description)}">\n` : ''
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${title}${description}${csp}<style>${renderStyles(opts)}</style>
</head>
<body class="${escapeHtml(opts.bodyClass ?? '')}">
<article class="atlas-doc">
${body}
</article>
${mermaidScript}</body>
</html>
`
}
