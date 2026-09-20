import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveChange } from '../src/archive'
import { createChange } from '../src/new'
import { initWorkspace } from '../src/init'
import { loadChange, loadWorkspace } from '../src/workspace'
import { checkTrace } from '../src/trace'
import { loadLivingFixes, parseFixCovers, writeLivingFix } from '../src/fixes'

const SPEC = `---
domain: auth
title: Autenticación
version: 1
updated: 2026-09-20
---

# Autenticación

### Requisito: REQ-AUTH-001 — Iniciar sesión
El sistema DEBE permitir iniciar sesión.

#### Escenario: REQ-AUTH-001-S1 — Credenciales válidas
- **CUANDO** la persona ingresa con credenciales válidas
- **ENTONCES** obtiene una sesión activa
`

const FIX_MD = `# Fix — Arreglo de login

## Síntoma
El ingreso fallaba con una sesión vencida.

## Causa raíz
Comparación de fechas sin zona horaria.

## Cambio
Comparación con la hora local.

## Rollback
Revertir el commit.

Cubre: REQ-AUTH-001

## Evidencia

### REQ-AUTH-001-S1

\`\`\`evidence
method: executable
command: node -e ok
result: pass
date: 2026-09-20 10:00:00 -05:00
by: Prueba
\`\`\`
`

async function writeArtifact(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, '.sdd', ...rel.split('/'))
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

async function makeFixWorkspace(): Promise<{ root: string; changeDir: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-fixes-'))
  await initWorkspace({ root, name: 'fixes', language: 'es' })
  await writeArtifact(root, 'specs/auth/spec.md', SPEC)
  await createChange({ root, slug: 'arreglo-login', lane: 'fix', domain: 'auth', title: 'Arreglo de login' })
  const changeDir = path.join(root, '.sdd', 'changes', 'arreglo-login')
  await fs.writeFile(path.join(changeDir, 'fix.md'), FIX_MD, 'utf8')
  return { root, changeDir }
}

describe('cobertura declarada del fix', () => {
  it('lee la línea Cubre con varios identificadores (REQ-FIXES-004-S1)', () => {
    expect(parseFixCovers('Cubre: REQ-AUTH-001, REQ-AUTH-002\n')).toEqual(['REQ-AUTH-001', 'REQ-AUTH-002'])
    expect(parseFixCovers('- Cubre: req-auth-001\n')).toEqual(['REQ-AUTH-001'])
  })

  it('ignora el ejemplo comentado de la plantilla (REQ-FIXES-004-S3)', () => {
    const template = `## Evidencia

<!-- Opcional: declara los requisitos que este fix afecta.
Cubre: REQ-DOMINIO-001
-->
`
    expect(parseFixCovers(template)).toEqual([])
  })

  it('avisa de un requisito inexistente sin invalidar el fix (REQ-FIXES-004-S2)', async () => {
    const { root } = await makeFixWorkspace()
    const fixFile = path.join(root, '.sdd', 'changes', 'arreglo-login', 'fix.md')
    await fs.writeFile(fixFile, FIX_MD.replace('Cubre: REQ-AUTH-001', 'Cubre: REQ-AUTH-001, REQ-NOPE-001'), 'utf8')

    const { workspace } = await loadWorkspace(root)
    const change = await loadChange(root, 'arreglo-login')
    const result = checkTrace({ specs: workspace.specs, change, requireEvidence: false })

    const coversFindings = result.findings.filter((f) => f.code === 'TRACE-011')
    expect(coversFindings).toHaveLength(1)
    expect(coversFindings[0]?.severity).toBe('warning')
    expect(coversFindings[0]?.message).toContain('REQ-NOPE-001')
    expect(change.fixCovers).toEqual(['REQ-AUTH-001', 'REQ-NOPE-001'])
  })

  it('un fix sin cobertura sigue siendo válido (REQ-FIXES-004-S3)', async () => {
    const { root } = await makeFixWorkspace()
    const fixFile = path.join(root, '.sdd', 'changes', 'arreglo-login', 'fix.md')
    await fs.writeFile(fixFile, FIX_MD.replace('Cubre: REQ-AUTH-001\n\n', ''), 'utf8')

    const { workspace } = await loadWorkspace(root)
    const change = await loadChange(root, 'arreglo-login')
    expect(change.fixCovers).toEqual([])
    expect(checkTrace({ specs: workspace.specs, change, requireEvidence: false }).findings.filter((f) => f.code === 'TRACE-011')).toEqual([])
  })
})

describe('archivado del fix vivo', () => {
  it('conserva el fix con su identidad y contenido, y lo lista en el registro (REQ-FIXES-001-S1, REQ-FIXES-001-S2)', async () => {
    const { root } = await makeFixWorkspace()
    const specsBefore = await fs.readFile(path.join(root, '.sdd', 'specs', 'auth', 'spec.md'), 'utf8')

    const result = await archiveChange({ root, slug: 'arreglo-login', now: new Date('2026-09-20T10:00:00') })
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(result.livingFix).toBe('.sdd/fixes/2026-09-arreglo-login.md')

    const living = await loadLivingFixes(root)
    expect(living).toHaveLength(1)
    expect(living[0]?.slug).toBe('arreglo-login')
    expect(living[0]?.domain).toBe('auth')
    expect(living[0]?.title).toBe('Arreglo de login')
    expect(living[0]?.result).toBe('pass')
    expect(living[0]?.date).toBe('2026-09-20')
    expect(living[0]?.covers).toEqual(['REQ-AUTH-001'])
    expect(living[0]?.content).toContain('## Causa raíz')
    expect(living[0]?.content).toContain('```evidence')

    const index = await fs.readFile(path.join(root, '.sdd', 'INDEX.md'), 'utf8')
    expect(index).toContain('## Fixes vivos')
    expect(index).toContain('arreglo-login')

    expect(await fs.readFile(path.join(root, '.sdd', 'specs', 'auth', 'spec.md'), 'utf8')).toBe(specsBefore)
  })

  it('archivar de nuevo no duplica ni pisa el fix vivo (REQ-FIXES-001-S3)', async () => {
    const { root } = await makeFixWorkspace()
    const livingFile = path.join(root, '.sdd', 'fixes', '2026-09-arreglo-login.md')
    await fs.mkdir(path.dirname(livingFile), { recursive: true })
    const custom = '---\nslug: arreglo-login\ndate: 2026-09-20\nresult: pass\n---\n\n# Fix conservado a mano\n'
    await fs.writeFile(livingFile, custom, 'utf8')

    const result = await archiveChange({ root, slug: 'arreglo-login', now: new Date('2026-09-20T10:00:00') })
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(result.livingFix).toBe('.sdd/fixes/2026-09-arreglo-login.md')
    expect(await fs.readFile(livingFile, 'utf8')).toBe(custom)
    const living = await loadLivingFixes(root)
    expect(living.filter((f) => f.slug === 'arreglo-login')).toHaveLength(1)
  })

  it('sin permiso para conservar el fix vivo no archiva a medias (REQ-FIXES-001-S5)', async () => {
    const { root, changeDir } = await makeFixWorkspace()
    const fixesDir = path.join(root, '.sdd', 'fixes')
    await fs.rm(fixesDir, { recursive: true, force: true })
    await fs.writeFile(fixesDir, 'estorbando', 'utf8')

    const result = await archiveChange({ root, slug: 'arreglo-login', now: new Date('2026-09-20T10:00:00') })
    expect(result.diagnostics.some((d) => d.code === 'ATLAS-ARCH-006')).toBe(true)
    expect(result.archivedTo).toBeUndefined()
    expect(await fs.stat(changeDir)).toBeDefined()
    const archivedEntries = await fs.readdir(path.join(root, '.sdd', 'changes', 'archive')).catch(() => [] as string[])
    expect(archivedEntries).not.toContain('2026-09-arreglo-login')
  })

  it('el carril express no pliega nada en las specs vivas (REQ-FIXES-001-S4)', async () => {
    const { root } = await makeFixWorkspace()
    const before = await fs.readFile(path.join(root, '.sdd', 'specs', 'auth', 'spec.md'), 'utf8')
    await archiveChange({ root, slug: 'arreglo-login', now: new Date('2026-09-20T10:00:00') })
    const after = await fs.readFile(path.join(root, '.sdd', 'specs', 'auth', 'spec.md'), 'utf8')
    expect(after).toBe(before)
  })
})

describe('lectura de fixes vivos', () => {
  it('ordena por fecha descendente', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-fixes-'))
    await initWorkspace({ root, name: 'fixes', language: 'es' })
    await writeLivingFix(root, { slug: 'viejo', date: '2026-08-01', content: '# Fix — Viejo\n' })
    await writeLivingFix(root, { slug: 'nuevo', date: '2026-09-20', content: '# Fix — Nuevo\n' })

    const fixes = await loadLivingFixes(root)
    expect(fixes.map((f) => f.slug)).toEqual(['nuevo', 'viejo'])
  })
})
