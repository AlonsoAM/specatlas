import { stringify as stringifyYaml } from 'yaml'
import type { ChangeMeta, Language, Lane } from './model.js'

export interface TemplateSet {
  constitution: string
  glossary: string
  proposal: string
  specDelta: (vars: { title: string; domainUpper: string; domain: string }) => string
  plan: string
  tasks: string
  verify: string
  fix: string
}

const ES: TemplateSet = {
  constitution: `# Constitución del proyecto

> Reglas inmutables. Todo cambio las hereda. Jerarquía: constitución > spec aprobada > plan > tareas > código.

## Artículo 1 — Verdad y evidencia
Ninguna afirmación de "terminado" se acepta sin evidencia registrada en verify.md.

## Artículo 2 — Seguridad
No se versionan secretos. No se ejecutan comandos destructivos sin rollback documentado.

## Artículo 3 — Especificación de negocio
Las specs se escriben en lenguaje de negocio, sin tecnología. El plan técnico es otro artefacto.

## Artículo 4 — Trazabilidad
Todo requisito tiene escenarios; todo escenario tiene tarea y evidencia. Los ids REQ-* son inmutables.

## Artículo 5 — Cambios de alcance
Lo aprobado no se edita en silencio: se firma una revisión (satlas amend, disponible en F2).

## Artículo 6 — Revisión humana
Aprobar, revisar y archivar son actos humanos registrados con nombre y fecha.

<!-- Añade aquí los artículos propios de tu proyecto. Amplía sin miedo: esta plantilla es tuya. -->
`,
  glossary: `# Glosario de negocio

> Términos con el significado que les da el negocio. La spec usa estos términos, no sinónimos técnicos.

| Término | Definición | Sinónimos aceptados |
|---|---|---|
| Cliente | Persona u organización que contrata el servicio | Usuario |
| Solicitud | Pedido formal de un cliente que inicia un proceso | Ticket |
`,
  proposal: `# Propuesta — {{TITLE}}

## Por qué
(problema u oportunidad, en lenguaje de negocio)

## Qué cambia
(alcance funcional de la propuesta)

## Fuera de alcance
(lo que explícitamente no se hará)

## Cómo se mide el éxito
(indicadores observables)
`,
  specDelta: ({ title, domainUpper, domain }) => `# Delta — ${title}

## Requisitos agregados

### Requisito: REQ-${domainUpper}-001 — ${title}
Describe la necesidad de negocio y el comportamiento esperado (sin tecnología).

- Regla BR-${domainUpper}-001: (regla de negocio verificable)

#### Escenario: REQ-${domainUpper}-001-S1 — Caso principal
- **CUANDO** (situación o acción del actor)
- **ENTONCES** (resultado observable y medible)

#### Escenario: REQ-${domainUpper}-001-S2 — Error o caso límite
- **CUANDO** (situación inválida)
- **ENTONCES** (respuesta del sistema)

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: ${domain} -->
`,
  plan: `# Plan — {{TITLE}}

## 1. Contexto AS-IS
(existe / no existe / blast radius; anclas al código real)

## 2. Enfoque técnico
(decisiones y alternativas descartadas con su porqué)

## 3. Diagramas
Incluye los diagramas mermaid que el cambio necesita:

| Tipo | Cuándo |
|---|---|
| erDiagram | si toca modelo de datos o BD |
| sequenceDiagram | integraciones, APIs, jobs, eventos |
| flowchart | reglas de negocio, procesos, validaciones |
| stateDiagram-v2 | máquinas de estado |
| classDiagram | dominio o lógica no trivial |
| C4Context / flowchart de capas | arquitectura o módulos nuevos |

\`\`\`mermaid
flowchart LR
  A[Entrada] --> B[Proceso] --> C[Resultado]
\`\`\`

## 4. Diseño por capa / módulos

## 5. Matriz de trazabilidad (REQ → tareas)
| Requisito | Escenario | Tareas |
|---|---|---|

## 6. Matriz de paridad AS-IS → TO-BE (solo refactors sustitutivos)
| Elemento | Conservar | Descartar (motivo) | Nuevo |
|---|---|---|---|

## 7. Tareas
Ver tasks.md.

## 8. Riesgos y mitigaciones

## 9. Rollback

## 10. Dependencias y supuestos
`,
  tasks: `# Tareas — {{TITLE}}

## Bloque 1 — Preparación

<!-- Cada tarea es atómica y usa el separador · :
- [ ] T1.1 Descripción · Archivos: ruta/al/archivo · Cubre: REQ-DOMINIO-001-S1 · Rollback: cómo revertir
- [ ] T1.2 Otra tarea · Archivos: ruta/otra · Depende de: T1.1
Para trabajo de infraestructura sin requisito: · Infra
-->
`,
  verify: `# Verificación — {{TITLE}}

> Una entrada por escenario con evidencia real (comando y resultado). Ejemplo:

<!--
### REQ-DOMINIO-001-S1 — Caso principal
\`\`\`evidence
method: executable
command: npm test -- modulo
result: pass
output_hash: sha256:…
date: 2026-01-01T00:00:00Z
by: tu-nombre
notes: 12/12 casos
\`\`\`
-->
`,
  fix: `# Fix — {{TITLE}}

## Síntoma
(qué se observa, dónde y desde cuándo)

## Causa raíz
(por qué ocurre, con evidencia del código real)

## Cambio
(qué se toca y por qué es el mínimo cambio correcto)

## Rollback
(cómo revertir)

## Evidencia

<!-- Registra la evidencia real con:
satlas verify <slug> --file fix --scenario REQ-DOMINIO-001-S1 --command "<comando>" --by "<nombre>"
o, si es manual:
satlas verify <slug> --file fix --scenario REQ-DOMINIO-001-S1 --method manual --result pass --by "<nombre>" --notes "<cómo se comprobó>"
-->
`,
}

const EN: TemplateSet = {
  constitution: `# Project constitution

> Immutable rules. Every change inherits them. Hierarchy: constitution > approved spec > plan > tasks > code.

## Article 1 — Truth and evidence
No "done" claim is accepted without evidence recorded in verify.md.

## Article 2 — Security
No secrets in the repo. No destructive command without a documented rollback.

## Article 3 — Business specification
Specs are written in business language, without technology. The technical plan is a separate artifact.

## Article 4 — Traceability
Every requirement has scenarios; every scenario has a task and evidence. REQ-* ids are immutable.

## Article 5 — Scope changes
Approved work is never edited silently: a signed revision is required.

## Article 6 — Human review
Approving, reviewing and archiving are human acts recorded with name and date.
`,
  glossary: `# Business glossary

> Terms as the business means them. Specs use these terms, not technical synonyms.

| Term | Definition | Accepted synonyms |
|---|---|---|
| Customer | Person or organization that contracts the service | User |
`,
  proposal: `# Proposal — {{TITLE}}

## Why
(problem or opportunity in business language)

## What changes
(functional scope)

## Out of scope

## How success is measured
`,
  specDelta: ({ title, domainUpper, domain }) => `# Delta — ${title}

## ADDED Requirements

### Requirement: REQ-${domainUpper}-001 — ${title}
Describe the business need and expected behaviour (no technology).

- Rule BR-${domainUpper}-001: (verifiable business rule)

#### Scenario: REQ-${domainUpper}-001-S1 — Main case
- **WHEN** (situation or actor action)
- **THEN** (observable, measurable result)

#### Scenario: REQ-${domainUpper}-001-S2 — Error or edge case
- **WHEN** (invalid situation)
- **THEN** (system response)

## MODIFIED Requirements

## REMOVED Requirements

## RENAMED Requirements

<!-- change domain: ${domain} -->
`,
  plan: `# Plan — {{TITLE}}

## 1. AS-IS context
## 2. Technical approach
## 3. Diagrams
\`\`\`mermaid
flowchart LR
  A[Input] --> B[Process] --> C[Outcome]
\`\`\`
## 4. Layer / module design
## 5. Traceability matrix (REQ → tasks)
## 6. AS-IS → TO-BE parity matrix (replacing refactors only)
## 7. Tasks
See tasks.md.
## 8. Risks and mitigations
## 9. Rollback
## 10. Dependencies and assumptions
`,
  tasks: `# Tasks — {{TITLE}}

## Block 1 — Preparation

<!--
- [ ] T1.1 Description · Files: path/to/file · Covers: REQ-DOMAIN-001-S1 · Rollback: how to revert
-->
`,
  verify: `# Verification — {{TITLE}}

<!--
### REQ-DOMAIN-001-S1 — Main case
\`\`\`evidence
method: executable
command: npm test -- module
result: pass
output_hash: sha256:…
date: 2026-01-01T00:00:00Z
by: your-name
\`\`\`
-->
`,
  fix: `# Fix — {{TITLE}}

## Symptom
## Root cause
## Change
## Rollback
## Evidence

<!-- Register real evidence with:
satlas verify <slug> --file fix --scenario REQ-DOMAIN-001-S1 --command "<command>" --by "<name>"
-->
`,
}

export function templatesFor(language: Language): TemplateSet {
  return language === 'en' ? EN : ES
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
}

export function changeMetaYaml(meta: ChangeMeta): string {
  const doc: Record<string, unknown> = {
    schema_version: meta.schemaVersion,
    slug: meta.slug,
    lane: meta.lane,
  }
  if (meta.title) doc['title'] = meta.title
  if (meta.domain) doc['domain'] = meta.domain
  if (meta.risk) doc['risk'] = meta.risk
  if (meta.created) doc['created'] = meta.created
  if (meta.owner) doc['owner'] = meta.owner
  if (meta.mockups) doc['mockups'] = meta.mockups
  return `# Estado del cambio. La fase se DERIVA de los artefactos; aquí solo hechos.\n` + stringifyYaml(doc, { lineWidth: 120 })
}

export function indexMarkdown(input: { projectName: string; language: Language; specs: Array<{ domain: string; requirements: number }>; changes: Array<{ slug: string; lane: Lane }>; archived: number }): string {
  const es = input.language !== 'en'
  const lines: string[] = []
  lines.push(`# Índice — ${input.projectName}`)
  lines.push('')
  lines.push(es ? `> Generado por SpecAtlas. No editar a mano: \`satlas doctor\` lo regenera.` : `> Generated by SpecAtlas. Do not edit by hand: \`satlas doctor\` regenerates it.`)
  lines.push('')
  lines.push(es ? '## Specs vivas' : '## Living specs')
  lines.push('')
  if (input.specs.length === 0) lines.push(es ? '_Sin specs todavía._' : '_No specs yet._')
  for (const spec of input.specs) lines.push(`- \`${spec.domain}\` — ${spec.requirements} ${es ? 'requisitos' : 'requirements'}`)
  lines.push('')
  lines.push(es ? '## Cambios activos' : '## Active changes')
  lines.push('')
  if (input.changes.length === 0) lines.push(es ? '_Sin cambios activos._' : '_No active changes._')
  for (const change of input.changes) lines.push(`- \`${change.slug}\` — ${change.lane}`)
  lines.push('')
  lines.push(es ? `## Archivados\n\n${input.archived} cambio(s) en \`changes/archive/\`.` : `## Archived\n\n${input.archived} change(s) in \`changes/archive/\`.`)
  lines.push('')
  return lines.join('\n')
}
