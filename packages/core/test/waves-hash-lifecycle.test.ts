import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseTasksFile } from '../src/parse/tasks'
import { compareTaskIds, planWaves } from '../src/waves'
import { artifactHash, canonicalizeMarkdown } from '../src/hash'
import { defaultConfig } from '../src/config'
import { deriveState, verifyApproval } from '../src/lifecycle'
import { parseDelta } from '../src/parse/delta'
import { parseChangeMeta } from '../src/parse/meta'
import { setMockupRequirement } from '../src/mockups'
import { createChange } from '../src/new'
import { initWorkspace } from '../src/init'
import type { Change } from '../src/model'

describe('planWaves', () => {
  it('ordena numéricamente (T1.2 antes que T1.10) y respeta dependencias', () => {
    const tasks = parseTasksFile(
      `## Bloque 1 — X
- [ ] T1.10 Última · Archivos: c.ts · Cubre: REQ-A-001-S1
- [ ] T1.2 Segunda · Archivos: b.ts · Cubre: REQ-A-001-S1 · Depende de: T1.1
- [ ] T1.1 Primera · Archivos: a.ts · Cubre: REQ-A-001-S1
`,
      'tasks.md',
    )
    expect(compareTaskIds('T1.2', 'T1.10')).toBeLessThan(0)
    const plan = planWaves(tasks, { maxParallel: 2 })
    const waves = plan.blocks[0]!.waves.map((w) => w.map((t) => t.id))
    expect(waves[0]).toEqual(['T1.1', 'T1.10'])
    expect(waves[1]).toEqual(['T1.2'])
  })

  it('evita colisión de archivos en la misma ola', () => {
    const tasks = parseTasksFile(
      `## Bloque 1 — X
- [ ] T1.1 Uno · Archivos: mismo.ts · Cubre: REQ-A-001-S1
- [ ] T1.2 Dos · Archivos: mismo.ts · Cubre: REQ-A-001-S1
`,
      'tasks.md',
    )
    const plan = planWaves(tasks, { maxParallel: 4 })
    const waves = plan.blocks[0]!.waves.map((w) => w.map((t) => t.id))
    expect(waves[0]).toEqual(['T1.1'])
    expect(waves[1]).toEqual(['T1.2'])
    expect(plan.blocks[0]!.degraded.some((d) => d.reason === 'file-collision')).toBe(true)
  })

  it('reporta ciclos y dependencias huérfanas', () => {
    const cyclic = parseTasksFile(
      `## Bloque 1 — X
- [ ] T1.1 Uno · Archivos: a.ts · Cubre: REQ-A-001-S1 · Depende de: T1.2
- [ ] T1.2 Dos · Archivos: b.ts · Cubre: REQ-A-001-S1 · Depende de: T1.1
`,
      'tasks.md',
    )
    const plan = planWaves(cyclic, { maxParallel: 2 })
    expect(plan.blocks[0]!.diagnostics.some((d) => d.code === 'TRACE-010')).toBe(true)

    const orphan = parseTasksFile('## Bloque 1 — X\n- [ ] T1.1 Uno · Archivos: a.ts · Cubre: REQ-A-001-S1 · Depende de: T9.9\n', 'tasks.md')
    const plan2 = planWaves(orphan, { maxParallel: 2 })
    expect(plan2.blocks[0]!.diagnostics.some((d) => d.code === 'TRACE-009')).toBe(true)
  })
})

describe('hash canónico', () => {
  it('CRLF y LF producen el mismo hash', () => {
    const lf = '# Título\n\nTexto\n'
    const crlf = '# Título\r\n\r\nTexto\r\n'
    expect(artifactHash(crlf)).toBe(artifactHash(lf))
  })

  it('ignora BOM, espacios finales y líneas vacías de más', () => {
    const a = '\uFEFF# Título   \n\n\n\nTexto\n\n\n'
    const b = '# Título\n\nTexto\n'
    expect(canonicalizeMarkdown(a)).toBe(canonicalizeMarkdown(b))
  })
})

describe('deriveState + verifyApproval', () => {
  it('recorre el ciclo: draft → awaiting → approved → building → built → ready', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-life-'))
    const cfg = defaultConfig()
    const delta = parseDelta(
      `## Requisitos agregados

### Requisito: REQ-A-001 — X
Prosa.

#### Escenario: REQ-A-001-S1 — Caso
- **CUANDO** a
- **ENTONCES** b
`,
      'changes/x/spec.md',
    )
    const meta = parseChangeMeta('schema_version: 1\nslug: x\nlane: standard\ndomain: auth\n', 'meta.yaml').meta
    const base: Change = { slug: 'x', dir: path.join(tmp, 'changes', 'x'), diagnostics: [], meta, delta }

    const draftState = deriveState({ change: { slug: 'x', dir: base.dir, diagnostics: [], meta }, cfg, approval: { status: 'missing' }, blockingFindings: 0 })
    expect(draftState.state).toBe('draft')

    const awaiting = deriveState({ change: base, cfg, approval: { status: 'missing' }, blockingFindings: 0 })
    expect(awaiting.state).toBe('awaiting_approval')

    const specFile = path.join(tmp, 'changes', 'x', 'spec.md')
    await fs.mkdir(path.dirname(specFile), { recursive: true })
    await fs.writeFile(specFile, '## Requisitos agregados\n\n### Requisito: REQ-A-001 — X\n#### Escenario: REQ-A-001-S1 — Caso\n- **CUANDO** a\n- **ENTONCES** b\n', 'utf8')
    const content = await fs.readFile(specFile, 'utf8')
    const approvals = new Map([['changes/x/spec.md', { hash: artifactHash(content), by: 'Ana', at: '2026-01-01' }]])
    const approval = verifyApproval(base, approvals, cfg, content)
    expect(approval.status).toBe('valid')

    const approved = deriveState({ change: base, cfg, approval, blockingFindings: 0 })
    expect(approved.state).toBe('approved')

    const tasks = parseTasksFile('## Bloque 1 — X\n- [ ] T1.1 Uno · Archivos: a.ts · Cubre: REQ-A-001-S1\n', 'tasks.md')
    const building = deriveState({ change: { ...base, tasks }, cfg, approval, blockingFindings: 0 })
    expect(building.state).toBe('building')
    expect(building.nextAction.command).toContain('/satlas.build')

    const tasksDone = parseTasksFile('## Bloque 1 — X\n- [x] T1.1 Uno · Archivos: a.ts · Cubre: REQ-A-001-S1\n', 'tasks.md')
    const built = deriveState({ change: { ...base, tasks: tasksDone }, cfg, approval, blockingFindings: 0 })
    expect(built.state).toBe('built')
    expect(built.nextAction.command).toContain('satlas verify')

    const verify = {
      path: 'verify.md',
      diagnostics: [],
      evidence: [{ scenario: 'REQ-A-001-S1', method: 'manual' as const, result: 'pass' as const, date: '2026-01-01', by: 'x', line: 1 }],
    }
    const ready = deriveState({ change: { ...base, tasks: tasksDone, verify }, cfg, approval, blockingFindings: 0 })
    expect(ready.state).toBe('ready')
    expect(ready.nextAction.command).toContain('satlas archive')
  })

  it('detecta firma obsoleta cuando la spec cambia', () => {
    const cfg = defaultConfig()
    const delta = parseDelta('## Requisitos agregados\n\n### Requisito: REQ-A-001 — X\n#### Escenario: REQ-A-001-S1 — Caso\n- **CUANDO** a\n- **ENTONCES** b\n', 'spec.md')
    const meta = parseChangeMeta('schema_version: 1\nslug: x\nlane: standard\ndomain: auth\n', 'meta.yaml').meta
    const change: Change = { slug: 'x', dir: 'changes/x', diagnostics: [], meta, delta }
    const approvals = new Map([['changes/x/spec.md', { hash: artifactHash('otro contenido'), by: 'Ana', at: '2026-01-01' }]])
    const approval = verifyApproval(change, approvals, cfg, 'contenido actual')
    expect(approval.status).toBe('stale')
  })

  it('el carril full exige review.md cuando el gate de revisión está en blocking', () => {
    const baseCfg = defaultConfig()
    const cfg = { ...baseCfg, gates: { ...baseCfg.gates, review: { mode: 'blocking' as const } } }
    const delta = parseDelta('## Requisitos agregados\n\n### Requisito: REQ-A-001 — X\nProsa.\n\n#### Escenario: REQ-A-001-S1 — Caso\n- **CUANDO** a\n- **ENTONCES** b\n', 'changes/x/spec.md')
    const meta = parseChangeMeta('schema_version: 1\nslug: x\nlane: full\ndomain: auth\n', 'meta.yaml').meta
    const tasks = parseTasksFile('## Bloque 1 — X\n- [x] T1.1 Uno · Archivos: a.ts · Cubre: REQ-A-001-S1\n', 'tasks.md')
    const verify = {
      path: 'verify.md',
      diagnostics: [],
      evidence: [{ scenario: 'REQ-A-001-S1', method: 'manual' as const, result: 'pass' as const, date: '2026-01-01', by: 'x', line: 1 }],
    }
    const approval = { status: 'valid' as const, approvedBy: 'Ana', approvedAt: '2026-01-01' }
    const change: Change = { slug: 'x', dir: 'changes/x', diagnostics: [], meta, delta, tasks, verify }

    const pending = deriveState({ change, cfg, approval, blockingFindings: 0 })
    expect(pending.state).toBe('verified')
    expect(pending.nextAction.command).toContain('/satlas.review')

    const reviewed = deriveState({ change: { ...change, reviewPath: 'changes/x/review.md' }, cfg, approval, blockingFindings: 0 })
    expect(reviewed.state).toBe('ready')
    expect(reviewed.nextAction.command).toContain('satlas archive')

    const advisory = deriveState({ change, cfg: baseCfg, approval, blockingFindings: 0 })
    expect(advisory.state).toBe('ready')
  })

  it('con la presentación generada el siguiente paso es firmar la aprobación', () => {
    const cfg = defaultConfig()
    const delta = parseDelta('## Requisitos agregados\n\n### Requisito: REQ-A-001 — X\n#### Escenario: REQ-A-001-S1 — Caso\n- **CUANDO** a\n- **ENTONCES** b\n', 'changes/x/spec.md')
    const meta = parseChangeMeta('schema_version: 1\nslug: x\nlane: standard\ndomain: auth\n', 'meta.yaml').meta
    const base: Change = { slug: 'x', dir: 'changes/x', diagnostics: [], meta, delta }

    const notPresented = deriveState({ change: base, cfg, approval: { status: 'missing' }, blockingFindings: 0 })
    expect(notPresented.state).toBe('awaiting_approval')
    expect(notPresented.nextAction.command).toContain('satlas present')

    const presented = deriveState({
      change: { ...base, presentationPath: 'changes/x/presentation/index.html' },
      cfg,
      approval: { status: 'missing' },
      blockingFindings: 0,
    })
    expect(presented.state).toBe('awaiting_approval')
    expect(presented.nextAction.command).toContain('satlas approve')
  })
  it('con mockups requeridos exige mockups antes de aprobar', () => {
    const cfg = defaultConfig()
    const delta = parseDelta('## Requisitos agregados\n\n### Requisito: REQ-A-001 — X\n#### Escenario: REQ-A-001-S1 — Caso\n- **CUANDO** a\n- **ENTONCES** b\n', 'changes/x/spec.md')
    const meta = parseChangeMeta('schema_version: 1\nslug: x\nlane: standard\ndomain: frontend\nmockups: required\n', 'meta.yaml').meta
    const change: Change = { slug: 'x', dir: 'changes/x', diagnostics: [], meta, delta }

    const pending = deriveState({ change, cfg, approval: { status: 'missing' }, blockingFindings: 0 })
    expect(pending.state).toBe('awaiting_mockups')
    expect(pending.nextAction.command).toContain('/satlas-mockup')

    const ready = deriveState({ change, cfg, approval: { status: 'missing' }, blockingFindings: 0, mockupsReady: true })
    expect(ready.state).toBe('awaiting_approval')

    const skipped = deriveState({ change: { ...change, meta: { ...meta!, mockups: 'skip' } }, cfg, approval: { status: 'missing' }, blockingFindings: 0 })
    expect(skipped.state).toBe('awaiting_approval')

    const overridden = deriveState({
      change: { ...change, meta: { ...meta!, overrides: [{ gate: 'mockup', reason: 'urgencia', by: 'Ana', at: '2026-01-01' }] } },
      cfg,
      approval: { status: 'missing' },
      blockingFindings: 0,
    })
    expect(overridden.state).toBe('awaiting_approval')
  })

  it('setMockupRequirement marca meta.yaml sin duplicar la clave', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-mkp-req-'))
    await initWorkspace({ root: tmp, name: 'mkp', language: 'es' })
    await createChange({ root: tmp, slug: 'a', lane: 'standard', domain: 'frontend', title: 'Alta' })
    await setMockupRequirement(tmp, 'a', 'required')
    await setMockupRequirement(tmp, 'a', 'skip')
    const raw = await fs.readFile(path.join(tmp, '.sdd', 'changes', 'a', 'meta.yaml'), 'utf8')
    expect(raw.match(/^mockups:/gm)?.length).toBe(1)
    expect(raw).toContain('mockups: skip')
  })
})
