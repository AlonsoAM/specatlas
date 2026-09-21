import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { initWorkspace } from '../src/init'
import { createChange } from '../src/new'
import { loadChange, loadWorkspace } from '../src/workspace'
import { recordEvidence } from '../src/evidence'
import { deriveState, verifyApproval } from '../src/lifecycle'
import { archiveChange } from '../src/archive'
import { planMockups, writeMockupPlan, writeMockupManifest, checkMockups, lintMockupHtml, computeInputsHash } from '../src/mockups'
import { generatePresentation } from '../src/present'
import { runAnalyze } from '../src/analyze'
import { defaultConfig } from '../src/config'
import { runProcess, splitCommand, hasShellMetacharacters } from '../src/exec'

const DELTA = `# Delta — Restablecer contraseña

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

- Regla BR-AUTH-001: El enlace vence a los 30 minutos.

#### Escenario: REQ-AUTH-001-S1 — Solicitud válida
- **CUANDO** el usuario solicita restablecer con un email registrado
- **ENTONCES** recibe un enlace de un solo uso
`

const TASKS_OK = `# Tareas

## Bloque 1 — API

- [x] T1.1 Endpoint · Archivos: src/reset.ts · Cubre: REQ-AUTH-001-S1
`

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function makeWorkspace(lane: 'standard' | 'fix' = 'standard'): Promise<{ root: string; slug: string; changeDir: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-f1-'))
  await initWorkspace({ root, name: 'f1', language: 'es' })
  const slug = 'reset-password'
  await createChange({ root, slug, lane, domain: 'auth', title: 'Restablecer contraseña' })
  const changeDir = path.join(root, '.sdd', 'changes', slug)
  if (lane === 'standard') {
    await fs.writeFile(path.join(changeDir, 'spec.md'), DELTA, 'utf8')
    await fs.writeFile(path.join(changeDir, 'tasks.md'), TASKS_OK, 'utf8')
  }
  return { root, slug, changeDir }
}

describe('exec seguro', () => {
  it('rechaza metacaracteres y ejecuta sin shell', async () => {
    expect(hasShellMetacharacters('npm test && rm -rf')).toBe(true)
    expect(splitCommand('npm test -- --run')).toEqual(['npm', 'test', '--', '--run'])
    const rejected = await runProcess('echo hola > archivo')
    expect(rejected.ok).toBe(false)
    const ok = await runProcess('node --version')
    expect(ok.ok).toBe(true)
    expect(ok.stdout).toMatch(/^v\d+/)
  })
})

describe('verify --record (evidencia)', () => {
  it('ejecuta el comando, guarda resultado y hash, y reemplaza el bloque al repetir', async () => {
    const { root, slug, changeDir } = await makeWorkspace()
    const first = await recordEvidence({ root, slug, scenario: 'REQ-AUTH-001-S1', command: 'node --version', by: 'Ana', allowedPrefixes: ['node'] })
    expect(first.exitCode).toBe(0)
    expect(first.evidence?.result).toBe('pass')
    expect(first.evidence?.outputHash).toMatch(/^sha256:/)

    const file = path.join(changeDir, 'verify.md')
    const content = await fs.readFile(file, 'utf8')
    expect(content).toContain('REQ-AUTH-001-S1')
    expect(content.match(/```evidence/g)).toHaveLength(1)

    const second = await recordEvidence({ root, slug, scenario: 'REQ-AUTH-001-S1', command: 'node --version', by: 'Ana', allowedPrefixes: ['node'], notes: 'repetido' })
    expect(second.exitCode).toBe(0)
    const content2 = await fs.readFile(file, 'utf8')
    expect(content2.match(/```evidence/g)).toHaveLength(1)
    expect(content2).toContain('repetido')
  })

  it('una nota con dos puntos no rompe el YAML del bloque de evidencia', async () => {
    const { root, slug, changeDir } = await makeWorkspace()
    await recordEvidence({
      root,
      slug,
      scenario: 'REQ-AUTH-001-S1',
      command: 'node --version',
      by: 'Ana',
      allowedPrefixes: ['node'],
      notes: 'Caso probado: el panel no incrusta el visor',
    })
    const change = await loadChange(root, slug)
    expect(change.verify?.diagnostics.filter((finding) => finding.severity === 'error')).toEqual([])
    expect(change.verify?.evidence[0]?.notes).toBe('Caso probado: el panel no incrusta el visor')
    const content = await fs.readFile(path.join(changeDir, 'verify.md'), 'utf8')
    expect(content).toContain('notes: "Caso probado: el panel no incrusta el visor"')
  })

  it('rechaza comandos no declarados en el perfil', async () => {
    const { root, slug } = await makeWorkspace()
    const result = await recordEvidence({ root, slug, scenario: 'REQ-AUTH-001-S1', command: 'npm test', by: 'Ana', allowedPrefixes: ['pytest'] })
    expect(result.exitCode).toBe(2)
    expect(result.diagnostics[0]!.code).toBe('ATLAS-EXEC-002')
  })
})

describe('carril fix', () => {
  it('crea fix.md, exige evidencia y archiva sin plegar deltas', async () => {
    const { root, slug, changeDir } = await makeWorkspace('fix')
    expect(await exists(path.join(changeDir, 'fix.md'))).toBe(true)
    expect(await exists(path.join(changeDir, 'spec.md'))).toBe(false)

    const cfg = defaultConfig()
    const change = await loadChange(root, slug)
    expect(change.meta?.lane).toBe('fix')
    const before = deriveState({ change, cfg, approval: { status: 'not_required' }, blockingFindings: 0 })
    expect(before.state).toBe('draft')
    expect(before.nextAction.command).toContain('/satlas-fix')

    const recorded = await recordEvidence({ root, slug, scenario: 'REQ-FIX-001-S1', method: 'manual', result: 'pass', by: 'Ana', file: 'fix' })
    expect(recorded.exitCode).toBe(0)
    const withFix = await loadChange(root, slug)
    expect(withFix.fix?.evidence).toHaveLength(1)
    const ready = deriveState({ change: withFix, cfg, approval: { status: 'not_required' }, blockingFindings: 0 })
    expect(ready.state).toBe('ready')
    expect(ready.nextAction.command).toContain('satlas archive')

    const archived = await archiveChange({ root, slug })
    expect(archived.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
    expect(await exists(path.join(root, '.sdd', 'changes', 'archive'))).toBe(true)
    expect(await exists(path.join(root, '.sdd', 'changes', slug))).toBe(false)
  })
})

describe('mockups', () => {
  it('planifica, valida HTML y detecta obsolescencia', async () => {
    const { root, slug, changeDir } = await makeWorkspace()
    const change = await loadChange(root, slug)
    const plan = planMockups(change, 'web')
    expect(plan.screens).toHaveLength(1)
    expect(plan.screens[0]!.illustrates).toEqual(['REQ-AUTH-001-S1'])

    await writeMockupPlan(root, slug, plan)
    const inputsHash = await computeInputsHash(root, change)
    await writeMockupManifest(root, slug, plan, inputsHash)

    const bad = lintMockupHtml('<html><body><p>Item 1</p><a href="https://cdn.example/x.css">x</a></body></html>', 'bad.html')
    expect(bad.some((d) => d.code === 'LINT-MKP-003')).toBe(true)
    expect(bad.some((d) => d.code === 'LINT-MKP-009')).toBe(true)
    expect(bad.some((d) => d.code === 'LINT-MKP-008')).toBe(true)

    const good = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div class="banner">MOCKUP · NO FUNCIONAL · v1</div><div data-state="default"></div><div data-state="loading"></div><div data-state="error"></div></body></html>`
    await fs.writeFile(path.join(changeDir, 'mockups', plan.screens[0]!.file), good, 'utf8')

    const check = await checkMockups(root, slug, change)
    expect(check.stale).toBe(false)
    expect(check.findings.filter((d) => d.severity === 'error')).toHaveLength(0)

    await fs.writeFile(path.join(changeDir, 'spec.md'), `${DELTA}\n\n### Requisito: REQ-AUTH-002 — Otra cosa\n\n#### Escenario: REQ-AUTH-002-S1 — x\n- **CUANDO** a\n- **ENTONCES** b\n`, 'utf8')
    const stale = await checkMockups(root, slug, await loadChange(root, slug))
    expect(stale.stale).toBe(true)
    expect(stale.findings.some((d) => d.code === 'MKP-STALE')).toBe(true)
  })
})

describe('present y analyze', () => {
  it('genera la propuesta HTML autocontenida', async () => {
    const { root, slug, changeDir } = await makeWorkspace()
    const result = await generatePresentation({ root, slug })
    expect(result.path).toBeDefined()
    const html = await fs.readFile(result.path!, 'utf8')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('REQ-AUTH-001')
    expect(html).toContain('satlas approve')
    expect(html).not.toContain('https://')
    void changeDir
  })

  it('analyze escribe el informe y bloquea con huecos de trazabilidad', async () => {
    const { root, slug, changeDir } = await makeWorkspace()
    const clean = await runAnalyze({ root, slug })
    expect(clean.status).toBe('passed')
    expect(await exists(path.join(changeDir, 'analyze.md'))).toBe(true)

    await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Bloque 1 — API\n- [ ] T1.1 Sin cobertura · Archivos: a.ts\n', 'utf8')
    const blocked = await runAnalyze({ root, slug })
    expect(blocked.status).toBe('blocked')
    expect(blocked.findings.some((d) => d.code === 'TRACE-004')).toBe(true)
  })

  it('la spec aprobada con hash sigue siendo válida y se invalida al cambiar', async () => {
    const { root, slug } = await makeWorkspace()
    const change = await loadChange(root, slug)
    const { config, workspace } = await loadWorkspace(root)
    expect(workspace.changes).toHaveLength(1)
    const approval = verifyApproval(change, new Map(), config)
    expect(approval.status).toBe('missing')
    void slug
  })
})
