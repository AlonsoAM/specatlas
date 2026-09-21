import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { generateDocs, DOCS_MARKER_START } from '../src/docs'
import { createChange } from '../src/new'
import { initWorkspace } from '../src/init'

const DELTA = `# Delta — X

## Requisitos agregados

### Requisito: REQ-X-001 — Registrar
El sistema DEBE registrar algo.

#### Escenario: REQ-X-001-S1 — Caso
- **CUANDO** la persona registra
- **ENTONCES** aparece en la lista
`

async function makeWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-docs-'))
  await initWorkspace({ root, name: 'docs-demo', language: 'es' })
  await createChange({ root, slug: 'alta', lane: 'full', domain: 'x', title: 'Alta' })
  await fs.writeFile(path.join(root, '.sdd', 'changes', 'alta', 'spec.md'), DELTA, 'utf8')
  return root
}

describe('documentación en tres formatos (REQ-EDITOR-010)', () => {
  it('[REQ-EDITOR-010-S1] genera técnico y manual en texto fuente, HTML y PDF', async () => {
    const root = await makeWorkspace()
    const result = await generateDocs({ root, slug: 'alta', tipo: 'all' })
    expect(result.files).toHaveLength(2)
    for (const file of result.files) {
      expect(await fs.readFile(file.path, 'utf8')).toContain(DOCS_MARKER_START)
      const html = await fs.readFile(file.htmlPath!, 'utf8')
      expect(html.toLowerCase()).toContain('<!doctype html>')
      const pdf = await fs.readFile(file.pdfPath!)
      expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    }
  })

  it('[REQ-EDITOR-010-S2] un solo documento no toca el otro', async () => {
    const root = await makeWorkspace()
    await generateDocs({ root, slug: 'alta', tipo: 'all' })
    const manualPath = path.join(root, '.sdd', 'changes', 'alta', 'docs', 'manual.md')
    const before = await fs.readFile(manualPath, 'utf8')
    await new Promise((resolve) => setTimeout(resolve, 10))
    await generateDocs({ root, slug: 'alta', tipo: 'tecnica' })
    const after = await fs.readFile(manualPath, 'utf8')
    expect(after).toBe(before)
    const tecnicaHtml = await fs.stat(path.join(root, '.sdd', 'changes', 'alta', 'docs', 'tecnica.html'))
    expect(tecnicaHtml.size).toBeGreaterThan(0)
  })

  it('[REQ-EDITOR-010-S4] regenerar conserva lo escrito a mano y no duplica el bloque', async () => {
    const root = await makeWorkspace()
    const file = path.join(root, '.sdd', 'changes', 'alta', 'docs', 'tecnica.md')
    await generateDocs({ root, slug: 'alta', tipo: 'tecnica' })
    const current = await fs.readFile(file, 'utf8')
    await fs.writeFile(file, `${current}\n## Nota manual\n\nEsto lo escribió el equipo.\n`, 'utf8')
    await generateDocs({ root, slug: 'alta', tipo: 'tecnica' })
    const regenerated = await fs.readFile(file, 'utf8')
    expect(regenerated).toContain('Esto lo escribió el equipo.')
    expect(regenerated.split(DOCS_MARKER_START)).toHaveLength(2)
    const html = await fs.readFile(path.join(root, '.sdd', 'changes', 'alta', 'docs', 'tecnica.html'), 'utf8')
    expect(html).toContain('Esto lo escribió el equipo.')
  })

  it('[REQ-EDITOR-010-S5] documentación sin evidencia se genera y señala lo pendiente', async () => {
    const root = await makeWorkspace()
    const result = await generateDocs({ root, slug: 'alta', tipo: 'tecnica' })
    const content = await fs.readFile(result.files[0]!.path, 'utf8')
    expect(content).toContain('Pendiente')
    expect(content).toContain('REQ-X-001-S1')
  })

  it('[REQ-EDITOR-010-S3] si el PDF falla, avisa con el motivo y quedan el texto fuente y el HTML', async () => {
    vi.resetModules()
    vi.doMock('@specatlas/render', async (original) => {
      const actual = await original<typeof import('@specatlas/render')>()
      return {
        ...actual,
        renderPdf: async () => {
          throw new Error('sin espacio en disco')
        },
      }
    })
    const { generateDocs: generateDocsMocked } = await import('../src/docs')
    const root = await makeWorkspace()
    const result = await generateDocsMocked({ root, slug: 'alta', tipo: 'tecnica' })
    const warning = result.diagnostics.find((finding) => finding.code === 'ATLAS-DOCS-003')
    expect(warning?.severity).toBe('warning')
    expect(warning?.message).toContain('sin espacio en disco')
    expect(result.files[0]?.pdfPath).toBeUndefined()
    expect(result.files[0]?.htmlPath).toBeDefined()
    const md = await fs.readFile(result.files[0]!.path, 'utf8')
    expect(md).toContain(DOCS_MARKER_START)
    vi.doUnmock('@specatlas/render')
    vi.resetModules()
  })
})
