import { describe, expect, it } from 'vitest'
import { markdownToBlocks, renderPdf, sanitizePdfText } from '../src/pdf'

describe('renderizador de PDF', () => {
  it('[REQ-EDITOR-010-S1] produce un PDF válido con paginado', async () => {
    const result = await renderPdf('# Título\n\nUn párrafo con acentos: ñ á é í ó ú ¿qué? ¡sí!\n\n- uno\n- dos\n', { title: 'Doc', project: 'Demo' })
    expect(result.pages).toBeGreaterThanOrEqual(1)
    expect(new TextDecoder().decode(result.bytes.subarray(0, 5))).toBe('%PDF-')
    expect(result.bytes.length).toBeGreaterThan(500)
  })

  it('pagina contenido largo', async () => {
    const paragraph = 'El equipo necesita que el panel reúna la información y las acciones en un mismo lugar, sin perder el contexto al refrescar. '.repeat(90)
    const result = await renderPdf(`# Documento\n\n${paragraph}\n`, { title: 'Largo' })
    expect(result.pages).toBeGreaterThan(1)
  })

  it('conserva los caracteres tipográficos que WinAnsi sí admite', () => {
    expect(sanitizePdfText('Manual — Un panel «único» – v1')).toBe('Manual — Un panel «único» – v1')
    expect(sanitizePdfText('flecha → y símbolo ◈')).toBe('flecha -> y símbolo *')
  })

  it('no imprime los comentarios HTML del bloque gestionado', () => {
    const blocks = markdownToBlocks(['<!-- specatlas:generado:inicio -->', '# Título', '', 'Texto.', '<!-- specatlas:generado:fin -->', ''].join('\n'))
    expect(JSON.stringify(blocks)).not.toContain('specatlas:generado')
    expect(blocks[0]).toMatchObject({ kind: 'heading', text: 'Título' })
  })

  it('parsea encabezados, listas, tablas y código', () => {
    const blocks = markdownToBlocks(`# Título

Texto del párrafo.

## Sección

- uno
- dos

1. primero

| A | B |
|---|---|
| 1 | 2 |

\`\`\`ts
const x = 1
\`\`\`

> nota
`)
    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'paragraph', 'heading', 'list', 'list', 'table', 'code', 'quote'])
    const table = blocks.find((block) => block.kind === 'table')
    expect(table && table.kind === 'table' ? table.header : []).toEqual(['A', 'B'])
  })

  it('sanea símbolos que no caben en la codificación del PDF y conserva acentos', () => {
    expect(sanitizePdfText('◈ panel · ✓ ok')).toBe('* panel · ok ok')
    expect(sanitizePdfText('Ñandú, ¿qué tal? — señal')).toContain('Ñandú')
    expect(sanitizePdfText('◈')).not.toContain('\u25c8')
  })

  it('[REQ-EDITOR-010-S5] dibuja tablas con contenido y no falla con símbolos del proyecto', async () => {
    const result = await renderPdf(
      `# Tabla\n\n| Escenario | Evidencia |\n|---|---|\n| REQ-X-001-S1 | ✓ pass · executable |\n| REQ-X-001-S2 | ⋯ pendiente |\n\n◈ ◇ ▤ ✍ ⌘ ⚙`,
      { title: 'Tabla' },
    )
    expect(result.pages).toBeGreaterThanOrEqual(1)
  })
})
