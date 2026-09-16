import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveChange, foldDelta } from '../src/archive'
import { createChange } from '../src/new'
import { initWorkspace } from '../src/init'
import { loadWorkspace } from '../src/workspace'
import { parseDelta } from '../src/parse/delta'
import { parseConfig, defaultConfig } from '../src/config'
import { detectProfiles, loadProfilesFromDir } from '../src/profiles'

const LIVING = `# Autenticación

### Requisito: REQ-AUTH-001 — Restablecer contraseña
Prosa original.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** email registrado
- **ENTONCES** enlace enviado

### Requisito: REQ-AUTH-002 — Cierre de sesión
Prosa.

#### Escenario: REQ-AUTH-002-S1 — Cerrar
- **CUANDO** el usuario cierra sesión
- **ENTONCES** la sesión termina

### Requisito: REQ-AUTH-003 — Ingreso
Prosa.

#### Escenario: REQ-AUTH-003-S1 — Ingresar
- **CUANDO** el usuario ingresa
- **ENTONCES** la sesión inicia
`

describe('foldDelta', () => {
  it('aplica ADDED, MODIFIED, REMOVED y RENAMED', () => {
    const delta = parseDelta(
      `## Requisitos agregados

### Requisito: REQ-AUTH-004 — Nuevo requisito
Prosa nueva.

#### Escenario: REQ-AUTH-004-S1 — Caso
- **CUANDO** a
- **ENTONCES** b

## Requisitos modificados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
Prosa actualizada.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** email registrado
- **ENTONCES** enlace enviado en 30 minutos

## Requisitos eliminados

### Requisito: REQ-AUTH-002 — Cierre de sesión
- Motivo: reemplazado
- Migración: usar el nuevo flujo

## Requisitos renombrados

- DESDE: REQ-AUTH-003 — Ingreso
  HACIA: REQ-AUTH-003 — Inicio de sesión
`,
      'delta.md',
    )
    const out = foldDelta(LIVING, delta, 'es')
    expect(out.applied.added).toEqual(['REQ-AUTH-004'])
    expect(out.applied.modified).toEqual(['REQ-AUTH-001'])
    expect(out.applied.removed).toEqual(['REQ-AUTH-002'])
    expect(out.content).toContain('Prosa nueva.')
    expect(out.content).toContain('enlace enviado en 30 minutos')
    expect(out.content).not.toContain('REQ-AUTH-002')
    expect(out.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
  })

  it('no pisa la spec si REMOVED no existe', () => {
    const delta = parseDelta('## Requisitos eliminados\n\n### Requisito: REQ-X-999 — Fantasma\n- Motivo: x\n- Migración: y\n', 'delta.md')
    const out = foldDelta(LIVING, delta, 'es')
    expect(out.diagnostics.some((d) => d.code === 'TRACE-007')).toBe(true)
    expect(out.content).toBe(LIVING)
  })
})

describe('config', () => {
  it('usa español por defecto', () => {
    const cfg = defaultConfig()
    expect(cfg.project.language).toBe('es')
    expect(cfg.spec.language).toBe('es')
    expect(cfg.trace.mode).toBe('blocking')
  })

  it('rechaza configuración inválida con diagnóstico estable', () => {
    const { diagnostics } = parseConfig('project:\n  language: fr\n')
    expect(diagnostics.some((d) => d.code === 'ATLAS-CONFIG-002')).toBe(true)
  })
})

describe('perfiles', () => {
  it('detecta node-ts con scoring y cae a generic sin coincidencias', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-prof-'))
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5' } }), 'utf8')
    await fs.mkdir(path.join(root, 'src'), { recursive: true })
    await fs.writeFile(path.join(root, 'src', 'index.ts'), 'export const x = 1\n', 'utf8')

    const profilesDir = path.resolve(__dirname, '..', '..', '..', 'profiles')
    const profiles = await loadProfilesFromDir(profilesDir)
    expect(profiles.length).toBeGreaterThanOrEqual(3)

    const detected = await detectProfiles(root, profiles)
    expect(detected.best?.name).toBe('node-ts')

    const empty = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-prof2-'))
    const none = await detectProfiles(empty, profiles)
    expect(none.matches).toHaveLength(0)
  })
})

describe('workspace con cambios archivados', () => {
  it('expone el cambio archivado con sus tareas y evidencia', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-arch-'))
    await initWorkspace({ root, name: 'arch-demo', language: 'es' })
    await createChange({ root, slug: 'alta', lane: 'standard', domain: 'tareas', title: 'Alta' })
    const dir = path.join(root, '.sdd', 'changes', 'alta')
    await fs.writeFile(
      path.join(dir, 'spec.md'),
      `## Requisitos agregados

### Requisito: REQ-TAR-001 — Alta
El sistema DEBE permitir registrar tareas.

#### Escenario: REQ-TAR-001-S1 — Alta valida
- **CUANDO** la persona registra una tarea
- **ENTONCES** aparece en la lista
`,
      'utf8',
    )
    await fs.writeFile(path.join(dir, 'tasks.md'), '## Bloque 1 — Nucleo\n\n- [x] T1.1 Registrar · Archivos: src/a.ts · Cubre: REQ-TAR-001-S1 · Reversion: borrar\n', 'utf8')
    await fs.writeFile(
      path.join(dir, 'verify.md'),
      `# Verificacion

\`\`\`evidence
scenario: REQ-TAR-001-S1
method: executable
command: npm test
result: pass
date: 2026-09-16T10:00:00Z
by: Ana
\`\`\`
`,
      'utf8',
    )

    const result = await archiveChange({ root, slug: 'alta' })
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

    const { workspace } = await loadWorkspace(root)
    expect(workspace.changes).toHaveLength(0)
    expect(workspace.archived?.map((c) => c.slug)).toEqual(['alta'])
    const archived = workspace.archived![0]!
    expect(archived.tasks?.counts.total).toBe(1)
    expect(archived.verify?.evidence[0]?.result).toBe('pass')
    expect(archived.dir).toContain('archive')
    expect(workspace.specs[0]?.spec.requirements[0]?.id).toBe('REQ-TAR-001')
  })
})