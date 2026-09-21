import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { amendChange } from '../src/amend'
import { anchorsFromTasks, loadAnchors, mergeAnchors, parseAnchors, splitAnchor, writeAnchors } from '../src/anchors'
import { archiveChange } from '../src/archive'
import { signApproval } from '../src/approvals'
import { defaultConfig } from '../src/config'
import { checkDrift, containsSymbol, pruneAnchors } from '../src/drift'
import { initWorkspace } from '../src/init'
import { createChange } from '../src/new'
import { parseDelta } from '../src/parse/delta'
import { parseChangeMeta } from '../src/parse/meta'
import { openBlockingFindings, parseReview, reviewPassed } from '../src/parse/review'
import { parseTasksFile } from '../src/parse/tasks'
import { deriveState, reviewAdvisory } from '../src/lifecycle'
import type { Change } from '../src/model'

const NL = String.fromCharCode(10)

const DELTA = [
  '# Delta — Restablecer',
  '',
  '## Requisitos agregados',
  '',
  '### Requisito: REQ-AUTH-001 — Restablecer contraseña',
  'El solicitante recupera el acceso sin ayuda de soporte.',
  '',
  '- Regla BR-AUTH-001: el enlace vence a los 30 minutos',
  '',
  '#### Escenario: REQ-AUTH-001-S1 — Correo registrado',
  '- **CUANDO** el solicitante pide restablecer con un correo registrado',
  '- **ENTONCES** recibe un enlace de un solo uso',
].join(NL)

const TASKS = [
  '# Tareas',
  '',
  '## Bloque 1 — Acceso',
  '',
  '- [x] T1.1 Solicitud · Archivos: src/reset.ts#pedirReset, .sdd/changes/reset/verify.md · Cubre: REQ-AUTH-001-S1',
].join(NL)

const VERIFY = ['# Verificación', '', '### REQ-AUTH-001-S1 — Correo registrado', '', '```evidence', 'method: manual', 'result: pass', 'date: 2026-01-01T00:00:00Z', 'by: Alonso', '```'].join(NL)

async function projectWithChange(prefix: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  await initWorkspace({ root, name: 'demo', language: 'es' })
  await createChange({ root, slug: 'reset', domain: 'auth', title: 'Restablecer', cfg: defaultConfig() })
  const dir = path.join(root, '.sdd', 'changes', 'reset')
  await fs.writeFile(path.join(dir, 'spec.md'), DELTA, 'utf8')
  await fs.writeFile(path.join(dir, 'tasks.md'), TASKS, 'utf8')
  await fs.writeFile(path.join(dir, 'verify.md'), VERIFY, 'utf8')
  await fs.writeFile(path.join(dir, 'plan.md'), `# Plan${NL}${NL}## Enfoque${NL}Mínimo.${NL}`, 'utf8')
  await fs.mkdir(path.join(root, 'src'), { recursive: true })
  await fs.writeFile(path.join(root, 'src', 'reset.ts'), 'export function pedirReset() { return true }' + NL, 'utf8')
  return root
}

describe('anclas de implementación', () => {
  it('derivan de las tareas y dejan fuera los artefactos del proceso', () => {
    const delta = parseDelta(DELTA, 'spec.md')
    const tasks = parseTasksFile(TASKS, 'tasks.md')
    const anchors = anchorsFromTasks(delta, tasks, new Date('2026-09-21T12:00:00Z'))

    expect(anchors).toHaveLength(1)
    expect(anchors[0]!.requirement).toBe('REQ-AUTH-001')
    expect(anchors[0]!.files).toEqual(['src/reset.ts#pedirReset'])
    expect(anchors[0]!.source).toBe('archive')
  })

  it('archivar registra las anclas de la spec viva', async () => {
    const root = await projectWithChange('satlas-anchor-archive-')
    await signApproval({ root, artifact: path.join(root, '.sdd', 'changes', 'reset', 'spec.md'), by: 'Alonso' })

    const result = await archiveChange({ root, slug: 'reset' })
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
    expect(result.anchored).toEqual(['REQ-AUTH-001'])

    const anchors = await loadAnchors(root, 'auth')
    expect(anchors.anchors[0]!.files).toEqual(['src/reset.ts#pedirReset'])
  })

  it('lo escrito a mano se conserva al fundir', () => {
    const current = [{ requirement: 'REQ-AUTH-001', files: ['docs/manual.md'], source: 'manual' as const }]
    const incoming = [{ requirement: 'REQ-AUTH-001', files: ['src/reset.ts'], source: 'archive' as const, updated: '2026-09-21' }]
    const merged = mergeAnchors(current, incoming)

    expect(merged).toHaveLength(1)
    expect(merged[0]!.files.sort()).toEqual(['docs/manual.md', 'src/reset.ts'])
    expect(merged[0]!.source).toBe('manual')
  })

  it('separa la ruta del símbolo y lee el archivo de anclas', () => {
    expect(splitAnchor('src/a.ts#hacer')).toEqual({ file: 'src/a.ts', symbol: 'hacer' })
    expect(splitAnchor('src/a.ts')).toEqual({ file: 'src/a.ts' })

    const parsed = parseAnchors(['schema_version: 1', 'anchors:', '  - requirement: req-auth-001', '    files:', '      - src/a.ts'].join(NL), 'anchors.yaml', 'auth')
    expect(parsed.anchors[0]!.requirement).toBe('REQ-AUTH-001')
  })
})

describe('deriva entre las specs vivas y el código', () => {
  it('avisa cuando el archivo desaparece y cuando el símbolo se renombra', async () => {
    const root = await projectWithChange('satlas-drift-')
    await writeAnchors(root, 'auth', [{ requirement: 'REQ-AUTH-001', files: ['src/reset.ts#pedirReset'] }])
    const config = defaultConfig()

    expect((await checkDrift({ root, config })).drifted).toHaveLength(0)

    await fs.writeFile(path.join(root, 'src', 'reset.ts'), 'export function solicitarReset() { return true }' + NL, 'utf8')
    const renamed = await checkDrift({ root, config })
    expect(renamed.drifted[0]!.kind).toBe('missing-symbol')
    expect(renamed.findings[0]!.code).toBe('ATLAS-DRIFT-002')
    expect(renamed.findings[0]!.severity).toBe('warning')

    await fs.rm(path.join(root, 'src', 'reset.ts'))
    const removed = await checkDrift({ root, config })
    expect(removed.drifted[0]!.kind).toBe('missing-file')
    expect(removed.findings[0]!.code).toBe('ATLAS-DRIFT-001')
  })

  it('el modo estricto convierte la deriva en error', async () => {
    const root = await projectWithChange('satlas-drift-strict-')
    await writeAnchors(root, 'auth', [{ requirement: 'REQ-AUTH-001', files: ['src/no-existe.ts'] }])
    const base = defaultConfig()
    const strict = { ...base, ci: { drift: 'strict' as const } }

    const report = await checkDrift({ root, config: strict })
    expect(report.findings[0]!.severity).toBe('error')
    expect(report.mode).toBe('strict')
  })

  it('depurar retira solo las anclas rotas', async () => {
    const root = await projectWithChange('satlas-drift-prune-')
    await writeAnchors(root, 'auth', [{ requirement: 'REQ-AUTH-001', files: ['src/reset.ts', 'src/no-existe.ts'] }])
    const config = defaultConfig()

    const report = await checkDrift({ root, config })
    const anchors = [await loadAnchors(root, 'auth')]
    const pruned = await pruneAnchors(root, report.drifted, anchors)

    expect(pruned[0]!.removed).toEqual([{ requirement: 'REQ-AUTH-001', anchor: 'src/no-existe.ts' }])
    expect((await loadAnchors(root, 'auth')).anchors[0]!.files).toEqual(['src/reset.ts'])
    expect((await checkDrift({ root, config })).drifted).toHaveLength(0)
  })

  it('el símbolo se busca como palabra completa', () => {
    expect(containsSymbol('export function pedirReset() {}', 'pedirReset')).toBe(true)
    expect(containsSymbol('export function pedirResetTotal() {}', 'pedirReset')).toBe(false)
  })
})

describe('revisión de código', () => {
  const REVIEW_ABIERTA = ['## Veredicto', '', '- resultado: pass', '- por: Ana', '', '## Hallazgos', '', '- [ ] (bloqueante) la contraseña queda en el log · Archivo: src/reset.ts:12', '- [x] (menor) falta el estado vacío'].join(NL)

  it('lee el veredicto, la severidad y lo que queda abierto', () => {
    const review = parseReview(REVIEW_ABIERTA, 'review.md')
    expect(review.verdict).toBe('pass')
    expect(review.by).toBe('Ana')
    expect(review.findings).toHaveLength(2)
    expect(review.findings[0]!.severity).toBe('bloqueante')
    expect(review.findings[0]!.location).toBe('src/reset.ts:12')
    expect(openBlockingFindings(review)).toHaveLength(1)
    expect(reviewPassed(review)).toBe(false)
  })

  it('sin resultado declarado avisa y no cierra', () => {
    const review = parseReview(['## Hallazgos', '', '- [x] (menor) nada que objetar'].join(NL), 'review.md')
    expect(review.verdict).toBe('pending')
    expect(review.diagnostics[0]!.code).toBe('ATLAS-REVIEW-002')
    expect(reviewPassed(review)).toBe(false)
  })

  it('el gate bloqueante también aplica al carril estándar', () => {
    const base = defaultConfig()
    const cfg = { ...base, gates: { ...base.gates, review: { mode: 'blocking' as const } } }
    const delta = parseDelta(DELTA, 'spec.md')
    const meta = parseChangeMeta(['schema_version: 1', 'slug: reset', 'lane: standard', 'domain: auth'].join(NL), 'meta.yaml').meta
    const tasks = parseTasksFile(TASKS, 'tasks.md')
    const verify = {
      path: 'verify.md',
      diagnostics: [],
      evidence: [{ scenario: 'REQ-AUTH-001-S1', method: 'manual' as const, result: 'pass' as const, date: '2026-01-01', by: 'Alonso', line: 1 }],
    }
    const change: Change = { slug: 'reset', dir: 'changes/reset', diagnostics: [], meta, delta, tasks, verify, planPath: 'plan.md' }
    const approval = { status: 'valid' as const, approvedBy: 'Alonso', approvedAt: '2026-01-01' }

    const sinReview = deriveState({ change, cfg, approval, blockingFindings: 0 })
    expect(sinReview.state).toBe('verified')

    const conAbierta = deriveState({ change: { ...change, reviewPath: 'review.md', review: parseReview(REVIEW_ABIERTA, 'review.md') }, cfg, approval, blockingFindings: 0 })
    expect(conAbierta.state).toBe('verified')
    expect(conAbierta.nextAction.command).toBe('satlas review reset')

    const cerrada = parseReview(['## Veredicto', '', '- resultado: pass', '', '## Hallazgos', '', '- [x] (bloqueante) resuelto'].join(NL), 'review.md')
    const conCerrada = deriveState({ change: { ...change, reviewPath: 'review.md', review: cerrada }, cfg, approval, blockingFindings: 0 })
    expect(conCerrada.state).toBe('ready')
  })

  it('el aviso llega cuando ya hay código que revisar, no antes', () => {
    const cfg = defaultConfig()
    const delta = parseDelta(DELTA, 'spec.md')
    const meta = parseChangeMeta(['schema_version: 1', 'slug: reset', 'lane: standard', 'domain: auth'].join(NL), 'meta.yaml').meta
    const pendiente = parseTasksFile(['## Bloque 1 — X', '- [ ] T1.1 Uno · Archivos: a.ts · Cubre: REQ-AUTH-001-S1'].join(NL), 'tasks.md')
    const hechas = parseTasksFile(['## Bloque 1 — X', '- [x] T1.1 Uno · Archivos: a.ts · Cubre: REQ-AUTH-001-S1'].join(NL), 'tasks.md')

    expect(reviewAdvisory({ slug: 'reset', dir: 'changes/reset', diagnostics: [], meta, delta, tasks: pendiente }, cfg)).toHaveLength(0)
    const aviso = reviewAdvisory({ slug: 'reset', dir: 'changes/reset', diagnostics: [], meta, delta, tasks: hechas }, cfg)
    expect(aviso[0]!.code).toBe('ATLAS-REVIEW-001')
  })
})

describe('enmienda de una spec aprobada', () => {
  it('registra motivo, autor y huellas, y vuelve a firmar', async () => {
    const root = await projectWithChange('satlas-amend-')
    const specFile = path.join(root, '.sdd', 'changes', 'reset', 'spec.md')
    await signApproval({ root, artifact: specFile, by: 'Alonso Anchante' })

    await fs.writeFile(specFile, DELTA.replace('30 minutos', '15 minutos'), 'utf8')
    const result = await amendChange({ root, slug: 'reset', reason: 'negocio bajó el vencimiento', by: 'Alonso Anchante' })

    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
    expect(result.amendment?.from).not.toBe(result.amendment?.to)

    const meta = await fs.readFile(path.join(root, '.sdd', 'changes', 'reset', 'meta.yaml'), 'utf8')
    expect(meta).toContain('amendments:')
    expect(meta).toContain('negocio bajó el vencimiento')
    expect(meta).toContain('domain: auth')

    const approvals = await fs.readFile(path.join(root, '.sdd', 'approvals.yaml'), 'utf8')
    expect(approvals).toContain('enmienda: negocio bajó el vencimiento')
  })

  it('sin aprobación previa, sin motivo o sin cambios no enmienda', async () => {
    const root = await projectWithChange('satlas-amend-guard-')
    const specFile = path.join(root, '.sdd', 'changes', 'reset', 'spec.md')

    expect((await amendChange({ root, slug: 'reset', reason: 'x', by: 'Alonso' })).diagnostics[0]!.code).toBe('ATLAS-AMEND-004')
    await signApproval({ root, artifact: specFile, by: 'Alonso' })
    expect((await amendChange({ root, slug: 'reset', reason: '  ', by: 'Alonso' })).diagnostics[0]!.code).toBe('ATLAS-AMEND-002')
    expect((await amendChange({ root, slug: 'reset', reason: 'x', by: '' })).diagnostics[0]!.code).toBe('ATLAS-AMEND-003')

    const unchanged = await amendChange({ root, slug: 'reset', reason: 'sin tocar nada', by: 'Alonso' })
    expect(unchanged.unchanged).toBe(true)
    expect(unchanged.diagnostics[0]!.code).toBe('ATLAS-AMEND-005')
  })
})
