import { describe, expect, it } from 'vitest'
import { parseSpecFile } from '../src/parse/spec'
import { parseDelta } from '../src/parse/delta'
import { parseTasksFile } from '../src/parse/tasks'
import { parseVerifyFile } from '../src/parse/evidence'

const SPEC = `---
domain: auth
title: Autenticación
version: 3
---

# Autenticación

### Requisito: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

- Regla BR-AUTH-001: El enlace vence a los 30 minutos.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** el usuario solicita restablecer con email registrado
- **ENTONCES** recibe un enlace de un solo uso

### Requirement: REQ-AUTH-002 — Logout
The system SHALL close the session.

#### Scenario: REQ-AUTH-002-S1 — Closed session
- **WHEN** the user logs out
- **THEN** the session is closed
`

describe('parseSpecFile', () => {
  it('parsea requisitos, reglas y escenarios en español e inglés', () => {
    const spec = parseSpecFile(SPEC, 'spec.md')
    expect(spec.domain).toBe('auth')
    expect(spec.version).toBe(3)
    expect(spec.requirements).toHaveLength(2)
    const first = spec.requirements[0]!
    expect(first.id).toBe('REQ-AUTH-001')
    expect(first.rules).toHaveLength(1)
    expect(first.rules[0]!.id).toBe('BR-AUTH-001')
    expect(first.scenarios[0]!.id).toBe('REQ-AUTH-001-S1')
    expect(first.scenarios[0]!.when[0]).toContain('email registrado')
    expect(first.scenarios[0]!.then[0]).toContain('enlace')
    const second = spec.requirements[1]!
    expect(second.id).toBe('REQ-AUTH-002')
    expect(second.scenarios[0]!.then[0]).toContain('closed')
    expect(spec.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
  })

  it('detecta escenarios sin ENTONCES y duplicados', () => {
    const content = `### Requisito: REQ-A-001 — X
#### Escenario: REQ-A-001-S1 — sin cierre
- **CUANDO** algo

### Requisito: REQ-A-001 — Duplicado
#### Escenario: REQ-A-001-S2 — ok
- **CUANDO** algo
- **ENTONCES** algo
`
    const spec = parseSpecFile(content, 'spec.md')
    expect(spec.diagnostics.some((d) => d.code === 'LINT-BIZ-005')).toBe(true)
    expect(spec.diagnostics.some((d) => d.code === 'TRACE-008')).toBe(true)
  })
})

describe('parseDelta', () => {
  const DELTA = `# Delta — Reset

## Requisitos agregados

### Requisito: REQ-AUTH-004 — Nuevo
Prosa.

#### Escenario: REQ-AUTH-004-S1 — Caso
- **CUANDO** algo
- **ENTONCES** algo

## Requisitos modificados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
Bloque completo.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** email registrado
- **ENTONCES** enlace

## Requisitos eliminados

### Requisito: REQ-AUTH-009 — Viejo
- Motivo: ya no se usa
- Migración: comunicar a usuarios

## Requisitos renombrados

- DESDE: REQ-AUTH-003 — Ingreso
  HACIA: REQ-AUTH-003 — Inicio de sesión
`
  it('separa las cuatro operaciones', () => {
    const delta = parseDelta(DELTA, 'delta.md')
    expect(delta.added.map((r) => r.id)).toEqual(['REQ-AUTH-004'])
    expect(delta.modified.map((r) => r.id)).toEqual(['REQ-AUTH-001'])
    expect(delta.removed.map((r) => r.id)).toEqual(['REQ-AUTH-009'])
    expect(delta.renamed[0]).toMatchObject({ from: { id: 'REQ-AUTH-003' }, to: { title: 'Inicio de sesión' } })
    expect(delta.sectionsFound).toEqual(expect.arrayContaining(['added', 'modified', 'removed', 'renamed']))
  })

  it('exige motivo y migración en REMOVED', () => {
    const delta = parseDelta('# Delta\n\n## Requisitos eliminados\n\n### Requisito: REQ-X-001 — Viejo\n', 'delta.md')
    expect(delta.diagnostics.filter((d) => d.code === 'LINT-DLT-002')).toHaveLength(2)
  })
})

describe('parseTasksFile', () => {
  const TASKS = `# Tareas

## Bloque 1 — Base de datos

- [ ] T1.1 Crear tabla · Archivos: db/003.sql · Cubre: REQ-AUTH-001-S1 · Reversión: DROP TABLE
- [x] T1.2 Índice · Archivos: db/003.sql · Depende de: T1.1 · Infra
- [ ] T1.10 Preparar entorno · Infra

## Bloque 2 — API

- [ ] T2.1 Endpoint · Archivos: src/reset.ts · Cubre: REQ-AUTH-001-S1, REQ-AUTH-001-S2 · Depende de: T1.1
`
  it('parsea bloques, tareas, metadatos bilingües y conteos', () => {
    const tasks = parseTasksFile(TASKS, 'tasks.md')
    expect(tasks.blocks).toHaveLength(2)
    expect(tasks.counts).toEqual({ done: 1, total: 4 })
    const t1 = tasks.blocks[0]!.tasks[0]!
    expect(t1.files).toEqual(['db/003.sql'])
    expect(t1.covers).toEqual(['REQ-AUTH-001-S1'])
    expect(t1.rollback).toBe('DROP TABLE')
    const infra = tasks.blocks[0]!.tasks[2]!
    expect(infra.infra).toBe(true)
    expect(tasks.diagnostics.some((d) => d.code === 'TRACE-004')).toBe(false)
  })

  it('marca error cuando una tarea no declara Cubre y no es Infra', () => {
    const tasks = parseTasksFile('## Bloque 1 — X\n- [ ] T1.1 Hacer algo · Archivos: a.txt\n', 'tasks.md')
    expect(tasks.diagnostics.some((d) => d.code === 'TRACE-004')).toBe(true)
  })
})

describe('parseVerifyFile', () => {
  it('parsea evidencia por encabezado y por clave scenario', () => {
    const verify = `# Verificación

### REQ-AUTH-001-S1 — Caso principal

\`\`\`evidence
method: executable
command: npm test -- auth
result: pass
output_hash: sha256:abcdef12
date: 2026-09-15T18:00:00Z
by: aanchante
\`\`\`

\`\`\`evidence
scenario: REQ-AUTH-001-S2
method: manual
result: pass
date: 2026-09-15T18:05:00Z
by: aanchante
\`\`\`
`
    const parsed = parseVerifyFile(verify, 'verify.md')
    expect(parsed.evidence).toHaveLength(2)
    expect(parsed.evidence[0]!.scenario).toBe('REQ-AUTH-001-S1')
    expect(parsed.evidence[0]!.result).toBe('pass')
    expect(parsed.evidence[1]!.scenario).toBe('REQ-AUTH-001-S2')
    expect(parsed.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
  })

  it('exige comando en evidencia ejecutable', () => {
    const verify = '```evidence\nscenario: REQ-A-001-S1\nmethod: executable\nresult: pass\ndate: 2026-01-01T00:00:00Z\nby: x\n```\n'
    const parsed = parseVerifyFile(verify, 'verify.md')
    expect(parsed.diagnostics.some((d) => d.code === 'LINT-EVD-001')).toBe(true)
  })
})
