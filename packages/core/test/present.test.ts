import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { generatePresentation } from '../src/present'
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
  it('sin firma muestra el comando de aprobación', async () => {
    const root = await makeWorkspace()
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('Esta propuesta se aprueba firmando la spec')
    expect(html).toContain('satlas approve alta')
    expect(html).not.toContain('Aprobada por')
  })

  it('con firma muestra quién y cuándo aprobó', async () => {
    const root = await makeWorkspace()
    const signed = await signApproval({ root, artifact: 'changes/alta/spec.md', by: 'Ana Pérez', channel: 'editor' })
    expect(signed.approval).toBeDefined()

    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('Aprobada por Ana Pérez')
    expect(html).not.toContain('satlas approve alta')
  })

  it('si la spec cambia, la firma queda obsoleta y vuelve el comando', async () => {
    const root = await makeWorkspace()
    await signApproval({ root, artifact: 'changes/alta/spec.md', by: 'Ana Pérez', channel: 'editor' })
    await fs.appendFile(path.join(root, '.sdd', 'changes', 'alta', 'spec.md'), '\n<!-- editado -->\n', 'utf8')
    const result = await generatePresentation({ root, slug: 'alta' })
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('satlas approve alta')
    expect(html).not.toContain('Aprobada por')
  })
})
