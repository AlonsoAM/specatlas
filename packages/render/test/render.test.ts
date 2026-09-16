import { describe, expect, it } from 'vitest'
import { defaultTokens, inlineMarkdown, renderDocument, renderMarkdown, renderStyles, tableOfContents } from '../src/index'

describe('renderMarkdown', () => {
  it('renderiza encabezados con ancla, énfasis, código y enlaces', () => {
    const html = renderMarkdown('# Título\n\nTexto **fuerte** y *cursiva* con `código` y [enlace](https://ejemplo.test).')
    expect(html).toContain('<h1 id="titulo">Título</h1>')
    expect(html).toContain('<strong>fuerte</strong>')
    expect(html).toContain('<em>cursiva</em>')
    expect(html).toContain('<code>código</code>')
    expect(html).toContain('<a href="https://ejemplo.test">enlace</a>')
  })

  it('renderiza listas, checklist, tablas, blockquote y callouts', () => {
    const html = renderMarkdown(
      [
        '- uno',
        '- dos',
        '- [x] hecho',
        '- [ ] pendiente · Archivos: src/a.ts · Cubre: REQ-X-001-S1',
        '',
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '',
        '> cita simple',
        '',
        '> [!WARNING]',
        '> cuidado',
      ].join('\n'),
    )
    expect(html).toContain('<ul><li>uno</li><li>dos</li></ul>')
    expect(html).toContain('task-item done')
    expect(html).toContain('task-item')
    expect(html).toContain('☑')
    expect(html).toContain('task-meta')
    expect(html).toContain('meta-chip')
    expect(html).toContain('Cubre: REQ-X-001-S1')
    expect(html).toContain('<th>A</th>')
    expect(html).toContain('<td>2</td>')
    expect(html).toContain('<blockquote><p>cita simple</p></blockquote>')
    expect(html).toContain('callout-warning')
  })

  it('resalta el código y escapa el HTML', () => {
    const html = renderMarkdown('```ts\nconst x: number = 1\n```\n\n<script>alert(1)</script>')
    expect(html).toContain('class="hljs language-ts"')
    expect(html).toContain('hljs-keyword')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('los bloques mermaid se muestran como diagrama (modo código) con aviso', () => {
    const html = renderMarkdown('```mermaid\nflowchart LR\n  A-->B\n```')
    expect(html).toContain('<pre class="mermaid">')
    expect(html).toMatch(/diagrama mermaid/i)
    expect(html).not.toContain('language-mermaid')
  })

  it('inlineMarkdown escapa y formatea', () => {
    expect(inlineMarkdown('**a** `b` <i>')).toBe('<strong>a</strong> <code>b</code> &lt;i&gt;')
  })
})

describe('índice (TOC)', () => {
  it('genera entradas y las inserta cuando toc está activo', () => {
    const markdown = '# Uno\n\n## Dos\n\ntexto\n\n```md\n# no cuenta\n```\n\n### Tres\n'
    const html = renderMarkdown(markdown, { toc: true })
    expect(html).toContain('class="atlas-toc"')
    expect(html).toContain('<a href="#uno">Uno</a>')
    expect(html).toContain('<a href="#dos">Dos</a>')
    expect(html).not.toContain('no cuenta</a>')
    expect(html).not.toContain('href="#tres"')
    const withoutToc = renderMarkdown(markdown)
    expect(withoutToc).not.toContain('atlas-toc')
  })

  it('tableOfContents ignora bloques de código y respeta el nivel máximo', () => {
    const entries = tableOfContents('# A\n\n## B\n\n### C\n\n```\n## falso\n```\n', 2)
    expect(entries.map((entry) => entry.text)).toEqual(['A', 'B'])
  })
})

describe('estilos y documento', () => {
  it('renderStyles expone tokens y modo vscode', () => {
    const styles = renderStyles()
    expect(styles).toContain('--atlas-accent')
    expect(styles).toContain('--atlas-font-mono')
    const vscode = renderStyles({ theme: 'vscode' })
    expect(vscode).toMatch(/var\(--vscode-editor-background[,)]/)
  })

  it('renderDocument genera página autocontenida con CSP y mermaid opcional', () => {
    const html = renderDocument('# Hola', { title: 'Doc', theme: 'light' })
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<title>Doc</title>')
    expect(html).not.toContain('https://')

    const withMermaid = renderDocument('```mermaid\ngraph TD\nA-->B\n```', {
      theme: 'vscode',
      mermaid: 'script',
      mermaidScriptUri: 'vscode-webview://x/media/mermaid.min.js',
      cspSource: 'vscode-webview://x',
      nonce: 'n1',
    })
    expect(withMermaid).toContain('http-equiv="Content-Security-Policy"')
    expect(withMermaid).toContain("script-src 'nonce-n1'")
    expect(withMermaid).toContain('src="vscode-webview://x/media/mermaid.min.js"')
    expect(withMermaid).toContain('mermaid.initialize')
  })

  it('acepta tokens personalizados', () => {
    const styles = renderStyles({ tokens: { accent: defaultTokens.danger } })
    expect(styles).toContain(`--atlas-accent: ${defaultTokens.danger};`)
  })
})

describe('cabeceras de metadatos', () => {
  it('convierte la cita de metadatos en chips y deja la prosa aparte', () => {
    const html = renderMarkdown('> Cambio: `x` · Carril: `standard` · Los artefactos aprobados no se editan: este plan es el único artefacto.')
    expect(html).toContain('meta-line')
    expect(html).toContain('meta-chip')
    expect(html).toContain('<b>Cambio:</b>')
    expect(html).toContain('<b>Carril:</b>')
    expect(html).toContain('<p>Los artefactos aprobados no se editan: este plan es el único artefacto.</p>')
  })
})