import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { agentCli, agentCommand, agentCommandsByTarget, primaryTarget } from '../src/agents'
import { defaultConfig } from '../src/config'
import { initWorkspace } from '../src/init'
import { deriveState } from '../src/lifecycle'
import { lintDelta } from '../src/lint'
import { createChange } from '../src/new'
import { parseDelta } from '../src/parse/delta'
import { parseChangeMeta } from '../src/parse/meta'
import { parseTasksFile } from '../src/parse/tasks'
import { pauseChange, resumeChange } from '../src/pause'
import { isPlaceholderText, isSkeletonDelta } from '../src/placeholders'
import type { Change } from '../src/model'

async function tempProject(prefix: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  await initWorkspace({ root, name: 'demo', language: 'es' })
  return root
}

async function loadSkeletonChange(root: string, slug: string): Promise<Change> {
  const dir = path.join(root, '.sdd', 'changes', slug)
  const deltaText = await fs.readFile(path.join(dir, 'spec.md'), 'utf8')
  const metaText = await fs.readFile(path.join(dir, 'meta.yaml'), 'utf8')
  const delta = parseDelta(deltaText, path.join(dir, 'spec.md'))
  const meta = parseChangeMeta(metaText, path.join(dir, 'meta.yaml')).meta
  return { slug, dir, delta, ...(meta ? { meta } : {}) } as Change
}

describe('la plantilla de `satlas new` no pasa como especificación', () => {
  it('reconoce el texto de plantilla y lo distingue del contenido real', () => {
    expect(isPlaceholderText('(regla de negocio verificable)')).toBe(true)
    expect(isPlaceholderText('(situación o acción del actor)')).toBe(true)
    expect(isPlaceholderText('Describe la necesidad de negocio y el comportamiento esperado (sin tecnología).')).toBe(true)
    expect(isPlaceholderText('   ')).toBe(true)
    expect(isPlaceholderText('El solicitante recibe el correo en menos de 2 minutos')).toBe(false)
    expect(isPlaceholderText('La cuota mensual (sin impuestos) no supera el límite del contrato')).toBe(false)
  })

  it('el delta recién creado es esqueleto y el lint lo reporta como error', async () => {
    const root = await tempProject('satlas-skeleton-')
    await createChange({ root, slug: 'login', domain: 'auth', title: 'Iniciar sesión', cfg: defaultConfig() })
    const change = await loadSkeletonChange(root, 'login')

    expect(isSkeletonDelta(change.delta!)).toBe(true)
    const findings = lintDelta(change.delta!, new Map(), path.join(change.dir, 'spec.md'))
    const placeholders = findings.filter((d) => d.code === 'LINT-BIZ-003')
    expect(placeholders).toHaveLength(1)
    expect(placeholders[0]!.severity).toBe('error')
  })

  it('la siguiente acción de un delta esqueleto es especificar, no aprobar', async () => {
    const root = await tempProject('satlas-skeleton-state-')
    await createChange({ root, slug: 'login', domain: 'auth', title: 'Iniciar sesión', cfg: defaultConfig() })
    const change = await loadSkeletonChange(root, 'login')

    const state = deriveState({ change, cfg: defaultConfig(), approval: { status: 'missing' }, blockingFindings: 1 })
    expect(state.state).toBe('spec_draft')
    expect(state.nextAction.command).toBe('/satlas-specify login')
    expect(state.nextAction.requiresAgent).toBe(true)
  })

  it('un delta escrito de verdad deja de ser esqueleto', async () => {
    const delta = parseDelta(
      `# Delta — Iniciar sesión

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Iniciar sesión
El solicitante accede con sus credenciales vigentes.

- Regla BR-AUTH-001: la sesión caduca a los 30 minutos sin actividad

#### Escenario: REQ-AUTH-001-S1 — Credenciales válidas
- **CUANDO** el solicitante envía credenciales vigentes
- **ENTONCES** obtiene acceso y ve su panel inicial
`,
      'spec.md',
    )
    expect(isSkeletonDelta(delta)).toBe(false)
    expect(lintDelta(delta, new Map(), 'spec.md').filter((d) => d.code === 'LINT-BIZ-003')).toHaveLength(0)
  })
})

describe('la invocación del agente sale del target configurado', () => {
  it('cada agente recibe su propia sintaxis', () => {
    const opencode = { adapters: { targets: ['opencode' as const] } }
    const claude = { adapters: { targets: ['claude-code' as const] } }
    const generic = { adapters: { targets: ['generic' as const] } }

    expect(agentCommand('specify', 'login', opencode)).toBe('/satlas-specify login')
    expect(agentCommand('plan', 'login', claude)).toBe('/satlas:plan login')
    expect(agentCommand('docs', 'login', generic)).toBe('prompts/satlas-docs.md login')
    expect(agentCommand('build', '', opencode)).toBe('/satlas-build')
  })

  it('sin configuración usa opencode y expone la tabla completa', () => {
    expect(primaryTarget(undefined)).toBe('opencode')
    expect(agentCommand('review', 'login')).toBe('/satlas-review login')
    const all = agentCommandsByTarget('specify', 'login')
    expect(all).toHaveLength(7)
    expect(all.find((item) => item.target === 'gemini')?.command).toBe('/satlas:specify login')
  })

  it('el ejecutable de terminal corresponde al agente', () => {
    expect(agentCli('opencode')).toBe('opencode')
    expect(agentCli('claude-code')).toBe('claude')
    expect(agentCli(undefined)).toBe('opencode')
  })
})

describe('pausar y reanudar un cambio', () => {
  it('registra la pausa con motivo y autor sin perder el resto del meta.yaml', async () => {
    const root = await tempProject('satlas-pause-')
    await createChange({ root, slug: 'login', domain: 'auth', title: 'Iniciar sesión', cfg: defaultConfig() })

    const paused = await pauseChange({ root, slug: 'login', reason: 'esperando definición de negocio', by: 'Alonso Anchante' })
    expect(paused.diagnostics).toHaveLength(0)
    const raw = await fs.readFile(path.join(root, '.sdd', 'changes', 'login', 'meta.yaml'), 'utf8')
    expect(raw).toContain('paused:')
    expect(raw).toContain('esperando definición de negocio')
    expect(raw).toContain('domain: auth')
    expect(raw.startsWith('# Estado del cambio')).toBe(true)

    const meta = parseChangeMeta(raw, 'meta.yaml').meta
    expect(meta?.paused?.by).toBe('Alonso Anchante')
  })

  it('un cambio pausado se muestra como pausado y su acción es reanudar', async () => {
    const root = await tempProject('satlas-pause-state-')
    await createChange({ root, slug: 'login', domain: 'auth', title: 'Iniciar sesión', cfg: defaultConfig() })
    await pauseChange({ root, slug: 'login', reason: 'esperando negocio', by: 'Alonso' })
    const change = await loadSkeletonChange(root, 'login')

    const state = deriveState({ change, cfg: defaultConfig(), approval: { status: 'missing' }, blockingFindings: 0 })
    expect(state.state).toBe('paused')
    expect(state.nextAction.command).toBe('satlas resume login')
  })

  it('reanudar quita la pausa y avisa si el cambio no estaba pausado', async () => {
    const root = await tempProject('satlas-resume-')
    await createChange({ root, slug: 'login', domain: 'auth', title: 'Iniciar sesión', cfg: defaultConfig() })
    await pauseChange({ root, slug: 'login', reason: 'negocio', by: 'Alonso' })

    const resumed = await resumeChange(root, 'login')
    expect(resumed.resumed).toBe(true)
    expect(resumed.previous?.reason).toBe('negocio')
    const raw = await fs.readFile(path.join(root, '.sdd', 'changes', 'login', 'meta.yaml'), 'utf8')
    expect(raw).not.toContain('paused:')

    const again = await resumeChange(root, 'login')
    expect(again.resumed).toBe(false)
    expect(again.diagnostics[0]?.code).toBe('ATLAS-PAUSE-004')
  })

  it('la pausa exige motivo y autor', async () => {
    const root = await tempProject('satlas-pause-args-')
    await createChange({ root, slug: 'login', domain: 'auth', cfg: defaultConfig() })
    expect((await pauseChange({ root, slug: 'login', reason: '  ', by: 'Alonso' })).diagnostics[0]?.code).toBe('ATLAS-PAUSE-002')
    expect((await pauseChange({ root, slug: 'login', reason: 'motivo', by: '' })).diagnostics[0]?.code).toBe('ATLAS-PAUSE-003')
    expect((await pauseChange({ root, slug: 'no-existe', reason: 'motivo', by: 'Alonso' })).diagnostics[0]?.code).toBe('ATLAS-PAUSE-001')
  })
})

describe('carriles permitidos', () => {
  it('no se crea un cambio en un carril que el proyecto no permite', async () => {
    const root = await tempProject('satlas-lanes-')
    const cfg = defaultConfig()
    cfg.lanes.allowed = ['fix', 'standard']

    const rejected = await createChange({ root, slug: 'grande', lane: 'full', cfg })
    expect(rejected.files).toHaveLength(0)
    expect(rejected.diagnostics[0]?.code).toBe('ATLAS-NEW-003')

    const accepted = await createChange({ root, slug: 'normal', lane: 'standard', cfg })
    expect(accepted.diagnostics).toHaveLength(0)
  })
})

describe('la firma no se salta', () => {
  const DELTA_OK = [
    '## Requisitos agregados',
    '',
    '### Requisito: REQ-AUTH-001 — Iniciar sesión',
    'El solicitante accede con sus credenciales vigentes.',
    '',
    '- Regla BR-AUTH-001: la sesión caduca a los 30 minutos sin actividad',
    '',
    '#### Escenario: REQ-AUTH-001-S1 — Credenciales válidas',
    '- **CUANDO** el solicitante envía credenciales vigentes',
    '- **ENTONCES** obtiene acceso y ve su panel inicial',
  ].join(String.fromCharCode(10))

  function cambioConTareas(): Change {
    const delta = parseDelta(DELTA_OK, 'changes/x/spec.md')
    const meta = parseChangeMeta(['schema_version: 1', 'slug: x', 'lane: standard', 'domain: auth'].join(String.fromCharCode(10)), 'meta.yaml').meta
    const tasks = parseTasksFile(['## Bloque 1 — X', '- [x] T1.1 Uno · Archivos: a.ts · Cubre: REQ-AUTH-001-S1'].join(String.fromCharCode(10)), 'tasks.md')
    return { slug: 'x', dir: 'changes/x', diagnostics: [], delta, tasks, planPath: 'plan.md', ...(meta ? { meta } : {}) } as Change
  }

  it('un cambio sin firma no avanza a construido aunque sus tareas estén hechas', () => {
    // Antes: los huecos de trazabilidad (escenarios sin evidencia) desviaban el
    // estado a «construido» y la firma quedaba atrás sin que nadie la pidiera.
    const state = deriveState({ change: cambioConTareas(), cfg: defaultConfig(), approval: { status: 'missing' }, blockingFindings: 3, specFindings: 0 })
    expect(state.state).toBe('awaiting_approval')
    expect(state.blockedBy.join(' ')).toContain('no está aprobada')

    // Con la propuesta ya generada, la acción es firmarla.
    const conPropuesta = deriveState({
      change: { ...cambioConTareas(), presentationPath: 'changes/x/presentation/index.html' },
      cfg: defaultConfig(),
      approval: { status: 'missing' },
      blockingFindings: 3,
      specFindings: 0,
    })
    expect(conPropuesta.nextAction.command).toContain('satlas approve x')
  })

  it('una firma obsoleta tampoco deja avanzar', () => {
    const state = deriveState({ change: cambioConTareas(), cfg: defaultConfig(), approval: { status: 'stale' }, blockingFindings: 3, specFindings: 0 })
    expect(state.state).toBe('awaiting_approval')
  })

  it('los hallazgos de la propia especificación se corrigen antes de firmar', () => {
    const state = deriveState({ change: cambioConTareas(), cfg: defaultConfig(), approval: { status: 'missing' }, blockingFindings: 2, specFindings: 2 })
    expect(state.state).toBe('spec_draft')
    expect(state.nextAction.command).toContain('satlas validate')
  })

  it('con la firma vigente, los huecos de trazabilidad sí marcan la fase', () => {
    const approval = { status: 'valid' as const, approvedBy: 'Alonso', approvedAt: '2026-01-01' }
    const state = deriveState({ change: cambioConTareas(), cfg: defaultConfig(), approval, blockingFindings: 3, specFindings: 0 })
    expect(state.state).toBe('built')
    expect(state.nextAction.command).toContain('satlas verify')
  })
})
