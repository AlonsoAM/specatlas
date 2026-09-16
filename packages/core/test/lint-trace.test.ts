import { describe, expect, it } from 'vitest'
import { lintDelta } from '../src/lint'
import { checkTrace } from '../src/trace'
import type { Change, Requirement, SpecRef } from '../src/model'
import { parseSpecFile } from '../src/parse/spec'
import { parseDelta } from '../src/parse/delta'
import { parseTasksFile } from '../src/parse/tasks'
import { parseVerifyFile } from '../src/parse/evidence'

const LIVING = parseSpecFile(
  `---
domain: auth
title: Autenticación
version: 1
---

### Requisito: REQ-AUTH-001 — Restablecer contraseña
Prosa.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** email registrado
- **ENTONCES** enlace enviado
`,
  'specs/auth/spec.md',
)

const specs: SpecRef[] = [{ domain: 'auth', path: 'specs/auth/spec.md', spec: LIVING }]

function livingMap(): Map<string, Requirement> {
  const map = new Map<string, Requirement>()
  for (const req of LIVING.requirements) map.set(req.id, req)
  return map
}

describe('lintDelta (negocio)', () => {
  it('detecta jerga técnica y palabras vagas', () => {
    const delta = parseDelta(
      `## Requisitos agregados

### Requisito: REQ-AUTH-004 — Nuevo
El sistema DEBE usar una API rápida y una tabla de base de datos.

#### Escenario: REQ-AUTH-004-S1 — Caso
- **CUANDO** el usuario pide algo
- **ENTONCES** recibe una respuesta robusta
`,
      'delta.md',
    )
    const findings = lintDelta(delta, livingMap(), 'delta.md', { language: 'es', businessOnly: true })
    expect(findings.some((d) => d.code === 'LINT-BIZ-001' && d.message.includes('api'))).toBe(true)
    expect(findings.some((d) => d.code === 'LINT-BIZ-002')).toBe(true)
  })

  it('detecta MODIFIED que pierde escenarios de la spec viva', () => {
    const delta = parseDelta(
      `## Requisitos modificados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
Bloque incompleto sin escenarios.
`,
      'delta.md',
    )
    const findings = lintDelta(delta, livingMap(), 'delta.md', { language: 'es' })
    expect(findings.some((d) => d.code === 'TRACE-007' && d.message.includes('pierde el escenario'))).toBe(true)
  })

  it('detecta MODIFIED de un requisito inexistente', () => {
    const delta = parseDelta(
      `## Requisitos modificados

### Requisito: REQ-AUTH-999 — No existe
Prosa.

#### Escenario: REQ-AUTH-999-S1 — x
- **CUANDO** a
- **ENTONCES** b
`,
      'delta.md',
    )
    const findings = lintDelta(delta, livingMap(), 'delta.md', { language: 'es' })
    expect(findings.some((d) => d.code === 'TRACE-007' && d.message.includes('no existe'))).toBe(true)
  })
})

function makeChange(partial: Partial<Change>): Change {
  return { slug: 'reset-password', dir: 'changes/reset-password', diagnostics: [], ...partial }
}

describe('checkTrace', () => {
  const delta = parseDelta(
    `## Requisitos agregados

### Requisito: REQ-AUTH-004 — Nuevo
Prosa.

#### Escenario: REQ-AUTH-004-S1 — Caso
- **CUANDO** a
- **ENTONCES** b
`,
    'changes/reset-password/spec.md',
  )

  it('sin plan (sin tareas), no reporta TRACE-002: la cobertura se exige al planificar', () => {
    const change = makeChange({ delta })
    const result = checkTrace({ specs, change, requireEvidence: false })
    expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0)
  })

  it('TRACE-002: escenario sin tarea', () => {
    const tasks = parseTasksFile('## Bloque 1 — X\n- [ ] T1.1 Otra cosa · Infra\n', 'tasks.md')
    const change = makeChange({ delta, tasks })
    const result = checkTrace({ specs, change, requireEvidence: false })
    expect(result.findings.some((f) => f.code === 'TRACE-002' && f.message.includes('REQ-AUTH-004-S1'))).toBe(true)
  })

  it('sin hallazgos cuando el escenario está cubierto', () => {
    const tasks = parseTasksFile('## Bloque 1 — X\n- [ ] T1.1 Implementar · Archivos: src/a.ts · Cubre: REQ-AUTH-004-S1\n', 'tasks.md')
    const change = makeChange({ delta, tasks })
    const result = checkTrace({ specs, change, requireEvidence: false })
    expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0)
  })

  it('TRACE-003: Cubre inexistente y TRACE-009/010 de dependencias', () => {
    const tasks = parseTasksFile(
      `## Bloque 1 — X
- [ ] T1.1 Uno · Archivos: a.ts · Cubre: REQ-NO-999-S1 · Depende de: T1.2
- [ ] T1.2 Dos · Archivos: b.ts · Cubre: REQ-AUTH-004-S1 · Depende de: T1.1
`,
      'tasks.md',
    )
    const change = makeChange({ delta, tasks })
    const result = checkTrace({ specs, change, requireEvidence: false })
    expect(result.findings.some((f) => f.code === 'TRACE-003')).toBe(true)
    expect(result.findings.some((f) => f.code === 'TRACE-010')).toBe(true)
  })

  it('TRACE-005: exige evidencia cuando las tareas terminaron', () => {
    const tasks = parseTasksFile('## Bloque 1 — X\n- [x] T1.1 Hecha · Archivos: a.ts · Cubre: REQ-AUTH-004-S1\n', 'tasks.md')
    const change = makeChange({ delta, tasks })
    const result = checkTrace({ specs, change, requireEvidence: true })
    expect(result.findings.some((f) => f.code === 'TRACE-005' && f.message.includes('REQ-AUTH-004-S1'))).toBe(true)

    const verify = parseVerifyFile(
      '```evidence\nscenario: REQ-AUTH-004-S1\nmethod: manual\nresult: pass\ndate: 2026-01-01T00:00:00Z\nby: x\n```\n',
      'verify.md',
    )
    const withEvidence = checkTrace({ specs, change: makeChange({ delta, tasks, verify }), requireEvidence: true })
    expect(withEvidence.findings.some((f) => f.code === 'TRACE-005')).toBe(false)
  })

  it('TRACE-006: evidencia huérfana', () => {
    const verify = parseVerifyFile(
      '```evidence\nscenario: REQ-OTRO-001-S1\nmethod: manual\nresult: pass\ndate: 2026-01-01T00:00:00Z\nby: x\n```\n',
      'verify.md',
    )
    const change = makeChange({ delta, verify })
    const result = checkTrace({ specs, change, requireEvidence: false })
    expect(result.findings.some((f) => f.code === 'TRACE-006')).toBe(true)
  })
})
