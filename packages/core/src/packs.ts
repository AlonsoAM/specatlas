import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import type { Diagnostic, Severity } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { listDir, readTextIfExists } from './fsx.js'
import type { AtlasConfig } from './config.js'
import type { Change, Delta, Lane, TasksFile, VerifyFile } from './model.js'

export type PackCheckType =
  | 'task-rollback'
  | 'evidence-strong'
  | 'spec-terms'
  | 'rule-terms'
  | 'nfr-measurable'
  | 'approval-provider'

export interface PackCheck {
  id: string
  title: string
  type: PackCheckType
  severity: Severity
  appliesTo?: { domains?: string[]; lanes?: Lane[] }
  params?: { terms?: string[] }
  hint?: string
}

export interface Pack {
  id: string
  title: string
  description: string
  source: 'builtin' | 'project'
  checks: PackCheck[]
}

const checkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['task-rollback', 'evidence-strong', 'spec-terms', 'rule-terms', 'nfr-measurable', 'approval-provider']),
  severity: z.enum(['error', 'warning', 'info']).default('warning'),
  applies_to: z.object({ domains: z.array(z.string()).optional(), lanes: z.array(z.enum(['fix', 'standard', 'full'])).optional() }).optional(),
  params: z.object({ terms: z.array(z.string()).optional() }).optional(),
  hint: z.string().optional(),
})

const packSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  checks: z.array(checkSchema).min(1),
})

export const BUILTIN_PACKS: Pack[] = [
  {
    id: 'seguridad',
    title: 'Seguridad de la información',
    description: 'Controles mínimos para cambios que tocan autenticación, datos o infraestructura.',
    source: 'builtin',
    checks: [
      {
        id: 'SEG-1',
        title: 'Toda tarea declara cómo revertir',
        type: 'task-rollback',
        severity: 'error',
        hint: 'Añade · Reversión: <cómo revertir> a cada tarea del cambio.',
      },
      {
        id: 'SEG-2',
        title: 'La evidencia es automatizable (no manual)',
        type: 'evidence-strong',
        severity: 'warning',
        appliesTo: { domains: ['backend', 'database', 'infra', 'fullstack'] },
        hint: 'Registra la evidencia con un comando real (satlas verify --command) o una comprobación automática.',
      },
      {
        id: 'SEG-3',
        title: 'Los requisitos nombran el control de seguridad',
        type: 'rule-terms',
        severity: 'warning',
        params: { terms: ['autenticación', 'autorización', 'permiso', 'cifrado', 'secreto', 'token', 'sesión'] },
        hint: 'Si el cambio toca seguridad, descríbelo en una regla (BR-*): quién accede, con qué permiso y cómo se protege.',
      },
    ],
  },
  {
    id: 'datos',
    title: 'Datos personales y privacidad',
    description: 'Controles de privacidad para cambios que tratan datos de personas.',
    source: 'builtin',
    checks: [
      {
        id: 'DAT-1',
        title: 'Se declara la finalidad y el ciclo de vida del dato',
        type: 'rule-terms',
        severity: 'warning',
        params: { terms: ['datos personales', 'consentimiento', 'retención', 'anonimiz', 'privacidad', 'eliminación'] },
        hint: 'Añade una regla de negocio que diga para qué se usan los datos y cuándo se eliminan.',
      },
      {
        id: 'DAT-2',
        title: 'Toda tarea declara cómo revertir',
        type: 'task-rollback',
        severity: 'error',
        hint: 'Añade · Reversión: <cómo revertir> a cada tarea del cambio.',
      },
      {
        id: 'DAT-3',
        title: 'Los escenarios cubren la eliminación o exportación',
        type: 'spec-terms',
        severity: 'warning',
        params: { terms: ['elimin', 'export', 'borrar', 'anonimiz'] },
        hint: 'Incluye un escenario donde la persona ejerce sus derechos sobre el dato.',
      },
    ],
  },
  {
    id: 'auditoria',
    title: 'Auditoría y control interno',
    description: 'Controles para procesos financieros o regulados: rastro completo y evidencia fuerte.',
    source: 'builtin',
    checks: [
      {
        id: 'AUD-1',
        title: 'Toda tarea declara cómo revertir',
        type: 'task-rollback',
        severity: 'error',
      },
      {
        id: 'AUD-2',
        title: 'Evidencia ejecutable o automática (sin manual)',
        type: 'evidence-strong',
        severity: 'error',
        hint: 'Un proceso auditado no se cierra con evidencia manual: usa pruebas, .http o un script.',
      },
      {
        id: 'AUD-3',
        title: 'Se declara el rastro de auditoría',
        type: 'rule-terms',
        severity: 'warning',
        params: { terms: ['auditoría', 'registra', 'histórico', 'trazabilidad', 'comprobante'] },
        hint: 'Describe qué queda registrado, con qué datos y quién puede consultarlo.',
      },
      {
        id: 'AUD-4',
        title: 'La aprobación no está desactivada',
        type: 'approval-provider',
        severity: 'error',
        hint: 'Configura gates.approval en `file` o `github-label`: un proceso auditado exige firma nominal.',
      },
    ],
  },
  {
    id: 'accesibilidad',
    title: 'Accesibilidad (WCAG AA)',
    description: 'Controles para interfaces web y móviles.',
    source: 'builtin',
    checks: [
      {
        id: 'ACC-1',
        title: 'Los escenarios de interfaz cubren teclado, foco o contraste',
        type: 'spec-terms',
        severity: 'warning',
        appliesTo: { domains: ['frontend', 'mobile', 'fullstack'] },
        params: { terms: ['teclado', 'foco', 'contraste', 'lector de pantalla', 'aria', 'accesib'] },
        hint: 'Añade un escenario de uso con teclado, foco visible o contraste suficiente.',
      },
      {
        id: 'ACC-2',
        title: 'Hay un requisito no funcional medible (AA)',
        type: 'nfr-measurable',
        severity: 'warning',
        appliesTo: { domains: ['frontend', 'mobile', 'fullstack'] },
        hint: 'Incluye una regla con un valor medible (contraste 4.5:1, área táctil 44 px, etc.).',
      },
    ],
  },
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function changeTexts(change: Change): { spec: string; rules: string; scenarios: string } {
  const delta: Delta | undefined = change.delta
  const requirements = [...(delta?.added ?? []), ...(delta?.modified ?? [])]
  const spec = requirements.map((requirement) => `${requirement.title}\n${requirement.prose}`).join('\n')
  const rules = requirements.flatMap((requirement) => requirement.rules.map((rule) => rule.text)).join('\n')
  const scenarios = requirements
    .flatMap((requirement) => requirement.scenarios.flatMap((scenario) => [scenario.title, ...scenario.when, ...scenario.then]))
    .join('\n')
  return { spec, rules, scenarios }
}

function hasAnyTerm(text: string, terms: string[]): boolean {
  const haystack = normalize(text)
  return terms.some((term) => haystack.includes(normalize(term)))
}

export interface PackCheckResult {
  packId: string
  checkId: string
  title: string
  severity: Severity
  status: 'ok' | 'fail' | 'n/a'
  message?: string
  hint?: string
}

export interface PackEvaluation {
  pack: Pack
  status: 'ok' | 'fail' | 'n/a'
  results: PackCheckResult[]
  passed: number
  failed: number
}

function applies(check: PackCheck, change: Change): boolean {
  const appliesTo = check.appliesTo
  if (!appliesTo) return true
  const domain = change.meta?.domain ?? ''
  const lane = change.meta?.lane ?? 'standard'
  if (appliesTo.domains && appliesTo.domains.length > 0 && !appliesTo.domains.includes(domain)) return false
  if (appliesTo.lanes && appliesTo.lanes.length > 0 && !appliesTo.lanes.includes(lane)) return false
  return true
}

function evaluateCheck(check: PackCheck, change: Change, tasks: TasksFile | undefined, verify: VerifyFile | undefined, config: AtlasConfig): PackCheckResult {
  const base = { packId: '', checkId: check.id, title: check.title, severity: check.severity }
  if (!applies(check, change)) {
    return { ...base, status: 'n/a' }
  }
  const texts = changeTexts(change)

  switch (check.type) {
    case 'task-rollback': {
      const pending = tasks?.blocks.flatMap((block) => block.tasks) ?? []
      const tasksWithout = pending.filter((task) => !task.infra && (!task.rollback || task.rollback.trim() === ''))
      if (pending.length === 0) return { ...base, status: 'fail', message: 'El cambio no tiene tareas con las que verificar el control', ...(check.hint ? { hint: check.hint } : {}) }
      if (tasksWithout.length > 0) {
        return { ...base, status: 'fail', message: `${tasksWithout.length} tarea(s) sin Reversión: ${tasksWithout.map((task) => task.id).join(', ')}`, ...(check.hint ? { hint: check.hint } : {}) }
      }
      return { ...base, status: 'ok' }
    }
    case 'evidence-strong': {
      const evidence = verify?.evidence ?? []
      if (evidence.length === 0) return { ...base, status: 'fail', message: 'Todavía no hay evidencia registrada', ...(check.hint ? { hint: check.hint } : {}) }
      const manual = evidence.filter((entry) => entry.method === 'manual' || entry.method === 'semi')
      if (manual.length > 0) {
        return { ...base, status: 'fail', message: `${manual.length} evidencia(s) manual/semi: ${manual.map((entry) => entry.scenario).join(', ')}`, ...(check.hint ? { hint: check.hint } : {}) }
      }
      return { ...base, status: 'ok' }
    }
    case 'spec-terms': {
      const terms = check.params?.terms ?? []
      const ok = hasAnyTerm(`${texts.spec}\n${texts.scenarios}`, terms)
      return ok ? { ...base, status: 'ok' } : { ...base, status: 'fail', message: 'El cambio no menciona ninguno de los términos esperados', ...(check.hint ? { hint: check.hint } : {}) }
    }
    case 'rule-terms': {
      const terms = check.params?.terms ?? []
      const ok = hasAnyTerm(`${texts.rules}\n${texts.scenarios}`, terms)
      return ok ? { ...base, status: 'ok' } : { ...base, status: 'fail', message: 'Ninguna regla o escenario nombra el control esperado', ...(check.hint ? { hint: check.hint } : {}) }
    }
    case 'nfr-measurable': {
      const measurable = /(\d+(?:[.,]\d+)?)\s*(%|px|ms|s|seg|min|h|d|kb|mb|gb|:1|veces)/i.test(`${texts.rules}\n${texts.scenarios}`)
      return measurable ? { ...base, status: 'ok' } : { ...base, status: 'fail', message: 'No se encontró ningún valor medible en reglas o escenarios', ...(check.hint ? { hint: check.hint } : {}) }
    }
    case 'approval-provider': {
      return config.gates.approval !== 'none'
        ? { ...base, status: 'ok' }
        : { ...base, status: 'fail', message: 'El provider de aprobación está en "none"', ...(check.hint ? { hint: check.hint } : {}) }
    }
  }
}

export async function loadProjectPacks(sddDir: string): Promise<{ packs: Pack[]; diagnostics: Diagnostic[] }> {
  const dir = path.join(sddDir, 'packs')
  const diagnostics: Diagnostic[] = []
  const packs: Pack[] = []
  for (const entry of await listDir(dir)) {
    if (!/\.ya?ml$/i.test(entry)) continue
    const file = path.join(dir, entry)
    const raw = await readTextIfExists(file)
    if (raw === undefined) continue
    let data: unknown
    try {
      data = parseYaml(raw)
    } catch (err) {
      diagnostics.push(diag('PACK-000', 'error', `Pack inválido (${entry}): ${(err as Error).message}`, { path: file }))
      continue
    }
    const parsed = packSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        diagnostics.push(diag('PACK-000', 'error', `Pack ${entry} (${issue.path.join('.') || 'raíz'}): ${issue.message}`, { path: file }))
      }
      continue
    }
    const value = parsed.data
    packs.push({
      id: value.id,
      title: value.title,
      description: value.description,
      source: 'project',
      checks: value.checks.map((check) => {
        const built: PackCheck = { id: check.id, title: check.title, type: check.type, severity: check.severity }
        if (check.applies_to) {
          const appliesTo: PackCheck['appliesTo'] = {}
          if (check.applies_to.domains) appliesTo.domains = check.applies_to.domains
          if (check.applies_to.lanes) appliesTo.lanes = check.applies_to.lanes
          built.appliesTo = appliesTo
        }
        if (check.params) built.params = check.params
        if (check.hint !== undefined) built.hint = check.hint
        return built
      }),
    })
  }
  return { packs, diagnostics }
}

export async function resolvePacks(sddDir: string, config: AtlasConfig): Promise<{ packs: Pack[]; diagnostics: Diagnostic[] }> {
  const { packs: projectPacks, diagnostics } = await loadProjectPacks(sddDir)
  const byId = new Map<string, Pack>()
  for (const pack of BUILTIN_PACKS) byId.set(pack.id, pack)
  for (const pack of projectPacks) byId.set(pack.id, pack)
  const active = config.packs.map((id) => byId.get(id)).filter((pack): pack is Pack => pack !== undefined)
  for (const id of config.packs) {
    if (!byId.has(id)) {
      diagnostics.push(diag('PACK-001', 'warning', `El pack "${id}" no existe (ni integrado ni en .sdd/packs/)`, { suggestion: 'Ejecuta `satlas packs` para ver los disponibles' }))
    }
  }
  return { packs: active, diagnostics }
}

export function evaluatePacks(packs: Pack[], change: Change, config: AtlasConfig): PackEvaluation[] {
  return packs.map((pack) => {
    const results = pack.checks.map((check) => {
      const result = evaluateCheck(check, change, change.tasks, change.verify ?? change.fix, config)
      return { ...result, packId: pack.id }
    })
    const failed = results.filter((result) => result.status === 'fail').length
    const passed = results.filter((result) => result.status === 'ok').length
    const evaluated = results.filter((result) => result.status !== 'n/a').length
    return {
      pack,
      status: evaluated === 0 ? 'n/a' : failed > 0 ? 'fail' : 'ok',
      results,
      passed,
      failed,
    }
  })
}

export function packFindings(evaluations: PackEvaluation[], change: Change): Diagnostic[] {
  const findings: Diagnostic[] = []
  for (const evaluation of evaluations) {
    for (const result of evaluation.results) {
      if (result.status !== 'fail') continue
      findings.push(
        diag(`PACK-${evaluation.pack.id.toUpperCase()}-${result.checkId}`, result.severity, `[${evaluation.pack.title}] ${result.title}${result.message ? `: ${result.message}` : ''}`, {
          ...(result.hint ? { suggestion: result.hint } : {}),
        }),
      )
    }
  }
  void change
  return findings
}
