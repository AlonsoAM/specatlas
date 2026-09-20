# SpecAtlas — Arquitectura técnica

> Documento de arquitectura · Septiembre 2026
> Complementa `PROPUESTA.md`. Define componentes, contratos, gramáticas, algoritmos y plan técnico F0-F3.

---

## 0. Índice de decisiones (ADR resumidas)

| ADR | Decisión | Motivo |
|---|---|---|
| ADR-001 | **El kernel no sabe de IA.** La IA solo produce contenido; todo lo verificable es código determinista | Lección central de AmigoXCD: los prompts no son un mecanismo de enforcement |
| ADR-002 | **Estado del cambio en `meta.yaml`** (un archivo por change); documentos markdown sin frontmatter pesado. El estado de fase se **deriva**, no se guarda | Elimina la clase de bugs "frontmatter vs cuerpo" que el doctor de AmigoXCD detecta continuamente |
| ADR-003 | **Sintaxis estable, contenido en español por defecto.** El parser acepta encabezados/claves en español e inglés; el writer emite en el idioma configurado (`language`, default `es`) | Parsers robustos sin duplicar gramáticas y documentos en el idioma de trabajo |
| ADR-004 | **IDs inmutables**: `REQ-<DOM>-<NNN>` y `REQ-<DOM>-<NNN>-S<N>`. Nunca se renumeran; lo eliminado queda en histórico | La trazabilidad solo vale si los IDs nunca cambian |
| ADR-005 | **Delta semántico con fold determinista**; `MODIFIED` exige el bloque completo (validado) | Evita la pérdida silenciosa de detalle al archivar (caso real de OpenSpec) |
| ADR-006 | **La evidencia es datos**, no prosa: bloques YAML parseables en `verify.md` | Permite gates por escenario y CI sin interpretar lenguaje natural |
| ADR-007 | **TypeScript sobre Node ≥ 20**; kernel publicado (`@specatlas/core`) y compartido por CLI, LSP y extensión; CLI con cero dependencias de runtime | Un solo lugar para la lógica; UI delgada y testeable |
| ADR-008 | **Prompts compilados** desde una fuente única a cada agente, con golden tests | Los formatos de los agentes cambian; la compilación lo detecta en CI |
| ADR-009 | **Aprobación provider-pluggable**; default archivo firmado con hash canónico; overrides auditados | Sin dependencia de ClickUp/Jira; auditabilidad local |
| ADR-010 | **Sin red por defecto.** MCP y extensiones son locales; nada de telemetría | Seguridad y confianza para adopción empresarial |
| ADR-011 | **Esquemas versionados con migraciones reversibles**; dry-run por defecto | Los repos no se rompen al actualizar |
| ADR-012 | **pnpm workspaces + `vitest`** en el monorepo; build con `tsup` | Un solo runner para kernel, CLI, LSP y extensión (`@vscode/test-electron` integra con vitest) |

---

## 1. Identidad y paquetes

| Elemento | Valor |
|---|---|
| Nombre | **SpecAtlas** |
| Paquete CLI (npm) | `specatlas` (bins publicados: `specatlas` + alias corto `satlas`, ambos propios y libres) |
| Paquete kernel | `@specatlas/core` |
| Paquete de render | `@specatlas/render` (markdown → HTML estilizado: código resaltado, tablas, callouts y mermaid) |
| Paquete LSP | `@specatlas/lsp` (bin `specatlas-lsp`) |
| Extensión VS Code | `specatlas-vscode` (Marketplace + Open VSX) |
| Perfiles de la comunidad | repo `specatlas-profiles` |
| Licencia | MIT |
| Idioma por defecto | **`es`** (español). Configurable a `en`; todo artefacto generado (spec, plan, tasks, delta, verify, review, docs, mockups, presentación) se escribe en ese idioma |
| Espacio de comandos de agente | `/satlas.*` (specify, clarify, plan, tasks, analyze, build, verify, review, docs, archive, next, fix) — misma forma corta que el bin `satlas` |

---

## 2. Principios arquitectónicos

1. **Una sola fuente de verdad por cosa.** La lógica vive en el kernel; el CLI, el LSP y la extensión son capas delgadas. Los prompts viven en `workflow/` y se compilan; nunca se mantienen a mano por agente.
2. **Determinismo por encima de heurística.** Todo check tiene código estable, severidad y salida JSON reproducible. El mismo repo produce el mismo reporte.
3. **Los documentos son datos.** Las gramáticas (spec, delta, tasks, verify) se parsean con parsers propios y testeados; ninguna fase depende de que un LLM las interprete bien.
4. **Derivar, no almacenar.** El estado se calcula de los artefactos + `meta.yaml` + firmas. Lo que se almacena son hechos que el cálculo no puede reconstruir (carril, riesgo, overrides, pausas).
5. **Fallo explícito.** Parseos estrictos, exit codes distinguibles, mensajes accionables con `path:line`. Sin degradaciones silenciosas.
6. **Local-first.** Sin red para funcionar. Los adaptadores de red (tracker, memoria) son opt-in y desactivables.
7. **Portabilidad del dato.** Markdown + YAML legibles por humanos y agentes; import/export siempre disponibles.
8. **Español por defecto.** `language: es` es el valor inicial: todo el contenido generado (spec, proposal, plan, tasks, deltas, verify, review, docs, mockups, presentación, mensajes de UI/CLI y documentación) se escribe en español. `language: en` cambia todo el contenido a inglés; nunca se genera contenido en inglés sin que la configuración o una petición explícita lo indiquen. La sintaxis de las gramáticas (encabezados y claves canónicas) es un contrato del parser, no contenido: el parser acepta las formas en español (`Requisito`, `Escenario`, `Regla`, `Archivos`, `Cubre`, …) y el writer puede emitirlas cuando `syntax: es` (default si `language: es`).

---

## 3. Vista de componentes y límites

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ CONSUMIDORES                                                                 │
│  CLI `specatlas`/`satlas`   Extensión VS Code   LSP server   Servidor MCP      │
│  (Node ≥20)              (UI delgada)        (diagnósticos) (agentes)       │
└───────────────┬──────────────────┬──────────────┬────────────┬──────────────┘
                │                  │              │            │
                ▼                  ▼              ▼            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ KERNEL `@specatlas/core`  (sin IA, sin red, sin `vscode`, pura y testeable) │
│                                                                              │
│  config · schemas(zod) · fsx · fm(frontmatter) · md(índice de secciones)     │
│  parse: spec · delta · tasks · verify · approvals · meta                     │
│  model: Requirement/Scenario/Rule/Task/Evidence/Change/Spec                  │
│  lifecycle(derive) · gates(matrix) · trace(graph+checks) · waves(dag)        │
│  lint(structure/business/delta/mockup) · drift(anchors) · hash(canonical)    │
│  approvals(sign/verify) · runs(jsonl) · metrics(jsonl) · doctor(rules)       │
│  profiles(detect/load) · migrations(registry) · report(json envelope)        │
└───────────────▲──────────────────────────────────────────────────────────────┘
                │ escribe/lee
┌───────────────┴──────────────────────────────────────────────────────────────┐
│ ESTADO EN EL REPO `.sdd/` (git)                                              │
│  config.yaml · constitution.md · glossary.md · personas.md · decisions/      │
│  specs/ · changes/ (+archive/) · runs/ · metrics/ · approvals.yaml · profiles│
└───────────────▲──────────────────────────────────────────────────────────────┘
                │ generado por
┌───────────────┴──────────────────────────────────────────────────────────────┐
│ COMPILADOR DE ADAPTADORES + MOCKUPS + PRESENTACIÓN                            │
│  workflow/ (fuente de prompts) → adapters/<target> (opencode, claude, codex…) │
│  mockups: browser adapter (CDP/Playwright) → HTML + screenshots + manifest     │
│  render: markdown → HTML estilizado (código resaltado + mermaid + tokens)      │
│  presentación: render HTML/PDF autocontenido para stakeholder                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Límites:**

- El kernel **no** ejecuta agentes, **no** abre navegadores y **no** escribe redes. Recibe rutas y devuelve reportes.
- El compilador de adaptadores y el pipeline de mockups son paquetes separados (`@specatlas/adapters`, `@specatlas/mockups`) que **usan** el kernel, no al revés.
- La extensión y el LSP dependen de `@specatlas/core`; el CLI también. Ninguna capa duplica lógica.

---

## 4. Monorepo

```text
specatlas/
├── packages/
│   ├── core/                 @specatlas/core      (sin deps salvo zod, yaml)
│   ├── cli/                  specatlas            (bins: specatlas, satlas)
│   ├── render/               @specatlas/render    (markdown + código + mermaid)
│   ├── adapters/             @specatlas/adapters  (compilador de prompts)
│   ├── mockups/              @specatlas/mockups   (pipeline de mockups)
│   ├── lsp/                  @specatlas/lsp       (server + bin)
│   ├── mcp/                  @specatlas/mcp       (server read-only)
│   └── vscode/               specatlas-vscode     (extensión; UI + wiring)
├── workflow/
│   ├── phases/               prompts fuente por fase (spec, plan, build, …)
│   ├── snippets/             fragmentos compartidos (gates, evidencia, etc.)
│   └── targets/              definición de cada agente destino
├── profiles/                 perfiles oficiales (generic, node-ts, python, …)
├── templates/                plantillas de artefactos (es por defecto; en opcional)
├── fixtures/                 repos multi-stack para tests de integración
├── docs/                     documentación (sitio incluido)
└── .sdd/                     dogfooding: SpecAtlas se desarrolla con SpecAtlas
```

---

## 5. Kernel: módulos y API

Convención: todo lo público se exporta desde `@specatlas/core` con tipos explícitos. Nada accede a `fs` fuera de `fsx` (fachada segura y mockeable en tests).

### 5.1 `config`

```ts
export interface AtlasConfig {
  schemaVersion: 1
  project: { name: string; language: 'es' | 'en' }     // language: default 'es'
  lanes: { default: Lane; allowed: Lane[] }
  gates: {
    approval: 'file' | 'none' | 'github-label'   // + approval_label (default 'spec-approved')
    approval_label: string
    analyze: { mode: 'off' | 'advisory' | 'blocking'; minSeverity: Severity }
    verify: { mode: 'off' | 'advisory' | 'blocking'; requireEvidence: boolean }
    review: { mode: 'off' | 'advisory' | 'blocking' }
    mockup: { requireApproval: boolean; compareInVerify: boolean }
  }
  trace: { mode: 'off' | 'advisory' | 'blocking'; prefix: string }
  waves: { maxParallel: number }
  ci: { drift: 'advisory' | 'strict' }
  spec: { language: 'es' | 'en'; businessOnly: boolean; glossary: string }   // language: default 'es'
  syntax: { headers: 'es' | 'en' }                     // default: igual que language (writer); el parser acepta ambas
  mockups: { level: 'sketch' | 'hifi'; platform: 'auto' | 'web' | 'mobile' | 'desktop'; a11y: 'off' | 'A' | 'AA' | 'AAA' }
  editor: { vscode: boolean; lsp: boolean }
  adapters: { targets: AgentTarget[] }
  packs: string[]                                // packs de cumplimiento activos (seguridad, datos, auditoria, accesibilidad o propios)
  integrations: { tracker: 'none' | 'github' | 'jira' | 'linear' | 'clickup'; memory: 'none' | 'mcp' }
}

export function loadConfig(root: string): Promise<AtlasConfig>          // precedencia: CLI > proyecto > usuario > defaults
export function validateConfig(raw: unknown): Result<AtlasConfig, ConfigError[]>
```

### 5.2 `schemas`

Esquemas zod versionados por tipo de archivo. Todos usan `.passthrough()` controlado y `schema_version` explícito donde aplica:

```ts
export const metaSchema: ZodType<ChangeMeta>
export const approvalsSchema: ZodType<ApprovalsFile>
export const mockupManifestSchema: ZodType<MockupManifest>
export const specFrontmatterSchema: ZodType<SpecFrontmatter>
export const evidenceBlockSchema: ZodType<Evidence>
```

### 5.3 `parse`

```ts
export function parseSpec(md: string, file: string): ParsedSpec        // { frontmatter, requirements, diagnostics }
export function parseDelta(md: string, file: string): ParsedDelta      // { added, modified, removed, renamed, diagnostics }
export function parseTasks(md: string, file: string): ParsedTasks      // { meta, blocks, tasks, diagnostics }
export function parseVerify(md: string, file: string): ParsedVerify    // { evidenceByScenario, diagnostics }
export function parsePlan(md: string, file: string): ParsedPlan        // { sections, diagrams, diagnostics }
export function parseApprovals(yaml: string): ParsedApprovals
export function parseMeta(yaml: string): ParsedMeta
```

Todos devuelven `diagnostics: Diagnostic[]` con `{ code, severity, path, line?, message }` (nunca lanzan por contenido inválido; lanzan solo por E/S).

### 5.4 `model` (tipos centrales)

```ts
export interface Requirement { id: string; title: string; prose: string; rules: Rule[]; scenarios: Scenario[]; file: string; line: number }
export interface Scenario { id: string; title: string; when: string[]; then: string[]; reqId: string; file: string; line: number }
export interface Rule { id: string; text: string }
export interface Task { id: string; block: string; text: string; done: boolean; files: string[]; covers: string[]; dependsOn: string[]; rollback?: string; file: string; line: number }
export interface Evidence { scenarioId: string; method: 'executable' | 'automatic' | 'semi' | 'manual'; command?: string; result: 'pass' | 'fail' | 'skipped'; outputHash?: string; date: string; by: string; notes?: string }
export interface Anchors { files: string[]; symbols?: string[] }
```

### 5.5 `lifecycle`

```ts
export type Phase = 'spec' | 'approve' | 'plan' | 'analyze' | 'build' | 'verify' | 'review' | 'docs' | 'pr' | 'archive'
export type ChangeState = 'draft' | 'spec_draft' | 'awaiting_approval' | 'approved' | 'planned' | 'analyzed' | 'building' | 'built' | 'verified' | 'reviewed' | 'documented' | 'pr_open' | 'archived'

export interface DerivedState {
  state: ChangeState
  phase: Phase
  nextAction: NextAction          // comando concreto + argumentos + si requiere agente
  blockedBy: BlockReason[]        // gates pendientes, overrides requeridos
  progress: { tasksDone: number; tasksTotal: number; scenariosEvidenced: number; scenariosTotal: number }
}

export function deriveState(change: ChangeContext, cfg: AtlasConfig): DerivedState
```

**Reglas de derivación (orden de prioridad):**

1. `paused` en `meta.yaml` → estado conservado + `phase: 'paused'` como atributo; `next` propone `resume`.
2. Sin `spec.md` en el change → `draft`; `next: /satlas.clarify` o `/satlas.specify`.
3. Delta con diagnósticos bloqueantes o linter de negocio fallando → `spec_draft`; `next: corregir`.
4. Spec válida sin firma vigente → `awaiting_approval`; `next: satlas approve` (o `present`).
5. Firma vigente, sin `plan.md`/`tasks.md` (carril que los exige) → `approved`; `next: /satlas.plan`.
6. Con plan/tareas y `analyze` obligatorio sin reporte verde → `planned`; `next: /satlas.analyze`.
7. **Hay tareas pendientes → `building`**, aun si ya existen verify/review (lección AmigoXCD: las fases tardías pueden añadir tareas).
8. Todas las tareas hechas, evidencia incompleta → `built`; `next: satlas verify`.
9. Evidencia completa, review pendiente → `verified`; `next: /satlas.review`.
10. Review cerrado, docs (carril full) pendientes → `reviewed`; `next: /satlas.docs`.
11. PR abierto → `pr_open`; `next: satlas archive`.
12. Archivado → `archived`.

La derivación es una función pura sobre `ChangeContext = { meta, spec?, delta?, plan?, tasks?, verify?, review?, approvals, mockups?, cfg }` — testeable con fixtures sin tocar disco.

### 5.6 `gates` (matriz por carril)

| Gate | fix | standard | full |
|---|---|---|---|
| `spec.md` (delta) | — | ✅ bloqueante | ✅ bloqueante |
| Linter de negocio | — | ✅ bloqueante | ✅ bloqueante |
| Firma de spec (provider) | — | ✅ bloqueante | ✅ bloqueante |
| `plan.md` + `tasks.md` | — | ✅ | ✅ |
| Trazabilidad (`trace --check`) | advisory | ✅ bloqueante | ✅ bloqueante |
| `analyze` | — | ✅ | ✅ bloqueante |
| Evidencia por escenario | manual aceptada | ✅ | ✅ |
| Mockup aprobado (dominio UI) | — | ✅ | ✅ + comparación en verify |
| `review` | — | advisory | ✅ bloqueante |
| Aclaración (preguntas abiertas) | — | configurable (`gates.clarify.mode`) | configurable (`gates.clarify.mode`) |

| Docs | — | — | ✅ configurable (`gates.docs.mode`) |
| Archivo | ✅ | ✅ | ✅ |

`fix.md` es el único artefacto del carril fix; su `verify` se registra en el mismo archivo con un bloque `evidence` por escenario afectado o `manual` justificado.

### 5.7 `trace` (motor de trazabilidad)

**Nodos:** `Spec`, `Requirement`, `Scenario`, `Rule`, `Task`, `Evidence`, `MockupScreen`, `ADR`, `Change`.
**Aristas derivadas:** `contains(spec→req)`, `covers(task→scenario)`, `evidences(evidence→scenario)`, `illustrates(screen→scenario)`, `amends(change→req)`, `decides(adr→req|change)`, `depends(task→task)`.

```ts
export interface TraceGraph { nodes: TraceNode[]; edges: TraceEdge[] }
export function buildTraceGraph(input: TraceInput): TraceGraph
export function checkTrace(graph: TraceGraph, cfg: AtlasConfig, scope?: 'change' | 'workspace'): TraceFinding[]
```

**Catálogo de checks:**

| Código | Severidad | Regla |
|---|---|---|
| `TRACE-001` | error | Requisito (nuevo o modificado) sin ningún escenario |
| `TRACE-002` | error (blocking según `trace.mode`) | Escenario del delta sin tarea que lo cubra |
| `TRACE-003` | error | `Covers:` referencia un `REQ`/escenario inexistente |
| `TRACE-004` | warning/error por carril | Tarea sin `Covers` (excepto tareas `Infra:` explícitas) |
| `TRACE-005` | error (full) | Escenario sin evidencia `pass` al llegar a `built`/`verified` |
| `TRACE-006` | warning | Evidencia huérfana (escenario no existe) |
| `TRACE-007` | error | Delta `MODIFIED`/`REMOVED` no coincide con la spec viva (bloque incompleto o inexistente) |
| `TRACE-008` | error | `REQ` o escenario duplicado (mismo id en dos lugares) |
| `TRACE-009` | error | `Depends:` a tarea inexistente o de otro bloque |
| `TRACE-010` | error | Ciclo en el DAG de dependencias |
| `TRACE-011` | error | `Illustrates:` de mockup sin escenario válido |
| `TRACE-012` | warning (dominio UI) | Escenario de UI sin pantalla de mockup en carril standard/full |
| `TRACE-013` | warning | `REQ` de la spec viva sin ninguna relación (huérfano de trazabilidad) |

**Salida JSON (`satlas trace --json`):**

```json
{
  "schemaVersion": 1, "ok": false, "scope": "change",
  "graph": { "nodes": 42, "edges": 88 },
  "findings": [
    { "code": "TRACE-002", "severity": "error", "message": "Escenario sin tarea que lo cubra",
      "scenario": "REQ-AUTH-001-S2", "path": "changes/reset-password/spec.md", "line": 18,
      "suggestion": "Añade una tarea con Covers: REQ-AUTH-001-S2" }
  ],
  "summary": { "errors": 1, "warnings": 2 }
}
```

### 5.8 `waves` (planificador de olas)

```ts
export interface WavePlan {
  blocks: BlockPlan[]
  diagnostics: Diagnostic[]
}
export interface BlockPlan {
  block: string
  waves: Wave[]                    // cada ola: tareas sin dependencias entre sí y sin colisión de archivos
  degraded: Array<{ task: string; reason: 'file-collision' | 'orphan-dependency'; movedToWave: number }>
  cycles?: string[][]
}
export function planWaves(tasks: Task[], opts: { maxParallel: number }): WavePlan
```

**Algoritmo:** (1) validar DAG (ciclos → `TRACE-010`); (2) niveles de Kahn por bloque; (3) dentro de cada nivel, separar en lotes por colisión de `Files:` (dos tareas que tocan el mismo archivo nunca van en la misma ola; la de ID mayor se degrada a la siguiente, registrando el motivo); (4) orden determinista por `compareTaskIds` (numérico, no lexicográfico: `T1.2 < T1.10`); (5) `maxParallel` como tope duro de la CLI, nunca del plan.

### 5.9 `lint`

| Grupo | Códigos | Ejemplos |
|---|---|---|
| Estructura | `LINT-STR-*` | encabezado de sección faltante, frontmatter inválido, ID mal formado |
| Negocio | `LINT-BIZ-*` | `LINT-BIZ-001` jerga técnica; `002` palabra vaga; `003` criterio no medible; `004` requisito sin actor; `005` escenario sin `THEN`; `006` multi-`WHEN/THEN` en un escenario; `007` término fuera del glosario; `008` requisito duplicado; `009` contradicción heurística; `010` spec sobredimensionada (sugerir split) |
| Delta | `LINT-DLT-*` | `001` `MODIFIED` sin bloque completo; `002` `REMOVED` sin `Reason`/`Migration`; `003` `RENAMED` sin `FROM/TO` |
| Evidencia | `LINT-EVD-*` | `001` evidencia sin comando en método `executable`; `002` fecha inválida; `003` hash con formato incorrecto |
| Mockup | `LINT-MKP-*` | `001` sin estados; `002` sin breakpoints; `003` texto placeholder (`Lorem ipsum`, `Item \d`); `004` contraste insuficiente; `005` área táctil < 44 px; `006` sin `Illustrates`; `007` tokens no respetados |
| Plan | `LINT-PLN-*` | `001` faltan diagramas requeridos por el tipo de cambio; `002` bloque mermaid inválido (tipo de diagrama desconocido o fence mal cerrado); `003` sección técnica obligatoria ausente; `004` nombre de archivo técnico inválido |

Vocabularios del linter de negocio configurables por idioma y proyecto (`lint.vocabulary.<lang>.vague[]`, `.technical[]`), con defaults en español (los de inglés se aplican solo si `language: en`).

### 5.10 `drift` (anclas)

Las specs vivas declaran anclas de implementación opcionales:

```markdown
## Implementation anchors
- src/auth/reset.ts
- src/auth/reset.ts#requestReset
```

```ts
export interface DriftFinding { specFile: string; anchor: string; kind: 'missing-file' | 'missing-symbol'; }
export function checkDrift(root: string, cfg: AtlasConfig): Promise<DriftFinding[]>
```

- `missing-file`: el path no existe (glob no matchea).
- `missing-symbol`: búsqueda textual del símbolo en el archivo (regex configurable por perfil de lenguaje).
- Modo `ci.drift`: `advisory` (warning) o `strict` (exit 1). Nunca bloquea el flujo local.
- El mockup tiene su propio drift: `satlas mockup --check` compara el hash de entradas (spec + tokens) contra `mockups/manifest.yaml` y marca mockups obsoletos (`MKP-STALE`).

### 5.11 `hash` (canónico)

```ts
export function canonicalizeMarkdown(md: string): string   // normaliza EOL → \n, trim de espacios finales, colapsa >2 líneas vacías, ordena frontmatter
export function canonicalizeYaml(y: string): string        // parse → stringify estable (claves ordenadas)
export function artifactHash(kind: 'spec' | 'delta' | 'plan' | 'tasks' | 'verify' | 'mockup-manifest', content: string): string
```

Reglas: EOL `\n` (importante en Windows), sin BOM, sin espacios finales, YAML re-serializado con orden estable. El hash cubre el contenido semántico, no el formato.

### 5.12 `approvals`

```ts
export interface Approval { artifact: string; artifactHash: string; approvedBy: string; approvedAt: string; channel: 'presentation' | 'editor' | 'pr' | 'tracker' | 'cli'; note?: string }
export function signApproval(root: string, artifactPath: string, by: string, channel: Approval['channel']): Promise<Approval>
export function verifyApproval(root: string, artifactPath: string): Promise<'valid' | 'stale' | 'missing' | 'overridden'>
```

- `stale`: existe firma pero el hash actual no coincide → el gate vuelve a pendiente y `satlas status` lo muestra.
- Override: `satlas approve --override --reason ... --by ...` escribe un override en `meta.yaml` (auditado) y la verificación devuelve `overridden`.
- Nunca auto-aprobación: el CLI exige `--by` y, en modo interactivo, confirmación explícita.

### 5.13 `runs` y `metrics`

- `.sdd/runs/<run-id>/{state.json,events.jsonl}`; 16 tipos de evento (`run_started`, `task_started`, `task_completed`, `wave_started`, `wave_completed`, `verify_run`, `override_applied`, `paused`, `resumed`, …). Append-only, idempotente por `eventId`.
- `.sdd/metrics/flow.jsonl`: `{ ts, change, phase, event, durationMs?, tasks?, rework? }`.
- `.sdd/metrics/tokens.jsonl`: `{ ts, change, phase, origin: 'orchestrator' | 'subagent', model, input, output, cacheRead, cacheCreation }` — el kernel solo **lee y agrega**; los adaptadores de agente escriben.
- Privacidad: todo local; documentado en `docs/privacy.md`.

### 5.14 `doctor`

Reglas semánticas con códigos estables y acción sugerida:

| Código | Detecta |
|---|---|
| `ATLAS-LIFECYCLE-001` | plan/tasks sin firma vigente de spec |
| `ATLAS-LIFECYCLE-002` | estado imposible (p. ej. archivado con evidencia fallida) |
| `ATLAS-LIFECYCLE-003` | tareas pendientes con PR abierto |
| `ATLAS-LIFECYCLE-004` | override sin motivo/autor |
| `ATLAS-TRACE-*` | delega en `checkTrace` |
| `ATLAS-DRIFT-*` | delega en `checkDrift` |
| `ATLAS-FILES-001` | change sin `meta.yaml` o huérfano en `changes/` |
| `ATLAS-FILES-002` | mockup sin manifest o manifest sin screens |
| `ATLAS-FILES-003` | aprobación que apunta a un artefacto eliminado |
| `ATLAS-RUN-001` | run abierto huérfano (> 7 días sin eventos) |

### 5.15 `profiles`

```ts
export interface StackProfile {
  name: string; displayName: string
  detection: { files: string[]; manifests: Array<{ file: string; contains: string[] }>; priority: number }
  domains: Domain[]
  naming: { files: string; symbols: string; db?: string }
  structure: Record<string, string>
  commands: { build?: string; lint?: string; test?: string; format?: string }
  verify: { executable: string[]; automatic: string[]; manual: string[] }
  rollback: string
  antipatterns: string[]
  assumptions: string[]
  anchors?: { symbolPattern?: string }        // para drift en este lenguaje
}

export function detectProfiles(root: string, profiles: StackProfile[]): DetectionResult   // score = files*2 + manifests*3
export function loadProfiles(dirs: string[]): Promise<StackProfile[]>                       // oficiales + proyecto + usuario
```

### 5.16 `migrations` (implementado en la vía `satlas upgrade`)

```ts
export const SCHEMA_VERSION = 1
export interface MigrationSpec { id: string; description: string; from: number; to: number }
export function planUpgrade(root: string): Promise<UpgradePlan>                // detecta pendientes, ilegibles y versiones más nuevas; no escribe
export function applyUpgrade(root: string): Promise<UpgradeApplyReport>        // respaldo + sellado todo-o-nada; idempotente
export function rollbackUpgrade(root: string): Promise<UpgradeRollbackReport>  // restaura el respaldo de la última aplicación y lo consume
export function upgradeAdvisory(root: string): Promise<UpgradeAdvisory>        // aviso de solo lectura para estado, validación y diagnóstico
```

- Vista previa por defecto (`satlas upgrade`); aplicar es explícito (`--apply`).
- Respaldo en `.sdd/.backup/<marca-de-tiempo>/`: solo los elementos afectados + `backup.yaml` + puntero `.latest`.
- Una reversión por aplicación: `--rollback` restaura el estado previo y consume el respaldo.

### 5.17 `fixes` (fixes vivos)

```ts
export interface LivingFix { slug: string; file: string; date: string; result: string; domain?: string; title?: string; covers: string[]; content: string }
export function parseFixCovers(content: string): string[]                       // línea opcional `Cubre: REQ-…` (ignora comentarios)
export async function loadLivingFixes(root: string): Promise<LivingFix[]>       // .sdd/fixes/*.md ordenados por fecha
export async function writeLivingFix(root: string, input: WriteLivingFixInput): Promise<WriteLivingFixResult>  // idempotente: si existe, no lo pisa
```

- El archivado del carril `fix` sella el fix vivo (encabezado con identidad + contenido íntegro) antes de mover el cambio al histórico; si el movimiento falla, elimina el fix recién creado (todo-o-nada) y las specs vivas no se tocan.
- `Change.fixCovers` alimenta la trazabilidad: `checkTrace` avisa con `TRACE-011` si un fix declara un requisito que no existe (el fix sigue válido).
- El registro `.sdd/INDEX.md` incluye la sección «Fixes vivos».

### 5.18 `docs` y `parse/clarify` (fases aclarar y documentar)

```ts
export function parseClarify(content: string, filePath: string): ClarifyFile        // `- [ ]` abiertas · `- [x] pregunta — respuesta` aclaradas
export async function generateDocs(opts: GenerateDocsOptions): Promise<GenerateDocsResult>  // técnica + manual desde plantillas + evidencia
export function clarifyAdvisory(change: Change, cfg: AtlasConfig): Diagnostic[]    // ATLAS-CLARIFY-001 (modo advisory)
export function docsAdvisory(change: Change, cfg: AtlasConfig): Diagnostic[]       // ATLAS-DOCS-001 (modo advisory)
export function docsReady(change: Change): boolean                                 // técnica + manual presentes
```

- `gates.clarify.mode` (`off|advisory|blocking`, por defecto `advisory`) y `gates.docs.mode` (`off|advisory|blocking`, por defecto `blocking`; solo aplica al carril `full`).
- La aclaración bloquea el paso a plan (`approved` → `/satlas.clarify`); la documentación pendiente deja el cambio en `reviewed` con `next /satlas.docs`.
- El contenido generado vive entre `<!-- specatlas:generado:inicio -->` y `<!-- specatlas:generado:fin -->`: regenerar reemplaza solo ese bloque y conserva lo escrito a mano.

---

## 6. Gramáticas exactas

### 6.1 Spec viva (`specs/<dominio>/spec.md`)

```markdown
---
domain: auth
title: Autenticación
owner: equipo-auth
version: 7
updated: 2026-09-15
---

# Autenticación

### Requirement: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

- Rule BR-AUTH-014: El enlace es de un solo uso y vence a los 30 minutos.

#### Scenario: REQ-AUTH-001-S1 — Solicitud con email registrado
- **WHEN** el usuario solicita restablecer con un email registrado
- **THEN** recibe un enlace de un solo uso
- **AND** el enlace vence en 30 minutos
```

- Regex canónica: `^### Requirement: (REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}) — (.+)$`
- Escenario: `^#### Scenario: (REQ-…-S\d+) — (.+)$`
- Regla: `^- Rule (BR-[A-Z0-9-]+): (.+)$`
- Bilingüe aceptado: `Requisito`, `Escenario`, `Regla`; `DEBE`/`SHALL` ambos válidos (se normaliza en el modelo).
- **Contenido en español por defecto:** con `language: es` (default) el writer emite encabezados en español (`### Requisito:`, `#### Escenario:`, `- Regla`) y todo el texto en español. Con `language: en` emite la forma canónica en inglés. El parser siempre acepta ambas.
- La spec viva **no** contiene tecnología; `LINT-BIZ-001` la vigila.

### 6.2 Delta (`changes/<slug>/spec.md`)

```markdown
# Delta — Restablecer contraseña

## ADDED Requirements
### Requirement: REQ-AUTH-004 — …
(bloque completo: prosa + reglas + escenarios)

## MODIFIED Requirements
### Requirement: REQ-AUTH-001 — Restablecer contraseña
(bloque COMPLETO copiado de la spec viva, editado)

## REMOVED Requirements
### Requirement: REQ-AUTH-002 — Recuperación por SMS
- Reason: reemplazado por email
- Migration: comunicar a usuarios y deshabilitar el endpoint

## RENAMED Requirements
- FROM: REQ-AUTH-003 — Login con alias
  TO: REQ-AUTH-003 — Inicio de sesión con alias
```

**Fold determinista al archivar:** `ADDED` se añade; `MODIFIED` reemplaza por ID (debe existir y coincidir el título salvo cambio intencional registrado); `REMOVED` elimina y registra el bloque en `archive`; `RENAMED` retitula. El fold se ejecuta sobre una copia, se valida con `checkTrace` y recién entonces se escribe (todo-o-nada).

### 6.3 Tareas (`tasks.md`)

```markdown
# Tareas — Restablecer contraseña

## Block 1 — Base de datos
- [ ] T1.1 Crear tabla de tokens de restablecimiento · Files: db/migrations/003.sql · Covers: REQ-AUTH-001-S1 · Rollback: DROP TABLE
- [x] T1.2 Añadir índice por usuario · Files: db/migrations/003.sql · Depends: T1.1

## Block 2 — API
- [ ] T2.1 Endpoint de solicitud · Files: src/auth/reset.ts · Covers: REQ-AUTH-001-S1, REQ-AUTH-001-S2 · Depends: T1.1
```

- Tarea: `^- \[( |x)\] (T\d+\.\d+) (.+?)(?: · (.+))?$`
- Claves bilingües en el parser: `Files`/`Archivos`, `Covers`/`Cubre`, `Depends`/`Depende de`, `Rollback`/`Reversión`, `Infra` (marca tareas sin requisito, justificadas). El writer emite las del idioma configurado (**español por defecto**).
- Separador obligatorio ` · ` (U+00B7) para evitar ambigüedad con comas dentro de valores.
- `Covers` acepta escenarios (`REQ-…-S1`) o requisitos completos (`REQ-…`); se expande al grafo.

### 6.4 Evidencia (`verify.md`)

```markdown
# Verificación — Restablecer contraseña

### REQ-AUTH-001-S1 — Solicitud con email registrado
```evidence
method: executable
command: npm test -- reset
result: pass
output_hash: sha256:9f2c…
date: 2026-09-15T18:04:00Z
by: aanchante
notes: 12/12 casos
```
```

- Bloque cercado ` ```evidence ` con esquema `evidenceBlockSchema`.
- `satlas verify --record <scenario> --command "…"` ejecuta el comando (por el runner seguro, **sin shell**), captura salida, calcula `output_hash` y escribe el bloque. El comando debe estar declarado en el perfil (`verify.executable`) o pasar `--allow-command`.

### 6.5 `meta.yaml` (estado del change)

```yaml
schema_version: 1
slug: reset-password
title: Restablecer contraseña
domain: auth
lane: standard                # fix | standard | full
risk: medium                  # low | medium | high
created: 2026-09-15
owner: aanchante
tracker: { provider: github, id: 123 }        # opcional
paused: { reason: esperando revisión legal, at: 2026-09-16T10:00:00Z, by: aanchante }   # opcional
lane_history: [{ from: fix, to: standard, at: 2026-09-15T12:00:00Z, by: aanchante }]
overrides:
  - { gate: review, reason: hotfix urgente autorizado por CTO, by: aanchante, at: 2026-09-15T20:00:00Z }
```

### 6.6 `approvals.yaml`

```yaml
schema_version: 1
approvals:
  - artifact: changes/reset-password/spec.md
    artifact_hash: sha256:ab12…
    approved_by: Maria Perez
    approved_at: 2026-09-15T17:40:00Z
    channel: presentation
    note: Aprobado en revisión con el área de negocio
```

### 6.7 `mockups/manifest.yaml`

```yaml
schema_version: 1
version: 3
level: hifi
platform: web
inputs_hash: sha256:cd34…            # hash de spec deltas + tokens → detecta mockups obsoletos
generated_at: 2026-09-15T16:10:00Z
tokens: design/tokens.json
screens:
  - id: reset-request
    file: reset-request.html
    title: Solicitud de restablecimiento
    illustrates: [REQ-AUTH-001-S1, REQ-AUTH-001-S2]
    states: [default, loading, sent, error]
    breakpoints: [390, 768, 1440]
    themes: [light, dark]
screenshots: [screens/reset-request-390.png, screens/reset-request-1440.png]
approved: { by: Maria Perez, at: 2026-09-15T17:40:00Z, artifact_hash: sha256:ef56… }
```

### 6.8 Plan técnico (`plan.md`)

Estructura canónica (secciones obligatorias según carril; `LINT-PLN-003` verifica):

```markdown
# Plan — Restablecer contraseña

## 1. Contexto AS-IS
(inventario de código real: existe / no existe / blast radius; anchors)

## 2. Enfoque técnico
(decisiones, alternativas descartadas y por qué)

## 3. Diagramas
(diagramas mermaid necesarios: ver tabla)

## 4. Diseño por capa / módulos
## 5. Matriz de trazabilidad (REQ → tareas)
## 6. Matriz de paridad AS-IS → TO-BE (refactors sustitutivos)
## 7. Tareas (referencia a tasks.md)
## 8. Riesgos y mitigaciones
## 9. Rollback
## 10. Dependencias y supuestos
```

**Diagramas requeridos (mermaid):**

| Tipo | Necesario cuando |
|---|---|
| `erDiagram` | el cambio toca modelo de datos o base de datos |
| `sequenceDiagram` | integraciones, APIs, jobs, eventos o llamadas entre sistemas |
| `flowchart` | reglas de negocio, procesos, validaciones o decisiones |
| `classDiagram` | modelo de dominio o lógica no trivial |
| `stateDiagram-v2` | máquinas de estado |
| `C4Context` o `flowchart` de capas | arquitectura, módulos o servicios nuevos |
| `gantt` / `timeline` | despliegue por fases o migraciones por etapas |

Reglas:

- Los diagramas viven en la sección `## 3. Diagramas` (uno o más bloques mermaid con título).
- `LINT-PLN-001` exige los diagramas según el cambio: BD → `erDiagram`; integración/API/job → `sequenceDiagram`; proceso o validaciones → `flowchart`; estados → `stateDiagram-v2`; módulos/arquitectura nuevos → diagrama de arquitectura. Si el perfil no puede inferirlo, el CLI pide confirmación "aplica / no aplica" y lo registra en `meta.yaml`.
- `LINT-PLN-002` valida de forma determinista el fence y el tipo de diagrama (sin navegador); el render real ocurre en la extensión o en `present`.

---

## 7. Mockups, renderizado y diagramas (`@specatlas/mockups` + `@specatlas/render`)

### 7.1 Etapas

```text
plan → generate → validate → capture → manifest → approve → (verify: compare)
```

1. **plan**: del delta + spec viva extrae los escenarios de UI (dominio frontend/mobile) y propone pantallas (`id`, `illustrates`, estados). Salida: `mockups/plan.yaml` revisable.
2. **generate**: el adaptador de agente recibe el prompt compilado (`workflow/phases/mockup.md`) + tokens + plan + glosario; escribe HTML autocontenido en `mockups/hifi/*.html`. El HTML debe: no depender de red, incluir navegación entre pantallas, estados conmutables (`?state=loading` o `data-state`), y el banner `MOCKUP · NO FUNCIONAL · vX · fecha`.
3. **validate**: `BrowserAdapter` abre cada pantalla en cada viewport/tema y ejecuta el checklist:
   - contraste y a11y (motor propio + axe-core opcional embebido como asset local);
   - overflow horizontal, scroll inesperado, textos truncados;
   - áreas táctiles ≥ 44 px (mobile/web táctil);
   - presencia de estados declarados y del banner;
   - ausencia de placeholders (`LINT-MKP-003`) y de recursos externos.
4. **capture**: screenshots deterministas por pantalla × breakpoint × tema (`mockups/screens/<id>-<bp>[-<theme>].png`).
5. **manifest**: escribe `mockups/manifest.yaml` con `inputs_hash`.
6. **approve**: la firma del mockup entra en `approvals.yaml` apuntando a `mockups/manifest.yaml`.
7. **compare** (verify, carril full): captura de la implementación y comparación lado a lado; diff visual opcional (umbral configurable) como **apoyo**, la decisión es humana.

### 7.2 `BrowserAdapter`

```ts
export interface BrowserAdapter {
  open(url: string, viewport: Viewport, opts?: { theme?: 'light' | 'dark' }): Promise<PageHandle>
  screenshot(page: PageHandle): Promise<Uint8Array>
  evaluate<T>(page: PageHandle, fn: () => T): Promise<T>
  close(): Promise<void>
}
```

Implementaciones:

- `cdp` (default): usa Chrome/Edge ya instalado vía protocolo DevTools (`--headless --remote-debugging-port`), **sin dependencias npm** — patrón probado en AmigoXCD.
- `playwright` (opcional): si el proyecto lo tiene, se prefiere (mejor emulación móvil y más estable en CI).
- `none`: genera y valida solo estáticamente (HTML/schema), declarando la validación visual como pendiente humana.

### 7.3 Presentación (`satlas present`)

Genera `changes/<slug>/presentation/index.html` autocontenido con: resumen de negocio, requisitos y criterios de aceptación, mockups navegables embebidos (iframe con `srcdoc`), plan técnico con diagramas (cuando el stakeholder deba revisarlo), supuestos, fuera de alcance y diff respecto a la versión aprobada anterior. Export PDF opcional (misma estrategia headless). Es el artefacto que consume el stakeholder y desde el que puede aprobar por canal `presentation`.

### 7.4 Renderizador compartido (`@specatlas/render`)

Un solo pipeline de render para la extensión, la presentación y las exportaciones:

```ts
export interface RenderOptions {
  theme: 'light' | 'dark'
  language: 'es' | 'en'
  mermaid: boolean
  codeHighlight: boolean
}
export function renderDocument(md: string, opts: RenderOptions): Promise<{ html: string; warnings: Diagnostic[] }>
```

- **Markdown + GFM**: tablas, listas de tareas, callouts (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`), enlaces internos entre artefactos (`REQ-…`, rutas de archivo con navegación en la extensión).
- **Código con formato amigable**: resaltado de sintaxis (shiki con un subset de lenguajes bundleado; fallback highlight.js), nombre de archivo en el encabezado del bloque, números de línea opcionales, botón "copiar" y colores alineados a los tokens visuales de la herramienta.
- **Mermaid vendorizado** (sin red): flujo, secuencia, ER, clases, estados, gantt y C4; tema claro/oscuro; un diagrama inválido se reporta como `LINT-PLN-002` y se muestra con su error en el lugar correspondiente en vez de romper el documento.
- **Estilo amigable**: tipografía, espaciado y tablas consistentes con los tokens del proyecto (`DESIGN.md`/`tokens.json`) cuando existan; encabezados de tabla fijos, bloques plegables y anclas por requisito.
- **Reutilización total**: la webview de VS Code, `satlas present` y la exportación HTML/PDF (headless) usan exactamente este renderizador con los mismos assets locales; no hay tres estilos distintos.

### 7.5 Diagramas del plan técnico

- El plan incluye los diagramas que el cambio necesita (sección 6.8): E/R, flujo, secuencia, estados, clases y arquitectura, en mermaid.
- `parsePlan` extrae `diagrams: { type, title, line }[]`; `LINT-PLN-001` exige los requeridos según el tipo de cambio y el perfil; `LINT-PLN-002` valida tipo y fence de forma determinista.
- La extensión los renderiza en la vista del plan (zoom/pan y export PNG opcional) y el paquete de presentación los incluye cuando el stakeholder revisa impacto técnico.
- Los diagramas complementan —no sustituyen— la matriz de trazabilidad y la matriz de paridad: son la vista visual del diseño.

---

## 8. Extensiones de agente (`@specatlas/adapters`)

### 8.1 Fuente

```text
workflow/phases/spec.md
---
id: spec
requires: []
produces: [changes/<slug>/spec.md]
guard: [lane, domain]
agent: { preferred: any, modelHint: high }
---
{{>snippets/reglas-negocio}}

# Fase: Especificar
<instrucciones con {{placeholders}}>
```

### 8.2 Targets

| Target | Artefactos generados | Invocación |
|---|---|---|
| `opencode` | `.opencode/command/satlas-*.md` (`$ARGUMENTS`) + `.opencode/skills/satlas-*/SKILL.md` | `/satlas-specify` |
| `claude-code` | `.claude/commands/satlas/*.md` + `.claude/skills/satlas-*/SKILL.md` | `/satlas:specify` |
| `cursor` | `.cursor/skills/satlas-*/SKILL.md` (con `disable-model-invocation`) + `.cursor/commands/satlas-*.md` (legacy) | `/satlas-specify` |
| `copilot` | `.github/prompts/satlas-*.prompt.md` + `.github/copilot-instructions.md` | `/satlas-specify` |
| `gemini` | `.gemini/commands/satlas/*.toml` (`prompt` + `{{args}}`) + `GEMINI.md` | `/satlas:specify` |
| `codex` | `prompts/satlas-*.md` + `AGENTS.md` (nota para `~/.codex/prompts/`) | `/prompts:satlas-*` o chat |
| `generic` | `AGENTS.md` + `prompts/*.md` | Escape hatch universal |

Notas: el compilador **deduplica** archivos compartidos entre targets (p. ej. `AGENTS.md` y `prompts/*` de `codex`/`generic`); los targets sin sustitución de argumentos reciben una nota para resolver el `<slug>` con el usuario. Todos implementados en F2 con tests y `--check` en CI.

### 8.3 Compilación

```ts
export interface CompiledArtifact { target: AgentTarget; path: string; content: string; hash: string }
export function compileTargets(root: string, targets: AgentTarget[], opts: { check?: boolean }): Promise<CompileReport>
```

- `.sdd/.generated/manifest.json` guarda `{target, file, hash, sourceHash, version}` para detectar desactualización (`satlas doctor` avisa `ATLAS-ADAPTERS-001`).
- **Golden tests**: `packages/adapters/__golden__/<target>/…` con snapshots; cualquier cambio de formato se ve en el diff del PR.
- Reglas de contexto: cada prompt declara `requires`/`produces`; el compilador no inyecta contexto completo, solo referencias a rutas (higiene de tokens).
- **Idioma del contenido:** cada prompt compilado incluye la directiva `Escribe el contenido en {language}` con `language` resuelto de `config.yaml` (**`es` por defecto**); solo se compila la variante inglesa de plantillas y snippets si `language: en`.

---

## 9. CLI: contrato

### 9.1 Envelope JSON

```ts
export interface Envelope<T> {
  schemaVersion: 1
  ok: boolean
  command: string
  data?: T
  warnings: Array<{ code: string; message: string; path?: string; line?: number }>
  errors: Array<{ code: string; message: string; path?: string; line?: number; suggestion?: string }>
}
```

- `--json` emite **solo** el envelope por stdout (sin color, sin progreso).
- Progreso y logs por stderr.
- Mensajes localizados por `language` (**es por defecto**); **los códigos son estables en inglés**.
- Los artefactos generados (`archive`, `present`, plantillas de `new`) respetan `language`: con `es` (default) todo el contenido se escribe en español.

### 9.2 Exit codes

| Código | Significado |
|---|---|
| `0` | Éxito (puede haber warnings) |
| `1` | Hallazgos bloqueantes o gate incumplido (`validate`, `trace`, `analyze`, `ci`, `doctor`) |
| `2` | Error de uso, configuración o parseo (incluye schema inválido) |
| `3` | Error de E/S o de entorno (sin permiso, dependencia faltante) |

### 9.3 Reglas de diseño

- Un solo catálogo `COMMANDS` genera la ayuda completa, la compacta y la de cada comando (`--help`).
- Flags desconocidos → error de uso antes de ejecutar.
- Todo comando mutante soporta `--dry-run` y es **idempotente**: dos corridas seguidas dejan el repo igual.
- `--yes` para CI; interactivo solo cuando hay TTY y no hay `--yes`.
- Sin dependencias de runtime en el CLI (Node built-ins); el kernel trae `zod`+`yaml`.
- `satlas next --json` es la interfaz que consumen la extensión y los agentes.

### 9.4 Precedencia de configuración

`flags CLI` > `.sdd/config.yaml` > `~/.config/specatlas/config.yaml` > defaults. Variables de entorno: solo `SPECATLAS_*` documentadas (p. ej. `SPECATLAS_AGENT_COMMAND`), nunca secretos en archivos del repo.

### 9.5 Informe de hallazgos (SARIF) y Action oficial

- `satlas ci --sarif <ruta>` escribe el informe con el **mismo veredicto** del gate (`toSarifReport` en el kernel: `error→error`, `warning→warning`, `info→note`; reglas únicas por código con descripción por familia; `artifactLocation.uri` relativa al proyecto y `region.startLine`; hallazgos sin archivo van sin `locations`).
- La escritura del informe **no altera el veredicto**: si la ruta no es escribible, se emite el aviso `ATLAS-CI-SARIF-001` y el exit code no cambia.
- La Action compuesta (`action.yml`, `uses: AlonsoAM/specatlas@v1`) instala la herramienta desde npm (entrada `version`), corre el gate en `path` y publica el informe con `github/codeql-action/upload-sarif` en un paso `if: always()` con `continue-on-error: true`: publicar es opcional y nunca cambia el veredicto.
- El informe solo contiene campos del diagnóstico (código, severidad, mensaje, sugerencia, ubicación): nunca contenido de archivos ni credenciales; el gate no usa la red.

---

## 10. Extensión VS Code (`specatlas-vscode`)

### 10.1 Componentes

| Componente | Responsabilidad |
|---|---|
| `extension.ts` | Solo wiring: registra providers y comandos |
| `coreHost` | Carga `@specatlas/core` y mantiene el índice del workspace (cache en memoria + debounce 200 ms) |
| `SpecsTreeProvider` / `ChangesTreeProvider` / `MockupsTreeProvider` | Árboles por estado, dominio, progreso y próxima acción |
| `DocRenderer` | Render compartido (`@specatlas/render`): código resaltado con botón copiar, tablas y callouts estilizados, mermaid (incluidos los diagramas del plan), tema claro/oscuro |
| `SpecDocument` | Vista de spec con el render amigable, requisitos plegables, badges de evidencia y navegación a tareas/verificación |
| `PlanView` | Vista del plan técnico: secciones + diagramas mermaid con zoom/pan y export PNG; avisos `LINT-PLN-*` |
| `TraceMatrixPanel` | Webview: matriz REQ × tarea × prueba × evidencia, huecos en rojo, click navega |
| `DeltaViewPanel` | Webview: diff semántico spec viva vs delta |
| `BoardPanel` | Webview: tablero por fase + timeline |
| `MockupPanel` | Webview con device frame, breakpoints, temas, galería de screenshots, botón Aprobar (firma) |
| `PresentationPanel` | Previsualiza y exporta el paquete de presentación |
| `ProblemsPublisher` | Publica diagnósticos del kernel (validate/doctor/trace/drift) como Problems con `path:line` |
| `LspClient` | Arranca `specatlas-lsp` y conecta al cliente de VS Code |
| `TerminalManager` | Acciones con agente: una terminal por fase+spec; escribe el prompt a un archivo temporal y lo pasa como argumento seguro |
| `StatusBar` | Fase activa, `next`, deltas sin archivar, avisos de contexto |
| `MetricsPanel` | Webview: tiempos, rework, tokens/costo (si hay datos) |

### 10.2 Modelo de interacción

- **Deterministas (in-process, sin red)**: init, validate, doctor, trace, waves, new, toggles de tareas, record de evidencia, firma, archive, export, screenshots, mockup check, `ci` local.
- **Con agente (terminal)**: specify, clarify, plan, analyze, build, verify, review, docs, mockup (generación). La extensión no habla con el modelo: compone el prompt compilado y lanza el agente configurado.
  Configuración: `specatlas.agent.command` (p. ej. `opencode run {promptFile}`), `specatlas.agent.strategy: perPhaseTerminal`, `specatlas.agent.confirmBlocks: true`.
- **Aprobaciones**: botón "Aprobar" que pide nombre, escribe la firma y refresca el estado.
- **Seguridad de webviews**: `localResourceRoots` limitado a `.sdd/` y `media/`, CSP estricta, sin scripts remotos, sin `eval`.

### 10.3 Contribuciones

- Activity bar: contenedor `SpecAtlas` con vistas `Specs`, `Changes`, `Mockups`, `Métricas`.
- Comandos: `specatlas.init`, `.new`, `.status`, `.next`, `.validate`, `.doctor`, `.trace`, `.waves`, `.archive`, `.present`, `.mockup.open`, `.mockup.approve`, `.spec.approve`, `.build`, `.verify.record`, `.review`, `.export`, `.metrics`, `.import`.
- Settings (extracto): `specatlas.language` (**default `es`**), `specatlas.agent.command`, `specatlas.agent.strategy`, `specatlas.trace.mode`, `specatlas.mockups.level`, `specatlas.maxPhaseTerminals`.

### 10.4 Distribución

- `vsce package` + `ovsx publish`; versión alineada con el monorepo mediante Changesets; publicación automática en release por tag.
- La extensión **no** incluye el kernel duplicado: se bundlea `@specatlas/core` en build (esbuild/tsup) manteniendo un solo origen.

---

## 11. LSP (`@specatlas/lsp`)

| Capacidad | Detalle |
|---|---|
| `diagnostics` | desde `lint`, `parse*` y `checkTrace` (rango por línea, códigos `LINT-*`/`TRACE-*`, `severity` mapeada) |
| `codeLens` | por `REQ`: "N tareas · evidencia M/N"; por tarea: "ola N"; por escenario: "Abrir evidencia" |
| `definition` / `references` | entre `REQ`/escenarios y sus apariciones en delta, tasks, verify y mockups |
| `documentSymbol` | requisitos y escenarios como símbolos jerárquicos |
| `workspaceSymbol` | buscar `REQ-*` en todo el proyecto |
| `codeAction` (quick fixes) | añadir escenario faltante, copiar bloque completo para `MODIFIED`, añadir `Covers:` a tarea, añadir término al glosario |
| `hover` | detalle del requisito, reglas y estado de evidencia |

- Protocolo sobre stdio; sin estado fuera del kernel; re-parseo incremental por documento (debounce 150 ms).
- Tests con el harness de `vscode-languageserver` (fixtures de `.sdd/`).

---

## 12. Servidor MCP (`satlas mcp`)

- `satlas mcp` (stdio) expone herramientas **de solo lectura**: `atlas_status`, `atlas_next`, `atlas_validate`, `atlas_trace`, `atlas_impact`, `atlas_glossary`, `atlas_fixes`.
- Nunca muta el repo: las mutaciones pasan por el CLI (acción humana/agente con permisos).
- Pensado para agentes que no tienen extensión o prefieren introspección del estado antes de actuar.

**Implementación (F3):**

- Vive en el CLI (`packages/cli/src/mcp/*`): transporte JSON-RPC 2.0 newline-delimited sobre stdio con Node built-ins (`readline`), **sin dependencias nuevas** (ADR-007/010). La salida estándar solo transporta mensajes; todo registro va a stderr.
- Las operaciones reutilizan `evaluateChange`/`checkTrace` del CLI: el estado informado es idéntico al de `satlas status`/`next` por construcción.
- `atlas_impact` se apoya en el nuevo módulo del núcleo `impact.ts` (relaciones registradas: `Cubre`, `Archivos`, deltas; sin análisis semántico de código) y `atlas_glossary` en `parse/glossary.ts`.
- Caché del workspace en memoria invalidada por cambio de archivos clave (`.sdd/`), para heredar el presupuesto de `status` (≤ 300 ms).
- Sin proyecto inicializado: respuesta estructurada con `isError` y la acción recomendada (`satlas init`), nunca una excepción de protocolo.

---

## 13. Seguridad

| Área | Medida |
|---|---|
| Ejecución de comandos | `execFile` sin shell; allowlist por perfil; timeout; `AbortSignal`; salida redirigida y truncada |
| Paths | resolución con `realpath`, prohibido salir del repo, detección de symlinks |
| Secretos | redacción con patrones (`sk-`, `ghp_`, `AKIA…`, JWT) en todos los logs y reportes |
| Hooks | manifiesto firmado; solo hooks del paquete verificado o del repo con revisión explícita |
| Webviews | CSP estricta, recursos locales, sin `eval` |
| Red | desactivada por defecto; adaptadores de red opt-in con allowlist de hosts |
| Supply chain | lockfile, `npm publish --provenance`, dependencias mínimas, auditoría en CI |
| Telemetría | inexistente; `docs/privacy.md` lo declara formalmente |

---

## 14. Estrategia de testing

| Capa | Herramienta | Qué cubre |
|---|---|---|
| Unit kernel, CLI, LSP y render | `vitest` | parsers, lifecycle, trace, waves, lint, hash, approvals, compilador, render |
| Propiedades | `fast-check` | parsers (round-trip), fold de deltas (idempotencia), canonical hash (estabilidad) |
| Golden | snapshots en repo | compilador de adaptadores, exportadores (present, pdf), reportes JSON |
| Integración CLI | fixtures + snapshots | flujos completos por carril en repos sintéticos |
| Multi-stack | `fixtures/` (10 repos) | detección de perfiles, comandos, verify y archive end-to-end |
| LSP | harness LSP | diagnósticos, codeLens, refs |
| Extensión | `@vscode/test-electron` | árboles, comandos deterministas, webviews clave |
| Rendimiento | gates en CI | presupuestos de la sección 15 |

**Cobertura mínima:** kernel ≥ 90 % en líneas de lógica (excluye I/O), golden 100 % de targets, e2e para los 3 carriles.

---

## 15. Presupuestos de rendimiento

| Operación | Presupuesto (p95) |
|---|---|
| `status` en workspace con 500 specs / 5 000 tareas | ≤ 300 ms |
| `validate` completo | ≤ 500 ms |
| `trace --check` | ≤ 400 ms |
| `waves` por bloque (200 tareas) | ≤ 200 ms |
| Activación de la extensión | ≤ 250 ms |
| Diagnósticos LSP tras guardar | ≤ 300 ms |
| Generación de mockup + captura (5 pantallas × 3 breakpoints) | ≤ 90 s (incluye agente) |

Si se excede, los tests de rendimiento fallan en CI (fixture sintético).

---

## 16. Versionado, migraciones y deprecaciones

- **Semver** para paquetes; **`schema_version`** por artefacto (`meta`, `approvals`, `mockup manifest`, `config`, envelope).
- Toda migración es: detectable, idempotente, reversible, con backup y dry-run (`satlas upgrade`).
- Deprecaciones: un minor marca con warning (`DEPRECATED-*`), el siguiente major elimina; ventana mínima de 6 meses para flags/gramáticas.
- Compatibilidad de gramática: el parser acepta la forma antigua por 2 majors; el writer siempre emite la nueva.

---

## 17. Roadmap técnico (deliverables por fase)

### F0 — Fundaciones
- `core`: `config`, `schemas`, `fsx`, `parse/fm+tasks`, `model`, `lifecycle(v1)`, `report`, `hash`.
- `cli`: `init`, `status`, `next`, `validate`, `doctor(v1)`, `--json`, catálogo de ayuda.
- `adapters`: compilador + targets `opencode`, `claude-code`, `generic` + golden tests.
- `profiles`: `generic`, `node-ts`, `python`, `dotnet-sqlserver` + detección.
- `templates` en español por defecto (variante `en` opcional); `fixtures` (3 repos); CI (unit + golden + e2e básico).
- **Demo de salida:** repo vacío → spec → plan → tasks → build simulado → verify → archive con `trace` verde.

### F1 — Ciclo completo + propuesta presentable
- `core`: delta + fold, `trace` completo, `waves`, `lint` (estructura, negocio, delta), `approvals`, `runs`, `ci`, carril `fix`.
- `cli`: `new`, `plan`(asistido), `tasks`, `analyze`, `run`, `verify --record`, `ci`, `present`, `approve`, `archive`.
- `mockups`: plan/generate/validate/capture/manifest + `BrowserAdapter cdp` + lint de mockups.
- `render`: markdown + código resaltado + tablas/callouts + mermaid + tokens (usado por la extensión, `present` y export).
- `core`: `parsePlan` + `LINT-PLN-001/002` (diagramas requeridos y validación de mermaid).
- `vscode` (mínima): árbol, visor con render estilizado (código + diagramas), Problems, visor de mockups.
- **Demo de salida:** propuesta completa (spec de negocio + mockups + criterios) aprobada y firmada sin salir del editor.

### F2 — Ecosistema y editor completo
- `core`: `drift`, `impact`, `amend`, `env`, `metrics`, `migrations`, reglas `ATLAS-*` completas.
- `cli`: `adopt`, `impact`, `amend`, `env`, `metrics`, `profile`, `import`, `mcp`.
- `lsp`: diagnósticos + codeLens + definition/references + codeActions.
- `vscode`: matriz de trazabilidad, delta view, board, firmas, TerminalManager, acciones con agente.
- `adapters`: `codex`, `cursor`, `copilot`, `gemini`; `mockups`: adapter `playwright` + comparación en verify.
- **Demo de salida:** 3 repos externos de stacks distintos completan el ciclo; LSP detecta roturas de trazabilidad en vivo.

### F3 — v1.0
- Congelado de esquemas y contrato CLI; guía de migración; deprecaciones formales.
- Publicación Marketplace + Open VSX; `MetricsPanel`; compliance packs; contract testing; multi-repo (`link`).
- Revisión de seguridad externa + política de disclosure; presupuestos de rendimiento estables.

---

## 18. Riesgos técnicos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Gramáticas rígidas que frustren al usuario (falsos positivos de linter) | Severidades configurables (`off/advisory/blocking`) por regla; `satlas lint explain <código>`; vocabularios locales |
| Parsers frágiles ante ediciones humanas | Propiedades de round-trip con `fast-check` + diagnósticos con `path:line` y quick fixes en el LSP |
| `cdp` inestable entre versiones de Chrome/Edge | Abstracción `BrowserAdapter` + fallback `playwright` + validación estática `none` |
| Golden tests frágiles por cambios de agentes | Snapshot por target con revisión explícita; el target `generic` nunca depende de formatos ajenos |
| CRLF/Windows afecta hashes y firmas | Canónico de hash explícito (EOL `\n`) + tests multiplataforma en CI |
| LSP con repos grandes | Índice incremental + presupuestos de rendimiento + parseo por documento |
| Complejidad del fold de deltas | Fold todo-o-nada sobre copia + validación previa + tests de propiedades (idempotencia) |
| Sobrecarga de mantenimiento de 7 targets | Targets generados desde una fuente; un target sin mantenedor se marca `community` y no bloquea releases |

---

## 19. Decisiones resueltas (2026-09-15)

1. **Reservar SpecAtlas: sí** — paquete npm `specatlas`, organización GitHub `specatlas`, dominio `specatlas.dev` y verificación de marca.
2. **Binario y alias: `specatlas` + `satlas`, ambos propios.** El paquete npm llamado sdd (abandonado desde 2016, "structured data diff") podría instalar un ejecutable con ese nombre, así que SpecAtlas no usa sdd en absoluto: publica dos bins propios y libres en el mismo paquete. Alternativas si hiciera falta: `atls`, `sddx`. Detalle en `PROPUESTA.md` §7.2.
3. **Runner de tests: `vitest`** en todo el monorepo (kernel, CLI, LSP, render y extensión con `@vscode/test-electron`); `fast-check` para propiedades.
4. **Peer review: fuera de alcance.** No hay segundo modelo ni revisión externa. Se conserva `satlas review`: revisión de código con lentes por tamaño del diff y verificación adversarial de hallazgos (un solo agente).
5. **Open VSX: sí**, la extensión se publica en VS Code Marketplace y Open VSX desde su primer release, con el mismo pipeline.
6. **Playwright: aceptado como dependencia opcional** de `@specatlas/mockups` (mejor emulación móvil y estabilidad en CI); `cdp` sigue siendo el default sin dependencias y `none` el fallback de validación estática.
