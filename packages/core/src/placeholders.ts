import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import type { Delta, Requirement } from './model.js'

// Prosa exacta que escriben las plantillas de `satlas new` (es/en).
const TEMPLATE_PROSE = new Set([
  'describe la necesidad de negocio y el comportamiento esperado (sin tecnología).',
  'describe the business need and expected behaviour (no technology).',
])

/**
 * Un texto es de plantilla cuando está vacío, cuando es la prosa que escribe
 * `satlas new`, o cuando todo su contenido va entre paréntesis — el formato con
 * el que la plantilla marca los huecos: "(regla de negocio verificable)".
 */
export function isPlaceholderText(text: string): boolean {
  const clean = text
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length === 0) return true
  if (/^\(.+\)$/.test(clean)) return true
  return TEMPLATE_PROSE.has(clean.toLowerCase())
}

export interface PlaceholderHit {
  field: 'prose' | 'rule' | 'when' | 'then'
  scenario?: string
  text: string
  line: number
}

export function requirementPlaceholders(req: Requirement): PlaceholderHit[] {
  const hits: PlaceholderHit[] = []
  if (isPlaceholderText(req.prose)) hits.push({ field: 'prose', text: req.prose, line: req.line })
  for (const rule of req.rules) {
    if (isPlaceholderText(rule.text)) hits.push({ field: 'rule', text: rule.text, line: rule.line })
  }
  for (const scenario of req.scenarios) {
    for (const when of scenario.when) {
      if (isPlaceholderText(when)) hits.push({ field: 'when', scenario: scenario.id, text: when, line: scenario.line })
    }
    for (const then of scenario.then) {
      if (isPlaceholderText(then)) hits.push({ field: 'then', scenario: scenario.id, text: then, line: scenario.line })
    }
  }
  return hits
}

const FIELD_LABEL: Record<PlaceholderHit['field'], string> = {
  prose: 'la descripción',
  rule: 'una regla de negocio',
  when: 'un CUANDO',
  then: 'un ENTONCES',
}

export function lintPlaceholders(req: Requirement, path: string): Diagnostic[] {
  const hits = requirementPlaceholders(req)
  if (hits.length === 0) return []
  // Un requisito entero sin escribir es un solo problema, no seis: se reporta una vez.
  if (isSkeletonRequirement(req)) {
    return [
      diag('LINT-BIZ-003', 'error', `El requisito ${req.id} sigue siendo la plantilla de \`satlas new\`: no especifica nada todavía`, {
        path,
        line: req.line,
        suggestion: 'Escribe la necesidad de negocio, sus reglas y el CUANDO/ENTONCES de cada escenario',
      }),
    ]
  }
  return hits.map((hit) => {
    const where = hit.scenario ? `${hit.scenario}` : req.id
    return diag('LINT-BIZ-003', 'error', `Texto de plantilla sin completar en ${where}: ${FIELD_LABEL[hit.field]} sigue siendo el hueco de \`satlas new\``, {
      path,
      line: hit.line,
      suggestion: 'Escribe el comportamiento real de negocio en lugar del texto entre paréntesis de la plantilla',
    })
  })
}

/** Un requisito está sin escribir cuando toda su prosa, sus reglas y sus escenarios son plantilla. */
export function isSkeletonRequirement(req: Requirement): boolean {
  if (!isPlaceholderText(req.prose)) return false
  if (req.rules.some((rule) => !isPlaceholderText(rule.text))) return false
  for (const scenario of req.scenarios) {
    if (scenario.when.some((w) => !isPlaceholderText(w))) return false
    if (scenario.then.some((t) => !isPlaceholderText(t))) return false
  }
  return true
}

/**
 * El delta sigue siendo el esqueleto que escribió `satlas new`: no declara nada
 * todavía, o todo lo que declara es texto de plantilla. La fase que toca es
 * especificar, no aprobar.
 */
export function isSkeletonDelta(delta: Delta): boolean {
  if (delta.removed.length > 0 || delta.renamed.length > 0) return false
  const requirements = [...delta.added, ...delta.modified]
  if (requirements.length === 0) return true
  return requirements.every((req) => isSkeletonRequirement(req))
}
