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
  review: string
  docTecnica: string
  docManual: string
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

<!-- Opcional: declara los requisitos que este fix afecta (aparecen en su trazabilidad).
Cubre: REQ-DOMINIO-001
-->

<!-- Registra la evidencia real con:
satlas verify <slug> --file fix --scenario REQ-DOMINIO-001-S1 --command "<comando>" --by "<nombre>"
o, si es manual:
satlas verify <slug> --file fix --scenario REQ-DOMINIO-001-S1 --method manual --result pass --by "<nombre>" --notes "<cómo se comprobó>"
-->
`,
  review: `# Revisión — {{TITLE}}

> La escribe quien revisa (agente o persona) antes del PR. El gate lee el veredicto
> y los hallazgos bloqueantes sin resolver.

## Veredicto

- resultado: pending
- por: (nombre de quien revisa)
- fecha: (AAAA-MM-DD)

## Alcance

(qué se revisó: archivos, tareas o requisitos)

## Hallazgos

<!-- Un hallazgo por línea. La severidad entre paréntesis: (bloqueante) | (menor) | (sugerencia).
Marca \`- [x]\` cuando quede resuelto. Sólo los bloqueantes sin resolver detienen el cambio. -->

- [ ] (bloqueante) (qué está mal y por qué importa) · Archivo: ruta/archivo.ext:12

## Qué quedó bien

(lo que se comprobó y está correcto)
`,
  docTecnica: `# Documentación técnica — {{TITLE}}

> **Cambio**: \`{{SLUG}}\` · **Dominio**: {{DOMAIN}} · **Carril**: {{LANE}} · **Tareas**: {{TASKS}} · **Actualizado**: {{DATE}}

## 1. Resumen del cambio

{{SUMMARY}}

## 2. Qué es y por qué

{{WHY}}

## 3. Qué cambia, en lenguaje de negocio

{{REQ_BUSINESS}}

## 4. Cómo estaba antes (AS-IS)

{{PLAN_CONTEXT}}

## 5. Enfoque técnico y decisiones

{{PLAN_APPROACH}}

## 6. Diagramas

{{PLAN_DIAGRAMS}}

## 7. Diseño por capas y componentes

{{PLAN_DESIGN}}

## 8. Mapa de archivos

Cada archivo, la tarea que lo tocó y el requisito al que responde.

{{FILES_TABLE}}

## 9. Trazabilidad requisito → escenario → tarea → evidencia

{{TRACE_SUMMARY}}

{{TRACE_TABLE}}

## 10. Pruebas y evidencia

{{EVIDENCE_SUMMARY}}

{{EVIDENCE_TABLE}}

### 10.1 Cómo se reproduce la evidencia

{{COMMANDS}}

## 11. Riesgos y mitigaciones

{{PLAN_RISKS}}

## 12. Cómo se revierte

{{PLAN_ROLLBACK}}

## 13. Pendientes y deuda conocida

{{PENDING}}
`,
  docManual: `# Manual de usuario — {{TITLE}}

> **Cambio**: \`{{SLUG}}\` · **Dominio**: {{DOMAIN}} · **Actualizado**: {{DATE}}
>
> Este manual explica cómo se usa lo que el cambio entrega: qué verás, qué puedes hacer y qué ocurre en cada caso.

## 1. Qué es y qué resuelve

{{MANUAL_WHAT}}

### Por qué se hizo

{{WHY}}

## 2. Antes de empezar

{{MANUAL_BEFORE}}

## 3. Primeros pasos

Recorrido corto, en orden, para ver la funcionalidad completa por primera vez.

{{WALKTHROUGH}}

## 4. Las pantallas, una por una

{{SCREENS}}

## 5. Cómo se usa, tarea por tarea

{{TASK_STEPS}}

## 6. Qué ves cuando todavía no hay nada

{{UI_STATES}}

## 7. Problemas frecuentes y qué hacer

{{TROUBLESHOOT}}

## 8. Reglas que conviene conocer

{{RULES}}

## 9. Glosario

{{MANUAL_GLOSSARY}}

## 10. Cómo se comprobó

{{MANUAL_VERIFIED}}
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

<!-- Optional: declare the requirements this fix affects (they show up in its traceability).
Cubre: REQ-DOMAIN-001
-->

<!-- Register real evidence with:
satlas verify <slug> --file fix --scenario REQ-DOMAIN-001-S1 --command "<command>" --by "<name>"
-->
`,
  review: `# Review — {{TITLE}}

## Verdict

- verdict: pending
- by: (reviewer)
- date: (YYYY-MM-DD)

## Scope

## Findings

<!-- One finding per line. Severity in parentheses: (blocking) | (minor) | (nit).
Tick \`- [x]\` once resolved. Only unresolved blocking findings stop the change. -->

- [ ] (blocking) (what is wrong and why it matters) · File: path/file.ext:12

## What looks good
`,
  docTecnica: `# Technical documentation — {{TITLE}}

> **Change**: \`{{SLUG}}\` · **Domain**: {{DOMAIN}} · **Lane**: {{LANE}} · **Tasks**: {{TASKS}} · **Updated**: {{DATE}}

## 1. Change summary

{{SUMMARY}}

## 2. What it is and why

{{WHY}}

## 3. What changes, in business language

{{REQ_BUSINESS}}

## 4. How it was before (AS-IS)

{{PLAN_CONTEXT}}

## 5. Technical approach and decisions

{{PLAN_APPROACH}}

## 6. Diagrams

{{PLAN_DIAGRAMS}}

## 7. Layers and components

{{PLAN_DESIGN}}

## 8. File map

Every file, the task that touched it and the requirement it answers.

{{FILES_TABLE}}

## 9. Traceability requirement → scenario → task → evidence

{{TRACE_SUMMARY}}

{{TRACE_TABLE}}

## 10. Tests and evidence

{{EVIDENCE_SUMMARY}}

{{EVIDENCE_TABLE}}

### 10.1 How to reproduce the evidence

{{COMMANDS}}

## 11. Risks and mitigations

{{PLAN_RISKS}}

## 12. How to roll it back

{{PLAN_ROLLBACK}}

## 13. Pending work and known debt

{{PENDING}}
`,
  docManual: `# User manual — {{TITLE}}

> **Change**: \`{{SLUG}}\` · **Domain**: {{DOMAIN}} · **Updated**: {{DATE}}
>
> This manual explains how to use what the change delivers: what you see, what you can do and what happens in each case.

## 1. What it is and what it solves

{{MANUAL_WHAT}}

### Why it was done

{{WHY}}

## 2. Before you start

{{MANUAL_BEFORE}}

## 3. First steps

A short, ordered walkthrough to see the whole feature for the first time.

{{WALKTHROUGH}}

## 4. The screens, one by one

{{SCREENS}}

## 5. How to use it, task by task

{{TASK_STEPS}}

## 6. What you see when there is nothing yet

{{UI_STATES}}

## 7. Common problems and what to do

{{TROUBLESHOOT}}

## 8. Rules worth knowing

{{RULES}}

## 9. Glossary

{{MANUAL_GLOSSARY}}

## 10. How it was verified

{{MANUAL_VERIFIED}}
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

export function indexMarkdown(input: {
  projectName: string
  language: Language
  specs: Array<{ domain: string; requirements: number }>
  changes: Array<{ slug: string; lane: Lane }>
  fixes?: Array<{ slug: string; date: string; result: string; domain?: string }>
  archived: number
}): string {
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
  lines.push(es ? '## Fixes vivos' : '## Living fixes')
  lines.push('')
  const fixes = input.fixes ?? []
  if (fixes.length === 0) lines.push(es ? '_Sin fixes archivados todavía._' : '_No archived fixes yet._')
  for (const fix of fixes) {
    const parts = [fix.date, fix.domain ? `\`${fix.domain}\`` : '', `\`${fix.slug}\``, fix.result].filter((part) => part !== '')
    lines.push(`- ${parts.join(' · ')}`)
  }
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
