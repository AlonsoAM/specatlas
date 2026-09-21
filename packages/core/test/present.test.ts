import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { generatePresentation } from '../src/present'
import { signApproval } from '../src/approvals'
import { initWorkspace } from '../src/init'
import { createChange } from '../src/new'
import { defaultConfig } from '../src/config'
import { createChange } from '../src/new'
import { initWorkspace } from '../src/init'
import { signApproval } from '../src/approvals'

const DELTA = `# Delta — X

## Requisitos agregados

### Requisito: REQ-X-001 — Registrar
El sistema DEBE registrar algo.

#### Escenario: REQ-X-001-S1 — Caso
- **CUANDO** la persona registra
- **ENTONCES** aparece en la lista
`

async function makeWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-present-'))
  await initWorkspace({ root, name: 'present-demo', language: 'es' })
  await createChange({ root, slug: 'alta', lane: 'standard', domain: 'x', title: 'Alta' })
  await fs.writeFile(path.join(root, '.sdd', 'changes', 'alta', 'spec.md'), DELTA, 'utf8')
  return root
}

describe('presentación con estado de aprobación', () => {
  it('[REQ-EDITOR-009-S5] sin firma muestra el estado pendiente y el comando de aprobación', async () => {
    const root = await makeWorkspace()
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('Esta propuesta se aprueba firmando la especificación')
    expect(html).toContain('satlas approve alta')
    expect(html).toContain('Pendiente de aprobación')
    expect(html).not.toContain('Aprobada por')
  })

  it('[REQ-EDITOR-009-S5] con firma muestra quién y cuándo aprobó', async () => {
    const root = await makeWorkspace()
    const signed = await signApproval({ root, artifact: 'changes/alta/spec.md', by: 'Ana Pérez', channel: 'editor' })
    expect(signed.approval).toBeDefined()

    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('Aprobada por Ana Pérez')
    expect(html).toContain('sign-state ok')
  })

  it('[REQ-EDITOR-009-S5] si la spec cambia, la firma queda obsoleta y no se muestra como vigente', async () => {
    const root = await makeWorkspace()
    await signApproval({ root, artifact: 'changes/alta/spec.md', by: 'Ana Pérez', channel: 'editor' })
    await fs.appendFile(path.join(root, '.sdd', 'changes', 'alta', 'spec.md'), '\n<!-- editado -->\n', 'utf8')
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('quedó obsoleta')
    expect(html).toContain('satlas approve alta')
    expect(html).not.toContain('sign-state ok')
  })
})

describe('presentación rediseñada (REQ-EDITOR-009)', () => {
  it('[REQ-EDITOR-009-S1] reúne identidad, resumen, especificación, mockups y firma con guía de secciones', async () => {
    const root = await makeWorkspace()
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('class="toc"')
    expect(html).toContain('id="identidad"')
    expect(html).toContain('id="resumen"')
    expect(html).toContain('id="especificacion"')
    expect(html).toContain('id="mockups"')
    expect(html).toContain('id="firma"')
    expect(html).toContain('REQ-X-001')
    expect(html).toContain('hash')
  })

  it('[REQ-EDITOR-009-S4] se puede imprimir o guardar como PDF con el bloque de firma en página propia', async () => {
    const root = await makeWorkspace()
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('window.print()')
    expect(html).toContain('@media print')
    expect(html).toContain('#firma { break-before:page; }')
    expect(html).toContain('.cover { break-after:page; }')
  })

  it('[REQ-EDITOR-009-S3] sin propuesta lo indica y sigue mostrando la especificación', async () => {
    const root = await makeWorkspace()
    await fs.rm(path.join(root, '.sdd', 'changes', 'alta', 'proposal.md'), { force: true })
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('La propuesta está vacía')
    expect(html).toContain('REQ-X-001')
  })

  it('[REQ-EDITOR-009-S1] la galería de mockups ofrece abrir cada pantalla aparte y no depende del iframe', async () => {
    const root = await makeWorkspace()
    const dir = path.join(root, '.sdd', 'changes', 'alta', 'mockups')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'uno.html'), '<!doctype html><title>uno</title>', 'utf8')
    await fs.writeFile(
      path.join(dir, 'manifest.yaml'),
      `schema_version: 1
version: 1
level: hifi
platform: web
inputs_hash: sha256:x
generated_at: 2026-01-01 00:00:00 -05:00
screens:
  - id: uno
    title: Pantalla uno
    file: uno.html
    illustrates: [REQ-X-001-S1]
    states: [default]
screenshots: []
`,
      'utf8',
    )
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('data-mockup="mockups/uno.html"')
    expect(html).toContain('href="mockups/uno.html" target="_blank"')
    expect(html).toContain('Abrir mockup')
    // El iframe lo monta el script: donde no corre (webview con CSP) no queda ningún marco en blanco.
    expect(html).not.toContain('<iframe src="mockups/uno.html"')
  })

  it('[REQ-EDITOR-009-S2] sin mockups lo dice sin dejar la sección vacía', async () => {
    const root = await makeWorkspace()
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('Este cambio no declara mockups')
  })

  it('[REQ-EDITOR-009-S6] avisa de un mockup declarado que falta y la presentación sigue siendo válida', async () => {
    const root = await makeWorkspace()
    const dir = path.join(root, '.sdd', 'changes', 'alta', 'mockups')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
      path.join(dir, 'manifest.yaml'),
      'schema_version: 1\nversion: 1\nlevel: hifi\nplatform: web\nscreens:\n  - id: pantalla\n    file: pantalla.html\n    title: Pantalla\n    illustrates:\n      - REQ-X-001-S1\n    states:\n      - default\n    breakpoints:\n      - 1440\n',
      'utf8',
    )
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('Mockups declarados que faltan')
    expect(html).toContain('pantalla.html')
    expect(result.diagnostics.some((finding) => finding.code === 'ATLAS-PRESENT-002')).toBe(true)
  })
})

describe('la sección de firma de la propuesta', () => {
  const NL = String.fromCharCode(10)
  const DELTA = [
    '# Delta — Pagar con tarjeta',
    '',
    '## Requisitos agregados',
    '',
    '### Requisito: REQ-PAGOS-001 — Pagar con tarjeta guardada',
    'El comprador paga con la tarjeta que dejó guardada, sin volver a teclearla.',
    '',
    '- Regla BR-PAGOS-001: el cobro se confirma en menos de 10 segundos',
    '',
    '#### Escenario: REQ-PAGOS-001-S1 — Tarjeta vigente',
    '- **CUANDO** el comprador confirma el pago con una tarjeta vigente',
    '- **ENTONCES** el pedido queda pagado y recibe su comprobante',
  ].join(NL)

  async function proyecto(prefijo: string): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), prefijo))
    await initWorkspace({ root, name: 'Demo', language: 'es' })
    await createChange({ root, slug: 'pago', domain: 'pagos', title: 'Pagar con tarjeta', cfg: defaultConfig() })
    await fs.writeFile(path.join(root, '.sdd', 'changes', 'pago', 'spec.md'), DELTA, 'utf8')
    return root
  }

  async function seccionDeFirma(root: string): Promise<string> {
    const resultado = await generatePresentation({ root, slug: 'pago' })
    const html = await fs.readFile(resultado.path!, 'utf8')
    const desde = html.indexOf('id="firma"')
    return html.slice(desde, desde + 1800)
  }

  it('sin firmar invita a firmar y no avisa de nada obsoleto', async () => {
    const root = await proyecto('satlas-firma-pendiente-')
    const seccion = await seccionDeFirma(root)
    expect(seccion).toContain('Firma aquí')
    expect(seccion).toContain('____________________')
    expect(seccion).toContain('satlas approve pago')
    expect(seccion).not.toContain('quedó obsoleta')
  })

  it('firmada muestra quién, cuándo y la huella, sin líneas en blanco', async () => {
    const root = await proyecto('satlas-firma-valida-')
    await signApproval({ root, artifact: path.join(root, '.sdd', 'changes', 'pago', 'spec.md'), by: 'Alonso Anchante' })
    const seccion = await seccionDeFirma(root)
    expect(seccion).toContain('Aprobada por')
    expect(seccion).toContain('Alonso Anchante')
    expect(seccion).toContain('sha256:')
    expect(seccion).not.toContain('____________________')
    expect(seccion).not.toContain('quedó obsoleta')
  })

  it('si la especificación cambia después de firmarse, lo dice y vuelve a pedir la firma', async () => {
    const root = await proyecto('satlas-firma-obsoleta-')
    const spec = path.join(root, '.sdd', 'changes', 'pago', 'spec.md')
    await signApproval({ root, artifact: spec, by: 'Alonso Anchante' })
    await fs.writeFile(spec, DELTA.replace('10 segundos', '5 segundos'), 'utf8')

    const seccion = await seccionDeFirma(root)
    expect(seccion).toContain('quedó obsoleta')
    expect(seccion).toContain('____________________')
    expect(seccion).toContain('satlas approve pago')
  })
})
