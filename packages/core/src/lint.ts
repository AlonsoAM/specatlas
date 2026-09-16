import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import type { Delta, Requirement, SpecFile, TasksFile, VerifyFile } from './model.js'

const VAGUE_ES = ['rápido', 'rápida', 'rápidos', 'rápidas', 'fácil', 'fáciles', 'varios', 'varias', 'óptimo', 'óptima', 'robusto', 'robusta', 'adecuado', 'adecuada', 'eficiente', 'amigable', 'moderno', 'moderna', 'mejor', 'mejores', 'simple', 'sencillo', 'intuitivo', 'intuitiva', 'apropiado', 'apropiada', 'suficiente', 'razonable']
const VAGUE_EN = ['fast', 'quick', 'easy', 'several', 'optimal', 'robust', 'adequate', 'efficient', 'friendly', 'modern', 'better', 'best', 'simple', 'intuitive', 'appropriate', 'sufficient', 'reasonable', 'nice', 'clean']

const TECH_ES = ['api', 'endpoint', 'tabla', 'base de datos', 'sql', 'json', 'xml', 'frontend', 'backend', 'react', 'vue', 'angular', 'node', 'npm', 'docker', 'kubernetes', 'servidor', 'columna', 'query', 'script', 'framework', 'librería', 'microservicio', 'cache', 'caché', 'deploy', 'despliegue', 'commit', 'merge', 'rama', 'branch', 'endpoint', 'crud', 'rest', 'http', 'sdk', 'webhook', 'orm', 'job', 'cron', 'websocket', 'graphql', 'api rest', 'tablas', 'índice', 'primary key', 'foreign key']
const TECH_EN = ['database', 'repository', 'table', 'column', 'server', 'deploy', 'deployment', 'branch', 'merge', 'commit', 'cache', 'queue', 'endpoint', 'microservice', 'framework', 'library', 'package', 'schema', 'migration']

export interface LintOptions {
  language?: 'es' | 'en'
  businessOnly?: boolean
}

function wordBoundary(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu')
  return re.test(text)
}

function lintText(text: string, code: string, terms: readonly string[], label: string, path: string, line: number): Diagnostic[] {
  const out: Diagnostic[] = []
  const lower = text.toLowerCase()
  for (const term of terms) {
    if (wordBoundary(lower, term)) {
      out.push(
        diag(code, 'error', `${label}: "${term}"`, {
          path,
          line,
          suggestion: 'La especificación es funcional y de negocio: describe comportamiento, no tecnología ni adjetivos vagos',
        }),
      )
    }
  }
  return out
}

export function lintRequirement(req: Requirement, path: string, opts: LintOptions = {}): Diagnostic[] {
  const out: Diagnostic[] = []
  const vague = opts.language === 'en' ? VAGUE_EN : VAGUE_ES
  const tech = opts.language === 'en' ? TECH_EN : TECH_ES
  const parts: Array<{ text: string; line: number }> = [
    { text: req.title, line: req.line },
    { text: req.prose, line: req.line },
    ...req.rules.map((r) => ({ text: r.text, line: r.line })),
    ...req.scenarios.flatMap((s) => [...s.when.map((w) => ({ text: w, line: s.line })), ...s.then.map((t) => ({ text: t, line: s.line }))]),
  ]
  for (const part of parts) {
    out.push(...lintText(part.text, 'LINT-BIZ-002', vague, 'Palabra vaga en la especificación', path, part.line))
    if (opts.businessOnly !== false) {
      out.push(...lintText(part.text, 'LINT-BIZ-001', tech, 'Jerga técnica en la especificación de negocio', path, part.line))
    }
  }
  if (req.scenarios.length === 0) {
    out.push(diag('TRACE-001', 'error', `El requisito ${req.id} no tiene ningún escenario`, { path, line: req.line, suggestion: 'Añade al menos un escenario CUANDO/ENTONCES' }))
  }
  return out
}

export function lintDelta(delta: Delta, livingRequirements: Map<string, Requirement>, path: string, opts: LintOptions = {}): Diagnostic[] {
  const out: Diagnostic[] = [...delta.diagnostics]
  for (const req of [...delta.added, ...delta.modified]) {
    out.push(...lintRequirement(req, path, opts))
  }
  for (const req of delta.modified) {
    const living = livingRequirements.get(req.id)
    if (!living) {
      out.push(diag('TRACE-007', 'error', `MODIFIED ${req.id} no existe en la spec viva; usa ADDED`, { path, line: req.line }))
      continue
    }
    for (const existing of living.scenarios) {
      if (!req.scenarios.some((s) => s.id === existing.id)) {
        out.push(
          diag('TRACE-007', 'error', `MODIFIED ${req.id} pierde el escenario ${existing.id}: copia el bloque completo`, {
            path,
            line: req.line,
            suggestion: 'Copia el bloque completo de la spec viva y edítalo; para quitarlo, decláralo en REMOVED',
          }),
        )
      }
    }
  }
  for (const req of delta.removed) {
    const living = livingRequirements.get(req.id)
    if (!living) {
      out.push(diag('TRACE-007', 'error', `REMOVED ${req.id} no existe en la spec viva`, { path, line: req.line }))
    }
  }
  for (const rename of delta.renamed) {
    if (rename.from.id !== rename.to.id) {
      out.push(diag('LINT-DLT-003', 'error', `RENAMED cambia el id (${rename.from.id} → ${rename.to.id}); los ids son inmutables`, { path, line: rename.line }))
    }
    if (!livingRequirements.has(rename.from.id)) {
      out.push(diag('TRACE-007', 'error', `RENAMED ${rename.from.id} no existe en la spec viva`, { path, line: rename.line }))
    }
  }
  return out
}

export function lintTasks(_tasks: TasksFile): Diagnostic[] {
  return []
}

export function lintVerify(_verify: VerifyFile): Diagnostic[] {
  return []
}

const MERMAID_KEYWORDS = [
  'flowchart',
  'graph',
  'sequenceDiagram',
  'stateDiagram-v2',
  'stateDiagram',
  'classDiagram',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'mindmap',
  'timeline',
  'quadrantChart',
  'xychart-beta',
  'block-beta',
  'architecture-beta',
]

const MERMAID_BLOCKS = /^\s*(alt|loop|opt|par|rect|critical|break|subgraph)\b/

export function lintPlan(planText: string, path: string): Diagnostic[] {
  const out: Diagnostic[] = []
  const blocks = [...planText.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)]
  for (const [index, block] of blocks.entries()) {
    const code = (block[1] ?? '').replace(/\r\n?/g, '\n')
    const lines = code.split('\n')
    const first = (lines.find((line) => line.trim().length > 0) ?? '').trim()
    if (!MERMAID_KEYWORDS.some((keyword) => first.startsWith(keyword))) {
      out.push(
        diag('LINT-PLN-002', 'error', `Diagrama mermaid ${index + 1}: la primera línea debe declarar el tipo (${MERMAID_KEYWORDS.slice(0, 5).join(', ')}…) y empieza por "${first.slice(0, 30)}"`, {
          path,
          suggestion: 'Corrige el tipo del diagrama o elimina el bloque',
        }),
      )
      continue
    }

    let open = 0
    for (const line of lines) {
      if (MERMAID_BLOCKS.test(line)) open += 1
      else if (/^\s*end\b/.test(line)) open -= 1
    }
    if (open !== 0) {
      out.push(
        diag('LINT-PLN-002', 'error', `Diagrama mermaid ${index + 1}: faltan ${Math.abs(open)} \`end\` (bloques alt/loop/subgraph sin cerrar)`, {
          path,
          suggestion: 'Cierra cada bloque alt/loop/opt/par/rect/subgraph con `end`',
        }),
      )
    }

    if (first.startsWith('sequenceDiagram')) {
      for (const line of lines) {
        if (!/^\s*[^\s:]+-{1,2}>{1,2}[^\s:]*\s*:\s*/.test(line)) continue
        const message = line.slice(line.indexOf(':') + 1)
        if (message.includes(';')) {
          out.push(
            diag('LINT-PLN-003', 'error', `Diagrama mermaid ${index + 1}: el mensaje "${message.trim().slice(0, 40)}…" usa \`;\` y mermaid lo interpreta como fin de sentencia`, {
              path,
              suggestion: 'Sustituye `;` por `·` o `,` en los mensajes de sequenceDiagram',
            }),
          )
        }
      }
    }
  }
  return out
}

export function lintSpec(spec: SpecFile, opts: LintOptions = {}): Diagnostic[] {
  const out: Diagnostic[] = [...spec.diagnostics]
  for (const req of spec.requirements) {
    for (const d of lintRequirement(req, spec.path, opts)) {
      if (d.code === 'TRACE-001') continue
      out.push(d)
    }
  }
  return out
}
