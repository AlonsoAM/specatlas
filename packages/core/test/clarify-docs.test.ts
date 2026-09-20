import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createChange } from '../src/new'
import { initWorkspace } from '../src/init'
import { signApproval } from '../src/approvals'
import { loadApprovals, loadChange, loadWorkspace } from '../src/workspace'
import { clarifyAdvisory, deriveState, docsAdvisory, verifyApproval } from '../src/lifecycle'
import { parseClarify } from '../src/parse/clarify'
import { DOCS_MARKER_END, DOCS_MARKER_START, generateDocs } from '../src/docs'
import { defaultConfig } from '../src/config'

const DELTA = `# Delta — Restablecer contraseña

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** el usuario solicita restablecer con un email registrado
- **ENTONCES** recibe un enlace de un solo uso
`

const TASKS = `# Tareas

## Bloque 1 — API

- [x] T1.1 Restablecer · Archivos: src/reset.ts · Cubre: REQ-AUTH-001-S1
`

const VERIFY = `# Verificación

### REQ-AUTH-001-S1

\`\`\`evidence
method: executable
command: node -e ok
result: pass
date: 2026-09-20 10:00:00 -05:00
by: Prueba
\`\`\`
`

const CLARIFY = `# Aclaraciones — Restablecer contraseña

## Preguntas abiertas

- [ ] ¿El enlace debe caducar también al usarse una vez?

## Aclaradas

- [x] ¿Se permite reenviar el correo? — Sí, hasta 3 veces por hora
`

async function writeArtifact(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, '.sdd', ...rel.split('/'))
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

async function makeChange(lane: 'standard' | 'full' = 'full', opts: { tasks?: boolean } = {}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-fases-'))
  await initWorkspace({ root, name: 'fases', language: 'es' })
  await createChange({ root, slug: 'reset-password', lane, domain: 'auth', title: 'Restablecer contraseña' })
  await writeArtifact(root, 'changes/reset-password/spec.md', DELTA)
  if (opts.tasks !== false) {
    await writeArtifact(root, 'changes/reset-password/tasks.md', TASKS)
    await writeArtifact(root, 'changes/reset-password/verify.md', VERIFY)
  }
  await signApproval({ root, artifact: 'changes/reset-password/spec.md', by: 'Maria Perez' })
  return root
}

async function stateOf(root: string, cfg = defaultConfig()): Promise<ReturnType<typeof deriveState>> {
  const { workspace } = await loadWorkspace(root)
  const change = await loadChange(root, 'reset-password')
  const delta = await fs.readFile(path.join(change.dir, 'spec.md'), 'utf8')
  const approvals = await loadApprovals(workspace.sddDir)
  const approval = verifyApproval(change, approvals.byArtifact, cfg, delta)
  return deriveState({ change, cfg, approval, blockingFindings: 0 })
}

describe('parser de aclaraciones', () => {
  it('distingue abiertas y aclaradas con su respuesta', () => {
    const parsed = parseClarify(CLARIFY, 'clarify.md')
    expect(parsed.open).toHaveLength(1)
    expect(parsed.open[0]?.text).toContain('caducar también al usarse')
    expect(parsed.resolved).toHaveLength(1)
    expect(parsed.resolved[0]?.answer).toBe('Sí, hasta 3 veces por hora')
  })

  it('sin entradas no hay preguntas', () => {
    const parsed = parseClarify('# Aclaraciones\n\nSin nada.\n', 'clarify.md')
    expect(parsed.open).toEqual([])
    expect(parsed.resolved).toEqual([])
  })
})

describe('aviso y bloqueo de aclaración', () => {
  it('con modo aviso informa el número y la acción (REQ-FASES-002-S1)', async () => {
    const root = await makeChange('standard', { tasks: false })
    await writeArtifact(root, 'changes/reset-password/clarify.md', CLARIFY)
    const change = await loadChange(root, 'reset-password')

    const advisories = clarifyAdvisory(change, defaultConfig())
    expect(advisories).toHaveLength(1)
    expect(advisories[0]?.code).toBe('ATLAS-CLARIFY-001')
    expect(advisories[0]?.message).toContain('1 pregunta')

    const state = await stateOf(root)
    expect(state.state).toBe('approved')
    expect(state.nextAction.command).toContain('/satlas.plan')
  })

  it('con modo bloqueante no se avanza a plan (REQ-FASES-002-S2)', async () => {
    const root = await makeChange('standard', { tasks: false })
    await writeArtifact(root, 'changes/reset-password/clarify.md', CLARIFY)
    const cfg = defaultConfig()
    cfg.gates.clarify.mode = 'blocking'

    const state = await stateOf(root, cfg)
    expect(state.state).toBe('approved')
    expect(state.blockedBy.join(' ')).toContain('aclaración pendiente (1)')
    expect(state.nextAction.command).toContain('/satlas.clarify')
  })

  it('con modo apagado no hay aviso ni bloqueo (REQ-FASES-002-S3)', async () => {
    const root = await makeChange('standard', { tasks: false })
    await writeArtifact(root, 'changes/reset-password/clarify.md', CLARIFY)
    const cfg = defaultConfig()
    cfg.gates.clarify.mode = 'off'

    expect(clarifyAdvisory(await loadChange(root, 'reset-password'), cfg)).toEqual([])
    expect((await stateOf(root, cfg)).nextAction.command).toContain('/satlas.plan')
  })

  it('sin preguntas no hay aviso en ningún modo (REQ-FASES-002-S4)', async () => {
    const root = await makeChange('standard', { tasks: false })
    await writeArtifact(root, 'changes/reset-password/clarify.md', '# Aclaraciones\n\n- [x] ¿Todo claro? — Sí\n')
    for (const mode of ['off', 'advisory', 'blocking'] as const) {
      const cfg = defaultConfig()
      cfg.gates.clarify.mode = mode
      expect(clarifyAdvisory(await loadChange(root, 'reset-password'), cfg)).toEqual([])
      expect((await stateOf(root, cfg)).nextAction.command).toContain('/satlas.plan')
    }
  })
})

describe('generación de documentación', () => {
  it('genera técnica y manual desde la plantilla y la evidencia (REQ-FASES-003-S1)', async () => {
    const root = await makeChange()
    const result = await generateDocs({ root, slug: 'reset-password' })
    expect(result.files.map((f) => f.tipo).sort()).toEqual(['manual', 'tecnica'])
    expect(result.files.every((f) => f.created)).toBe(true)

    const tecnica = await fs.readFile(path.join(root, '.sdd', 'changes', 'reset-password', 'docs', 'tecnica.md'), 'utf8')
    expect(tecnica).toContain(DOCS_MARKER_START)
    expect(tecnica).toContain(DOCS_MARKER_END)
    expect(tecnica).toContain('REQ-AUTH-001')
    expect(tecnica).toContain('REQ-AUTH-001-S1')
    expect(tecnica).toContain('executable · pass')
    expect(tecnica).toContain('Tareas**: 1/1')

    const manual = await fs.readFile(path.join(root, '.sdd', 'changes', 'reset-password', 'docs', 'manual.md'), 'utf8')
    expect(manual).toContain('Cómo se usa')
  })

  it('señala lo que queda sin evidencia sin inventarlo (REQ-FASES-003-S3)', async () => {
    const root = await makeChange()
    await writeArtifact(root, 'changes/reset-password/spec.md', DELTA.replace('#### Escenario: REQ-AUTH-001-S1', '#### Escenario: REQ-AUTH-001-S2'))
    const result = await generateDocs({ root, slug: 'reset-password', tipo: 'tecnica' })
    expect(result.files).toHaveLength(1)
    const tecnica = await fs.readFile(result.files[0]!.path, 'utf8')
    expect(tecnica).toContain('Pendiente de evidencia')
    expect(tecnica).toContain('REQ-AUTH-001-S2')
  })

  it('regenerar conserva lo escrito a mano y no duplica bloques (REQ-FASES-003-S4)', async () => {
    const root = await makeChange()
    const first = await generateDocs({ root, slug: 'reset-password', tipo: 'tecnica' })
    const file = first.files[0]!.path
    await fs.appendFile(file, '\n## Notas propias\n\nEsto no se debe perder.\n', 'utf8')

    const second = await generateDocs({ root, slug: 'reset-password', tipo: 'tecnica' })
    expect(second.files[0]?.created).toBe(false)
    const content = await fs.readFile(file, 'utf8')
    expect(content).toContain('Esto no se debe perder.')
    expect(content.split(DOCS_MARKER_START)).toHaveLength(2)
  })

  it('un documento previo sin bloque gestionado se conserva', async () => {
    const root = await makeChange()
    const dir = path.join(root, '.sdd', 'changes', 'reset-password', 'docs')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'manual.md'), '# Manual escrito a mano\n\nContenido previo.\n', 'utf8')

    await generateDocs({ root, slug: 'reset-password', tipo: 'manual' })
    const content = await fs.readFile(path.join(dir, 'manual.md'), 'utf8')
    expect(content).toContain('Contenido previo.')
    expect(content.indexOf(DOCS_MARKER_START)).toBeLessThan(content.indexOf('Contenido previo.'))
  })

  it('solo genera el tipo pedido (REQ-FASES-003-S2)', async () => {
    const root = await makeChange()
    const result = await generateDocs({ root, slug: 'reset-password', tipo: 'manual' })
    expect(result.files.map((f) => f.tipo)).toEqual(['manual'])
    await expect(fs.stat(path.join(root, '.sdd', 'changes', 'reset-password', 'docs', 'tecnica.md'))).rejects.toThrow()
  })

  it('cambio inexistente avisa sin efectos', async () => {
    const root = await makeChange()
    const result = await generateDocs({ root, slug: 'no-existe' })
    expect(result.files).toEqual([])
    expect(result.diagnostics.some((d) => d.code === 'ATLAS-DOCS-002')).toBe(true)
  })
})

describe('gate de documentación del carril completo', () => {
  it('sin documentación queda en revisado y bloqueado (REQ-FASES-004-S1)', async () => {
    const root = await makeChange('full')
    const state = await stateOf(root)
    expect(state.state).toBe('reviewed')
    expect(state.blockedBy.join(' ')).toContain('documentación pendiente')
    expect(state.nextAction.command).toContain('/satlas.docs')
  })

  it('con documentación generada queda listo para archivar (REQ-FASES-004-S2)', async () => {
    const root = await makeChange('full')
    await generateDocs({ root, slug: 'reset-password' })
    const state = await stateOf(root)
    expect(state.state).toBe('ready')
    expect(state.nextAction.command).toContain('satlas archive')
  })

  it('el carril estándar no se bloquea por documentación (REQ-FASES-004-S3)', async () => {
    const root = await makeChange('standard')
    const state = await stateOf(root)
    expect(state.state).toBe('ready')
    expect(state.blockedBy).toEqual([])
  })

  it('en modo aviso el carril completo avisa sin bloquear (REQ-FASES-004-S4)', async () => {
    const root = await makeChange('full')
    const cfg = defaultConfig()
    cfg.gates.docs.mode = 'advisory'
    const state = await stateOf(root, cfg)
    expect(state.state).toBe('ready')
    const advisories = docsAdvisory(await loadChange(root, 'reset-password'), cfg)
    expect(advisories).toHaveLength(1)
    expect(advisories[0]?.code).toBe('ATLAS-DOCS-001')
  })
})
