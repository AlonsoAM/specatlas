# Propuesta: herramienta open source de Spec-Driven Development

> Documento de trabajo · Septiembre 2026
> Base: análisis de AmigoXCD (código y artefactos locales), GitHub Spec Kit, OpenSpec, Kiro, BMAD-METHOD, Tessl, Planu/cc-sdd y comparativas públicas 2026.
> Arquitectura técnica detallada: [`ARQUITECTURA.md`](ARQUITECTURA.md).

---

## 1. Resumen ejecutivo

Existe un hueco claro en el ecosistema SDD: **ninguna herramienta abierta combina rigor profesional (trazabilidad y gates verificables), funcionamiento real en cualquier stack y en proyectos que ya existen (brownfield), y adaptabilidad al tamaño de la tarea.**

- **Spec Kit** es portable y agnóstico de agente, pero es *spec-first* (la spec no gobierna después), pensado para greenfield, con verificación delegada al humano y ceremonia fija (demasiado para un bugfix).
- **OpenSpec** resuelve brownfield con deltas y specs vivas, pero su validación es estructural, el drift se corrige a mano y no exige trazabilidad requisito→tarea→prueba.
- **Kiro** tiene EARS y gates excelentes, pero vive dentro de AWS y cobra por crédito.
- **BMAD** es un equipo de agentes completo, caro y pesado para el 80 % del trabajo real.
- **Tessl** apunta a *spec-as-source*, aún inmaduro y propietario.
- **AmigoXCD** (herramienta interna) es, de lejos, la más madura en mecanismos de ingeniería (trazabilidad forzada por script, waves paralelas, gates por exit code, carril express, verificación con evidencia, peer review multi-modelo, métricas de tokens, doctor, perfiles de stack, auditoría en `.runs/`), pero está acoplada a la empresa: ClickUp como gate de aprobación, SQL Server/estándares AgroMigiva, español obligatorio, distribución privada, licencia UNLICENSED.

**Propuesta:** construir una herramienta open source (MIT), CLI-first y agent-agnóstica, que sea el **kernel determinista** del proceso SDD — un "compilador de proceso" que valida, traza y bloquea con código, mientras el agente de IA (opencode, Claude Code, Codex, Cursor, Copilot, Gemini…) solo escribe contenido y ejecuta tareas. Specs vivas con deltas + carriles adaptativos + trazabilidad ejecutable + adopción de código existente + perfiles de stack extensibles.

Tres capacidades que la hacen única en su categoría:

- **Especificaciones 100 % funcionales y de negocio**: lo que se le presenta y aprueba el usuario no contiene tecnología; el plan técnico es otro artefacto que nunca se le presenta.
- **Mockups profesionales para frontend/mobile**: contrato visual de alta fidelidad (design system, estados, responsive, a11y, datos reales) generado y validado antes de construir, firmado en la aprobación y comparado en la verificación.
- **Extensión de VS Code con LSP de specs**: visualización completa (matriz de trazabilidad, board, delta view, visor de mockups) y acción dentro del editor — lo determinista dentro de la extensión, lo asistido por IA abriendo el agente con el prompt compilado.

Nombre: **SpecAtlas** (bins publicados `specatlas` + `satlas`) — decisión y disponibilidad verificada en la sección 7.1.

---

## 2. Objetivo y principios de diseño

**Objetivo:** que un equipo pueda aplicar SDD profesional (con gates reales, no prompts) en *cualquier* proyecto — lenguaje, base de datos, arquitectura, tracker, agente de IA — sin migrar su stack ni casarse con un proveedor.

Principios (los no-negociables del diseño):

1. **Lo verificable es código, no prosa.** Si algo se puede chequear (esquema, trazabilidad, DAG de tareas, drift, gates, conteos), vive en el kernel con exit codes. Los prompts nunca son el mecanismo de enforcement. (Lección central de AmigoXCD: *"scripts as gates, prose as suggestion"*.)
2. **Las specs son la fuente de verdad viva.** No `spec.md` por feature que se abandona: specs por dominio que evolucionan con deltas `ADDED/MODIFIED/REMOVED/RENAMED` que se pliegan al archivar. (OpenSpec.)
3. **Trazabilidad ejecutable de extremo a extremo.** `REQ` → escenario → tarea (`Covers:`) → prueba etiquetada → evidencia registrada. Verificada por CLI en cada corrida y en CI.
4. **Carriles adaptativos, un solo motor.** `fix` (1 artefacto) / `standard` (spec→plan→tasks→build→verify) / `full` (+analyze, review, docs). El proceso se dimensiona por riesgo y tamaño; jamás "cascada para un typo".
5. **Brownfield-first.** Adoptar un repo existente debe ser una función de primera clase (`satlas adopt`), no un tutorial. Anclaje al código real (inventario AS-IS, blast radius, matriz de paridad para refactors sustitutivos).
6. **Agnóstico de agente y de stack.** Una sola fuente de prompts se *compila* a las convenciones de cada agente (skills/commands/rules). Perfiles de stack autodetectados y extensibles por la comunidad; fallback genérico siempre presente.
7. **Local-first y sin lock-in.** Todo vive en el repo (`.sdd/`), versionable con git. Sin SaaS obligatorio, sin tracker obligatorio, sin API keys obligatorias. Integraciones = adaptadores opcionales.
8. **Auditable y reanudable.** Cada corrida deja eventos en disco; cualquier fase se puede pausar/retomar; el estado se deriva de los artefactos, nunca de la memoria del chat.
9. **El humano decide en los gates.** Aprobar, mergear y publicar son actos humanos registrados (firma + fecha en el artefacto o vía provider).
10. **Negocio primero, tecnología después.** La spec que se presenta y aprueba se escribe en lenguaje de negocio y es 100 % funcional; el "cómo" vive en el plan técnico, que es interno y trazable a la spec.
11. **El mockup es un contrato, no un adorno.** En frontend/mobile, no hay aprobación sin mockup profesional: alta fidelidad, design system, estados, responsive, accesible y validado en navegador real.
12. **El editor es una interfaz de primera clase.** Quien no quiera usar la terminal debe poder ver, validar, firmar y avanzar desde VS Code, sin perder ninguna capacidad del flujo.
13. **Español por defecto.** `language: es` es el valor inicial y todo el contenido generado (spec, proposal, plan, tasks, deltas, verify, review, docs, mockups, presentación, UI/CLI) se escribe en español. El inglés se activa explícitamente con `language: en` o por una petición concreta; nunca por defecto ni mezclado.

---

## 3. Estado del arte: qué existe y qué tomamos

### 3.1 Tabla comparativa (foco: mecanismos)

| Dimensión | Spec Kit | OpenSpec | Kiro | BMAD | Tessl | AmigoXCD (interno) | **SpecAtlas (propuesto)** |
|---|---|---|---|---|---|---|---|
| Licencia | MIT | MIT | Propietario | MIT | Propietario | UNLICENSED (privado) | **MIT** |
| Superficie | CLI + slash commands | CLI + slash commands | IDE + CLI | Framework multi-agente | Plataforma | Plugin + CLI + IDE panel | **CLI + adaptadores + MCP opcional** |
| Modelo de spec | Por feature, estática | Viva por dominio + deltas | 3 docs estáticos (EARS) | PRD/arquitectura/stories | Spec-as-source | Funcional v3 + plan + tasks | **Viva + deltas + archive fold** |
| Trazabilidad REQ→tarea→prueba | No forzada | No | tasks↔requisitos (visual) | Parcial | 1:1 spec/código | **Forzada por script** | **Forzada por CLI + CI** |
| Gates reales (exit code/hook) | No | `validate` estructural | Hooks de IDE | No | Desconocido | **Sí (hooks + scripts)** | **Sí (CLI + hooks + CI)** |
| Carriles por tamaño/riesgo | No (1 flujo) | Flujo corto por diseño | No | No | No | **Spec vs Fix express** | **fix / standard / full** |
| Brownfield | Débil | Bueno | Medio | Débil | N/D | **Fuerte (AS-IS + paridad)** | **Fuerte (`satlas adopt` + anclaje)** |
| Stack-agnóstico | Sí (sin perfiles) | Sí (sin perfiles) | Amazon-first | Sí | Sí | Perfiles (empresa) | **Perfiles + autodetección + fallback** |
| Agnóstico de agente | ~30 agentes | ~30 agentes | Solo Kiro | Multi-IDE | No | Solo Claude Code | **Adaptadores compilados** |
| Verificación con evidencia | No | Advisory | Tests por hooks | QA agent | No | **`.http`/Playwright/SQL + evidencia** | **Matriz por perfil + evidencia** |
| Review adversarial | No | No | No | No | No | Sí (multi-modelo) | **Sí (un solo agente, sin 2.º modelo)** |
| Docs generadas (técnica + manual) | No | No | No | Sí (artefactos) | No | **Sí (PDF/HTML)** | **Sí (markdown + export)** |
| Métricas de costo/tokens | No | No | Créditos | No | No | **Sí (jsonl local)** | **Sí (opt-in, local)** |
| Tracker-agnóstico | Sí (no lo usa) | Sí | AWS-native | Sí | No | **No (ClickUp obligatorio)** | **Sí (adaptadores)** |
| i18n | Solo inglés | Multi-idioma (docs) | Inglés | Inglés | Inglés | Solo español | **español por defecto; inglés opcional** |
| Spec para negocio (sin tecnología) | No | No | Parcial (EARS) | Parcial (PRD) | No | Sí (funcional v3) | **Sí + linter de negocio + export presentable** |
| Mockups profesionales (web/mobile) | No | No | No | No | No | Sí (básico, con agente) | **Sí (pipeline con calidad verificable + gate)** |
| UI en el editor / LSP de specs | No | No | IDE propio (cerrado) | No | No | Extensión VS Code privada | **VS Code + Open VSX + LSP + matriz + board** |

### 3.2 Qué tomamos de cada herramienta

**De Spec Kit**
- La secuencia clara `constitution → specify → clarify → plan → checklist → tasks → analyze → implement → converge` y sus nombres (ya instalados en el músculo de los equipos).
- La **constitución** como reglas inmutables del proyecto, con jerarquía de autoridad (constitución > spec aprobada > plan > tareas > código).
- El **gate de clarificación** antes de planificar y los **checklists como "unit tests de los requisitos"**.
- `converge`: la verificación de completitud contra spec/plan/tasks que re-alimenta tareas.
- La portabilidad: markdown plano versionado, integraciones para muchos agentes.

**De OpenSpec**
- Specs **vivas por dominio** como única fuente de verdad, con **deltas** y **archive** que pliega el cambio.
- La semántica de 4 operaciones: `ADDED / MODIFIED / REMOVED / RENAMED` y la regla de que MODIFIED copia el bloque completo.
- El flujo corto por defecto (`explore → propose → apply → sync → archive`) y la separación CLI (determinista) vs chat (agente).
- La idea de **perfiles de workflow** configurables y los schema-driven artifacts.

**De Kiro**
- **EARS** como sintaxis opcional de requisitos testeables (`WHEN … THE SYSTEM SHALL …`) y la exigencia de escenarios verificables.
- El gating requisitos→diseño→tareas con trazabilidad por tarea.
- *Steering files* (contexto permanente) y hooks de evento como automatización.
- La lección de UX: si hay demasiada ceremonia fija, no se usa en el día a día.

**De BMAD**
- La idea de **roles/agentes especializados** (analista, arquitecto, dev, QA) pero como *expansion packs* opcionales, no como única vía.
- La separación estricta de contextos por rol (cada agente recibe solo lo que necesita).

**De Tessl**
- La ambición de **spec anclada al código** (anclas verificables spec↔archivo/símbolo) y un **registro público de templates/perfiles** por dominio.

**De AmigoXCD (lo más valioso; se reimplementa, no se copia)**
| Mecanismo | Cómo se generaliza en SpecAtlas |
|---|---|
| Trazabilidad `H#` → `H#-E#` → `Cubre:` → matriz → tests | `REQ-*` → escenarios → `Covers:` → tests etiquetados → `satlas trace --check` |
| Scripts como gates (waves, trace, archive-sync) | `satlas validate/analyze/trace/ci` con exit codes 0/1/2 |
| Carril express para incidentes (`fix`) | carril `fix` de primer nivel, con su propio artefacto y gates reducidos |
| Perfiles de stack con detección determinista por scoring y fallback | motor de detección `(archivos×2 + manifests×3)`, prioridad, dominios, `generic` siempre |
| Waves paralelas con guarda de colisión de archivos | `satlas waves` (Kahn + colisiones + máx. paralelo configurable) |
| Runs append-only en disco (reanudable, auditable) | `.sdd/runs/<id>/{state.json,events.jsonl}` |
| Aprobación externa como gate | providers pluggables: archivo firmado (default), PR review, GitHub/Jira/Linear/ClickUp |
| Verificación con evidencia real por stack | matriz de validación por perfil; `verify.md` con comando + salida + timestamp |
| Review adversarial (lentes + verificador que solo degrada con evidencia `file:line`) | `satlas review` con tiering por tamaño del diff; una sola pasada, sin segundo modelo |
| Métricas tokens/costo por spec y fase | hook/adaptador opt-in → `.sdd/metrics/*.jsonl` + `satlas metrics` |
| Doctor (drift frontmatter↔checkboxes, estados imposibles) | `satlas doctor` con códigos estables + sugerencias |
| Extractos de constitución por capa (ahorro de tokens) | `sections` en la constitución; el compilador entrega solo el extracto relevante |
| Estado derivado en un core compartido (CLI/IDE) | kernel único: `deriveLifecycle`, `nextPhase`, `parseTasks` |
| Anclaje al código AS-IS + matriz de paridad | `satlas adopt` + `Parity:` en el plan de refactors sustitutivos |
| Migraciones versionadas con rollback | `satlas migrate` con backup y dry-run |
| Mockup interactivo obligatorio para UI (agente con navegador, HTML autocontenido, validado en browser, con banner) | `satlas mockup` con pipeline profesional (2 niveles, tokens, estados, a11y, screenshots, gate firmado) |
| Dashboard VS Code (árbol de specs, botones de fase, aprobaciones, runs en vivo, doctor en Problems, visor de documentos) | Extensión VS Code + Open VSX con LSP de specs, matriz de trazabilidad, board y firmas |

---

## 4. Los problemas sin resolver que atacamos

1. **Drift spec↔código.** Todos los OSS lo reducen, ninguno lo monitorea. → Anclas de spec + `satlas ci --drift` (advisory por defecto, estricto configurable).
2. **Verificación de conformidad.** "Pasan los tests" no es "cumple la spec". → Evidencia por escenario (`REQ-…` verificado con comando y salida), no por suite.
3. **Ceremonia no adaptativa.** Un flujo para todo = no se usa. → Carriles `fix/standard/full` con gates proporcionales.
4. **Brownfield de segunda clase.** → `satlas adopt` como función central, no un apéndice.
5. **Enforcement por prompt.** → Kernel determinista; el agente propone, el CLI dispone.
6. **Gate de aprobación propietario** (ClickUp/Kiro). → Providers de aprobación pluggables; default 100 % local.
7. **Lock-in de stack.** → Perfiles extensibles + `generic` + fixtures multi-stack en CI como prueba.
8. **Lock-in de agente.** → Compilador de adaptadores desde una sola fuente de prompts.
9. **Sin métricas.** No se puede mejorar el proceso sin medirlo. → Métricas locales opt-in (tokens/costo/tiempo/rework) + `doctor` + `status`.
10. **Portabilidad de artefactos entre herramientas.** → `satlas import` (Spec Kit / OpenSpec / AmigoXCD-like) y export a markdown plano siempre.
11. **La spec no se le puede mostrar al negocio.** Casi todas las herramientas escriben specs para programadores (tecnología, archivos, endpoints). → Spec 100 % funcional en lenguaje de negocio + plan técnico separado + linter de negocio.
12. **Los mockups son pobres o inexistentes.** Cuando existen, son wireframes aburridos o HTML genérico con datos falsos, que no permiten decidir. → Pipeline de mockups profesionales con estándar de calidad verificable y gate de aprobación.
13. **No se puede trabajar desde el editor.** Spec Kit y OpenSpec viven en la terminal; Kiro exige un IDE propio. → Extensión VS Code + Open VSX con LSP de specs, matriz de trazabilidad, board, firmas y acciones, reutilizando el mismo kernel.

---

## 5. La propuesta

### 5.1 Posicionamiento

> **SpecAtlas es el kernel determinista del SDD: specs vivas, trazabilidad ejecutable y gates reales para cualquier stack, cualquier agente y cualquier proyecto — incluido el que ya existe.**

Tres frases de identidad:

- **"El proceso se verifica, no se confía."** Todo gate es un exit code.
- **"Un solo motor, tres velocidades."** fix / standard / full.
- **"Tu repo, tus specs, tu agente."** Local-first, MIT, sin SaaS.

### 5.2 Arquitectura de capas

```text
┌────────────────────────────────────────────────────────────────────┐
│                        AGENTES (cualquiera)                        │
│  opencode · Claude Code · Codex · Cursor · Copilot · Gemini CLI   │
│  consumen: skills/comandos compilados + MCP (opcional)            │
│  + EXTENSIÓN VS CODE / Open VSX (UI humana + LSP de specs)        │
└───────────────▲────────────────────────────────────▲───────────────┘
                │ lee/escribe artefactos .sdd/        │ consulta estado
┌───────────────┴────────────────────────────────────┴───────────────┐
│                 COMPILADOR DE ADAPTADORES (build-time)             │
│  una fuente de prompts (workflow/*.md + schemas) → N formatos     │
│  golden tests por target para detectar cambios de formato          │
└───────────────▲────────────────────────────────────────────────────┘
                │
┌───────────────┴────────────────────────────────────────────────────┐
│                        CLI `satlas` (Node ≥20, TS)                    │
│  init · adopt · new · status · next · validate · trace · analyze  │
│  waves · run · verify · review · docs · archive · doctor · ci     │
│  metrics · profile · import/export · migrate · mcp                │
└───────────────▲────────────────────────────────────────────────────┘
                │
┌───────────────┴────────────────────────────────────────────────────┐
│                    KERNEL (librería determinista)                  │
│  schemas (zod) · parsers (frontmatter/tasks) · lifecycle machine  │
│  trace engine · wave planner · drift/anchor checker · validators  │
│  migrations · runs store · metrics store · security primitives    │
└───────────────▲────────────────────────────────────────────────────┘
                │
┌───────────────┴────────────────────────────────────────────────────┐
│                ESTADO EN EL REPO (`.sdd/`, versionado)             │
│  constitution · profiles · specs vivas · changes · archive        │
│  runs · metrics · approvals · index                               │
└────────────────────────────────────────────────────────────────────┘
```

Regla de oro arquitectónica: **el kernel no sabe de IA y los agentes no saben de reglas.** El kernel expone contratos (schemas + comandos + JSON) y los agentes consumen esos contratos vía prompts compilados o MCP.

### 5.3 Modelo de artefactos y estado

```text
.sdd/
├── config.yaml                  # proyecto: idioma, carriles, gates, integraciones
├── constitution.md              # reglas inmutables (jerarquía de autoridad)
├── glossary.md                  # glosario de NEGOCIO (términos que usa el usuario)
├── personas.md                  # actores/roles del dominio y sus permisos
├── decisions/ADR-###.md         # decisiones técnicas trazadas a REQ/cambios
├── profiles/
│   ├── detected.yaml            # resultado de la autodetección (stack + dominios)
│   └── custom/<name>.yaml       # perfiles propios o de la comunidad
├── specs/                       # FUENTE DE VERDAD VIVA, por dominio
│   └── <dominio>/spec.md        # requisitos REQ-* + escenarios (lenguaje de negocio)
├── changes/                     # propuestas en vuelo (una carpeta por cambio)
│   └── <slug>/
│       ├── proposal.md          # el porqué y el alcance (negocio)
│       ├── spec.md              # DELTA: ADDED/MODIFIED/REMOVED/RENAMED
│       ├── plan.md              # cómo (técnico, interno), con trazas, paridad y diagramas
│       ├── tasks.md             # checklist atómico (fuente de verdad del progreso)
│       ├── verify.md            # evidencia por escenario
│       ├── review.md            # hallazgos + decisión humana
│       ├── mockups/             # sketch/ y hifi/ + manifest.yaml + screens/*.png
│       ├── presentation/        # paquete HTML/PDF para el stakeholder (generado)
│       └── docs/                # doc técnica + manual (carril full)
├── changes/archive/2026-09-<slug>/   # historia inmutable
├── runs/<run-id>/{state.json,events.jsonl}
├── metrics/*.jsonl              # opt-in
├── approvals.yaml               # firmas humanas (artefacto + hash + quién/cuándo)
├── templates/                   # plantillas editables (es por defecto; variante en opcional)
└── INDEX.md                     # mapa de specs y cambios
```

Regla de idioma: **todo el contenido se genera en español por defecto** (`language: es`): `specs/`, `proposal.md`, `plan.md`, `tasks.md`, deltas, `verify.md`, `review.md`, mockups, presentación y documentación. Con `language: en` se genera en inglés; nunca se mezcla ni se usa inglés sin que la configuración o una petición explícita lo indiquen.

Regla de audiencia: `specs/`, `proposal.md`, `mockups/` y `presentation/` se escriben en **lenguaje de negocio**; `plan.md`, `review.md` y `decisions/` son técnicos. El linter impide que la tecnología se filtre en los primeros.

Diferencias clave con lo existente:
- **`.sdd/` se versiona con git por defecto** (a diferencia de AmigoXCD). Modo `--local` disponible para quien no quiera versionar (`.gitignore` gestionado por `satlas init --local`).
- **`tasks.md` con gramática canónica** parseable: `- [ ] T1.2 <acción> · Files: … · Covers: REQ-… · Depends: T1.1 · Rollback: …`.
- **Frontmatter validado por esquema** (versión por tipo de artefacto, `spec_version`, `plan_version`, `tasks_version`) con migraciones automáticas.

### 5.4 Trazabilidad ejecutable (el corazón)

```text
spec viva                      change delta                plan/tasks                 verificación
REQ-AUTH-001 ──► REQ-AUTH-001-S1 ──► [T3.1 Covers: REQ-AUTH-001-S1] ──► test @req:REQ-AUTH-001-S1
                                                                              │
                                                                              ▼
                                                                   verify.md: comando + salida
                                                                   + fecha + autor (evidencia)
```

`satlas trace --check` falla (exit 1) si:
- un `REQ` no tiene ninguna tarea que lo cubra;
- una tarea referencia un `REQ` inexistente o de otro dominio;
- un escenario no tiene evidencia en `verify.md` (en carril full/standard);
- hay evidencia sin escenario (huérfana);
- el delta `MODIFIED` no copió el bloque completo del requisito (pérdida silenciosa de detalle al archivar).

Y `satlas ci` ejecuta todo lo verificable en pipeline: `validate --strict` + `trace --check` + `waves` + drift + gates de carril. Sin agente, sin API keys.

### 5.5 Ciclo y carriles

```text
CARRIL FIX (bug/hotfix/config)     CARRIL STANDARD (feature normal)      CARRIL FULL (riesgo alto/regulado)
──────────────────────────────     ─────────────────────────────────     ──────────────────────────────────────────
fix.md (1 artefacto)               spec → clarify → plan+tasks           spec → clarify → plan+tasks → analyze
  └─ build dirigido                  └─ build en waves                     └─ build → verify → review
     verify express                     verify por escenario                  → docs
        └─ archive                         └─ archive (fold deltas)               └─ archive
```

- El carril se **sugiere determinísticamente** (tipo de solicitud, riesgo, archivos tocados, etiquetas del tracker) y el humano lo confirma/promueve. Un fix siempre se puede promover a standard sin perder trabajo.
- El carril no cambia el motor: cambia qué artefactos y gates exige `satlas next`.

### 5.6 Superficie CLI (contrato estable)

| Comando | Qué hace | Exit codes |
|---|---|---|
| `satlas init` | Scaffold `.sdd/`, detecta stack, borrador de constitución, compila adaptadores | 0/1 |
| `satlas adopt [--domain X]` | Brownfield: inventario AS-IS, specs baseline recuperadas con el agente, índice | 0/1 |
| `satlas new <slug> [--lane fix\|standard\|full]` | Crea el cambio con su delta y metadatos | 0/1 |
| `satlas status [--json]` / `satlas next [spec]` | Estado derivado y siguiente acción concreta | 0/1 |
| `satlas validate [--strict]` | Schemas + linter de specs (atomicidad, GWT/EARS, palabras vagas, deltas) | 0/1 |
| `satlas trace [--check] [--json]` | Grafo de trazabilidad y detección de huecos | 0/1/2 |
| `satlas waves [--max-parallel N] [--json]` | DAG → olas paralelas con guarda de colisiones | 0/1/2 |
| `satlas run start\|event\|status\|show` | Persistencia y auditoría de ejecución | 0/1 |
| `satlas verify --record` | Captura evidencia por escenario (comando + salida) | 0/1 |
| `satlas review` | Review de código: lentes por tamaño del diff + verificación adversarial de hallazgos (un solo agente) | 0/1 |
| `satlas docs [tecnica\|manual\|all]` | Genera documentación desde plantillas y evidencia | 0/1 |
| `satlas mockup <slug> [--level sketch\|hifi] [--platform web\|mobile\|desktop]` | Genera mockups profesionales + validación (a11y, responsive, estados) + screenshots | 0/1 |
| `satlas present <slug>` | Paquete de propuesta navegable (spec de negocio + mockups + criterios de aceptación) | 0/1 |
| `satlas approve <artefacto> --by <nombre>` | Firma el artefacto con hash y fecha (gate de aprobación) | 0/1 |
| `satlas amend <slug>` | Revisión de alcance firmada sobre un cambio ya aprobado | 0/1 |
| `satlas impact <REQ>` | Blast radius: specs, código y tests afectados | 0/1 |
| `satlas env` | Prepara entorno efímero de verificación detectado del repo (con guardas) | 0/1 |
| `satlas archive <slug>` | Pliega deltas a specs vivas, mueve a archivo, actualiza `INDEX.md` | 0/1 |
| `satlas doctor` | Salud del workspace: drift, estados imposibles, huérfanos, sugerencias | 0/1 |
| `satlas ci` | Gate de pipeline no interactivo (todo lo verificable) | 0/1/2 |
| `satlas metrics` | Reporte local de tokens/costo/tiempo/rework (si hay datos) | 0 |
| `satlas profile detect\|list\|create` | Perfiles de stack | 0/1 |
| `satlas import <speckit\|openspec>` / `satlas export <md\|json\|html>` | Interoperabilidad | 0/1 |
| `satlas mcp` | Servidor MCP: `status`, `next`, `validate`, `trace` (solo lectura) | 0/1 |
| `satlas migrate` | Migraciones de esquema con backup y dry-run | 0/1 |

Convenciones: `--json` limpio (sin color), progreso por stderr, un solo catálogo de comandos que genera toda la ayuda, cero dependencias de runtime (solo Node built-ins + `zod`/`yaml` en el kernel), y comandos testables sin spawnear procesos.

### 5.7 Prompts compilados (una fuente, N agentes)

Fuente única en `workflow/` (fases, plantillas, checklists) + `adapters/` que compila:

| Target | Salida generada |
|---|---|
| **opencode** | `.opencode/skills/satlas-*/SKILL.md` + comandos |
| **Claude Code** | plugin con `skills/`, `commands/`, `agents/`, `hooks/` |
| **Codex CLI** | prompts `$satlas-*` + `AGENTS.md` |
| **Cursor / Copilot / Windsurf** | commands/rules en los formatos de cada uno |
| **Gemini CLI / otros** | commands o skills |
| **Genérico** | `AGENTS.md` + prompts markdown (escape hatch universal) |

Comandos de chat (nombres compatibles con Spec Kit para migración suave):
`/satlas.adopt`, `/satlas.specify`, `/satlas.clarify`, `/satlas.plan`, `/satlas.tasks`, `/satlas.analyze`, `/satlas.build`, `/satlas.verify`, `/satlas.review`, `/satlas.docs`, `/satlas.archive`, `/satlas.next`, `/satlas.fix`.

Cada adaptador tiene **golden tests** (se compila, se compara byte a byte) para que los cambios de formato de cada agente se detecten en CI, no en producción. El idioma del contenido lo fija `language` (**es por defecto**) y cada prompt compilado lo declara explícitamente.

### 5.8 Perfiles de stack (cualquier lenguaje, cualquier BD)

Contrato de perfil (YAML, validado por esquema, idéntico en espíritu al de AmigoXCD pero genérico):

```yaml
name: node-ts-postgres
detection:
  files: ["**/*.ts", "package.json"]
  manifests: [{ file: package.json, contains: ["typescript"] }]
priority: 10
domains: [backend, database]
naming: { files: kebab-case, symbols: camelCase, db: snake_case }
structure: { src: src, tests: tests, migrations: db/migrations }
commands: { build: "npm run build", lint: "npm run lint", test: "npm test" }
verify:
  executable: ["npm test", "httpie ./tests/*.http"]
  fallback: ["grep-based checks"]
rollback: "Revierte migración + feature flag"
antipatterns: ["SQL concatenado", "secrets en repo"]
assumptions: ["Node LTS", "Postgres 15+"]
```

- Detección determinista con scoring y confirmación humana; multi-stack (monorepos) soportado.
- `generic` siempre disponible: sin comandos inventados, validación manual declarada — **nunca bloquea a un stack desconocido, nunca finge conocerlo**.
- Perfiles de la comunidad en un registro (repo `specatlas-profiles`) + `satlas profile create` asistido.

### 5.9 Integraciones pluggables

| Integración | Interfaz | Default |
|---|---|---|
| Aprobación | `approval provider`: archivo firmado (`approvals.yaml` + `satlas approve`), **etiqueta en issue de GitHub (`--from-github`, implementado)**, PR review, Jira/Linear/ClickUp (adaptadores) | Archivo local |
| Tracker | **GitHub Issues (`satlas issue sync`, implementado)**, import/export de tareas; sincronización idempotente opcional (nunca gate) | Ninguno |

| Memoria de proyecto | adaptador MCP (Engram/mem0/similar) o `docs/context/` plano | Contexto plano |
| Anclaje al código | búsqueda nativa del agente; adaptador opcional a un indexador (codegraph, LSP, tree-sitter) | Búsqueda del agente |

Regla: **ninguna integración puede ser requisito para completar el ciclo.** ClickUp, Jira u otro tracker son aceleradores, nunca gates.

### 5.10 CI/CD y anti-drift

```yaml
# .github/workflows/satlas.yml (ejemplo)
name: SDD
on: [pull_request]
jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx specatlas ci --strict   # validate + trace + waves + drift + gates de carril
```

- **Drift check:** compara anclas de spec (rutas/símbolos citados) contra el repo; reporta specs desactualizadas. Advisory por defecto; `--strict` para equipos que quieran bloquear.
- **Conformance:** `verify.md` con evidencia vencida o ausente bloquea PR en carril full.
- Los artefactos en PR se revisan como código: el diff de `spec.md` (delta) es la unidad de revisión de intención.

### 5.11 Métricas y salud (opt-in, locales)

- `metrics/tokens.jsonl`: costo/tokens por spec/fase/origen/modelo (adaptador para los agentes que exponen transcripts; hooks donde existan).
- `metrics/flow.jsonl`: tiempo por fase, rework (tareas reabiertas), tamaño de specs, hallazgos por severidad.
- `satlas doctor`: reglas semánticas con códigos estables (`SDD-LIFECYCLE-001…`, `SDD-TRACE-001…`, `SDD-DRIFT-001…`) y acción sugerida.
- Nada sale de la máquina; sin telemetría.

---

### 5.12 Especificaciones 100 % funcionales y de negocio

**Regla:** la spec que se le presenta al usuario no contiene una sola línea de tecnología. Se escribe en el idioma del negocio y describe comportamiento observable, no implementación. El plan técnico es otro artefacto, interno y trazable a la spec, que nunca se le presenta como propuesta.

**Qué contiene la spec funcional (plantilla):**

1. Contexto y objetivo de negocio: problema, resultado esperado y cómo se mide el éxito.
2. Personas/actores y sus permisos (referenciando `personas.md`).
3. Glosario aplicable al cambio, con los términos tal como los usa el negocio.
4. Requisitos `REQ-<DOMINIO>-<NNN>`: actor, necesidad de negocio, reglas `BR-###`, escenarios `WHEN/THEN` (incluyendo error, vacío, sin permiso, límites y concurrencia), criterios de aceptación medibles, datos de entrada/salida en lenguaje de negocio y fuera de alcance.
5. Requisitos no funcionales medibles (accesibilidad AA, idioma, tiempo percibido, disponibilidad) con valores, no adjetivos.
6. Supuestos, dependencias de negocio y preguntas abiertas que el gate de clarificación debe vaciar.

**Prohibido en la spec funcional (verificado por linter):** nombres de tablas, campos, endpoints, clases o archivos; frameworks, librerías, SQL; diagramas de infraestructura; decisiones de arquitectura; estimaciones de horas. Todo eso pertenece al plan técnico.

**Linter de negocio (`satlas validate --strict`):**

- jerga técnica (lista configurable por proyecto/perfil);
- adjetivos y palabras vagas ("rápido", "fácil", "varios", "óptimo", "robusto", "adecuado");
- criterios no verificables (sin valor observable);
- escenarios sin `THEN`, o varios `WHEN/THEN` mezclados en un mismo escenario (atomicidad);
- requisitos sin actor, sin regla o sin escenario;
- términos usados que no están en el glosario;
- duplicados y contradicciones heurísticas entre requisitos y entre specs vivas.

**Doble audiencia, dos artefactos separados:**

- `spec.md` (negocio): se presenta, se aprueba, se archiva; legible por cualquier stakeholder.
- `plan.md` (técnico): interno del equipo; no sustituye ni edita la spec.
- `satlas present <slug>`: genera el paquete de propuesta navegable (HTML/PDF con branding del proyecto) que contiene la spec funcional, los mockups y los criterios de aceptación, con control de versiones visible ("v3, cambios respecto a v2").

**Aprobación con firma:** `approvals.yaml` registra `{artefacto, versión, hash, aprobador, fecha, canal}`. Cualquier modificación posterior cambia el hash, invalida la firma y `satlas status` vuelve a poner el gate en pendiente. Nunca hay auto-aprobación.

### 5.13 Mockups profesionales (frontend y mobile)

**Regla:** en cambios con dominio `frontend` o `mobile`, el mockup es parte de la propuesta que se le presenta al usuario y **contrato visual** que la implementación debe respetar. No es decoración: es el artefacto que permite aprobar con los ojos.

Dos niveles:

- `sketch` (baja fidelidad, desechable): pantallas clave para alinear historia y alcance; rápido, sin sistema de diseño.
- `hifi` (alta fidelidad, archivado y aprobado): contrato visual con design system, estados, datos reales y calidad de producto.

**Pipeline `satlas mockup <slug> [--level sketch|hifi] [--platform web|mobile|desktop]`:**

1. **Entradas:** la spec funcional (`REQ` + escenarios), el glosario (datos realistas del dominio), los design tokens del proyecto (`DESIGN.md`/`tokens.json`) o un tema profesional neutral si no existen, y las convenciones visuales del perfil de stack.
2. **Generación** (agente con navegador): HTML autocontenido multi-pantalla, navegable entre pantallas, sin dependencias externas (fuentes e imágenes embebidas cuando corresponda).
3. **Calidad obligatoria**, validada en navegador real antes de entregar:
   - responsive real (móvil/tablet/desktop en web; safe areas y tab bar en mobile);
   - estados completos: default, hover/focus, loading, vacío, error, sin permiso y offline cuando aplique;
   - tema claro/oscuro si el perfil lo exige;
   - accesibilidad: contraste AA verificado, foco visible, áreas táctiles ≥ 44 px, jerarquía semántica;
   - datos realistas del dominio (nunca `Lorem ipsum` ni "Item 1/2/3"), cifras, fechas y nombres coherentes con el glosario;
   - densidad y jerarquía tipográfica profesionales; sin gradientes/íconos genéricos por defecto; el diseño sigue el sistema del proyecto o un tema premium definido.
4. **Evidencia y adjuntos:** screenshots por pantalla y breakpoint (`mockups/screens/*.png`), galería `gallery.html` y `mockups/manifest.yaml`:

   ```yaml
   screens:
     - id: dashboard-riesgos
       title: Panel de riesgos
       illustrates: [REQ-RIESGO-001-S1, REQ-RIESGO-002-S1]
       breakpoints: [390, 768, 1440]
       themes: [light, dark]
       states: [default, loading, empty, error]
   ```

5. **Trazabilidad:** cada pantalla declara `Illustrates: REQ-...`; el linter avisa si hay requisitos de UI sin mockup (carril standard/full con dominio frontend/mobile).
6. **Aprobación:** el mockup se firma como cualquier artefacto; si cambia, la firma se invalida y exige re-aprobación.
7. **Verificación:** en carril full, `satlas verify` captura screenshots de la implementación (runner del perfil: Playwright, emulador, etc.) y los pone lado a lado con el mockup aprobado para revisión humana; diff visual con umbral como apoyo opcional.

**Mobile específico:** device frames (iOS/Android), navegación real (tabs, back), teclado y safe areas, patrones offline-first visibles (sincronización, outbox) y pantallas de permisos del sistema.

**Reglas anti-mockup-pobre:** banner fijo `MOCKUP · NO FUNCIONAL · vX · fecha`; prohibido entregar sin estados ni responsive; prohibido no seguir los design tokens del proyecto cuando existen; el mockup nunca contiene lógica real.

### 5.14 Extensión de VS Code: visualizar y trabajar sin salir del editor

**Filosofía: la extensión es la UI del kernel, no un cliente del agente.** Todo lo determinista (leer, validar, trazar, firmar, exportar, capturar screenshots) ocurre dentro de la extensión; todo lo que necesita IA abre el agente en una terminal con el prompt compilado.

**Visualización:**

- Árbol `SpecAtlas`: specs vivas por dominio y changes por fase, con estado, progreso y **próxima acción**; nodos de mockups, decisiones y glosario.
- Vista de spec con **render amigable**: markdown estilizado (tablas, callouts, listas de tareas), bloques de código con resaltado de sintaxis, nombre de archivo, números de línea opcionales y botón copiar, y mermaid renderizado; requisitos plegables y escenarios con su estado de evidencia.
- **Vista del plan técnico**: secciones y diagramas mermaid (E/R, flujo, secuencia, estados, clases, arquitectura) con zoom/pan y export PNG, más los avisos `LINT-PLN-*` cuando falta un diagrama requerido.
- **LSP propio de specs (`.sdd/**`)**: diagnósticos inline para frontmatter inválido, `Covers:`/`Depends:` rotos, `REQ` duplicado o inexistente, delta `MODIFIED` incompleto, jerga técnica o palabras vagas en spec funcional, escenario sin `THEN`, requisito sin escenario, `Illustrates:` sin `REQ`. Con CodeLens ("2 tareas · evidencia 1/2"), hover con el detalle del `REQ` y navegación a definición/referencias entre spec, tasks, verify y mockup.
- **Matriz de trazabilidad interactiva** (`REQ` × tarea × prueba × evidencia), huecos en rojo, click navega al artefacto.
- **Delta view**: diff semántico entre la spec viva y el delta del change.
- **Board y timeline** por fase (spec → approve → plan → build → verify → review → docs → archive).
- **Visor de mockups** con device frame, breakpoints, tema claro/oscuro, galería de screenshots y botón "Aprobar mockup".
- **Problems panel** alimentado por `doctor` + linter + trace + drift, con acciones sugeridas.
- **Status bar**: fase activa, próximo paso, deltas sin archivar y alertas de contexto/tokens.
- **Dashboard de métricas local**: tiempo por fase, rework, costo/tokens y tamaño de specs.

**Interacción (determinista vs asistida):**

- **Acciones deterministas en la extensión** (sin IA, sin red): inicializar, validar, doctor, trace, waves, crear change, marcar tareas, registrar evidencia, firmar/aprobar (escribe `approvals.yaml`), archivar, generar el paquete de presentación, capturar screenshots de mockups, importar/exportar y correr `satlas ci` local.
- **Acciones con agente**: especificar, clarificar, planificar, construir, verificar, review y docs. La extensión abre una terminal con el agente configurado (`specatlas.agentCommand`, p. ej. `opencode run`, `claude -p`) y el prompt compilado; una terminal por fase y por spec para no arrastrar contexto (lección de AmigoXCD), con confirmación de cada bloque de build.
- **Aprobaciones**: firmar desde el editor con nombre y fecha; la firma desbloquea la fase siguiente y queda auditada.

**Arquitectura y distribución:**

- La extensión importa `@specatlas/core` en proceso (mismo kernel que el CLI; cero duplicación) y no depende de la red.
- Lógica en módulos puros sin `require('vscode')` para poder testearla (patrón probado en AmigoXCD).
- Publicación en **VS Code Marketplace y Open VSX** (a diferencia del `.vsix` privado de AmigoXCD), bajo la misma licencia MIT.
- Opcional: `satlas mcp` expone `status`, `next`, `validate` y `trace` por MCP para cualquier agente, con o sin extensión.

**MVP incremental de la extensión:** F1: árbol + visor markdown/mermaid + Problems (validate/doctor) + visor de mockups. F2: LSP + matriz de trazabilidad + board + firmas + acciones de agente. F3: métricas + delta view + comparación de screenshots en verify.

### 5.15 Más mejoras de alto valor

**Producto y alcance**

- Estimación estructurada (talla, confianza, supuestos) en lugar de horas prometidas; visible en la propuesta.
- Score de calidad de spec (completitud, ambigüedad, testeabilidad, cobertura de error/NFR) con semáforo en `satlas status` y en VS Code.
- **Comprehension gate**: antes de aprobar, el agente hace 3-5 preguntas sobre el cambio para verificar que el aprobador lo entendió, más un resumen ejecutivo "¿esto es lo que pediste?" (anti aprobación a ciegas).
- `satlas amend`: los cambios de alcance sobre algo aprobado se hacen como revisión firmada; nunca edición silenciosa.
- Packs de cumplimiento (implementado: `seguridad`, `datos`, `auditoria`, `accesibilidad` y packs propios por proyecto) que añaden controles deterministas como gate en `satlas ci`.
- Baseline de NFRs por perfil (a11y AA, latencia percibida, i18n, seguridad) con valores medibles.
- Registro de decisiones (`decisions/ADR-###.md`) vinculadas a los cambios y a sus `REQ`/`BR`, separadas de la spec de negocio.
- Detección de requisitos duplicados o contradictorios entre specs vivas, con sugerencia de fusión.
- Multi-repo (`satlas link`) para specs compartidas entre repos (monorepo y polyrepo).
- i18n de negocio: una única fuente, export traducido para stakeholders.

**Ingeniería y verificación**

- Diagramas obligatorios en el plan técnico según el tipo de cambio (E/R si toca datos, secuencia si hay integración/API/jobs, flujo si hay proceso de negocio, estados si hay máquina de estados, arquitectura si hay módulos nuevos), en mermaid, renderizados en VS Code y en el paquete de presentación; `LINT-PLN-001/002` los exige y valida.
- Contract testing: si el plan toca APIs, generar el contrato (OpenAPI/GraphQL) y verificarlo (Spectral/Schemathesis) como evidencia.
- Entornos efímeros de verificación (`satlas env`) detectados del repo (docker-compose), con guardas de seguridad.
- Blast radius (`satlas impact REQ-...`): specs, archivos y tests afectados, usando el indexador del agente cuando exista.
- Borradores de tests generados desde escenarios (etiquetados `@req:`), revisados por humanos.
- Pre-commit: `satlas validate --changed` y `satlas trace --changed`.
- Worktrees opcionales para paralelizar changes (`satlas worktree`).
- Guardrails de contexto/costo por fase: `satlas next` sugiere sesión nueva cuando el contexto está cargado; límites configurables.
- Sincronización idempotente con trackers (nunca gate) e `satlas import` desde Spec Kit/OpenSpec con dry-run y reporte.

**Equipo y gobernanza**

- Asignación por rol (analista, aprobador, reviewers) registrada en los artefactos.
- Vista de capacidad/WIP por fase (cuántos changes en cada estado).
- Telemetría self-hosted opcional para métricas de equipo (fuera del MVP).
- Plantillas de spec por industria (e-commerce, salud, banca) en un registro público, estilo Tessl.

**Seguridad**

- Allowlist de comandos por perfil, ejecución sin shell, redacción de secretos y resolución segura de paths.
- Política de hooks firmados: los hooks ejecutan código, así que vienen del paquete verificado o del repo con revisión.

## 6. Factores diferenciales (por qué ganaría adopción)

1. **Es el único OSS con gates verificables por código** (exit codes + CI), no por buena voluntad del prompt.
2. **Es el único con trazabilidad forzada requisito→tarea→prueba** y evidencia por escenario.
3. **Es el único brownfield-first con adopción automatizada** (`adopt`) y paridad para refactors sustitutivos.
4. **Carriles adaptativos**: funciona para un hotfix de 20 minutos y para un módulo regulado, sin cambiar de herramienta.
5. **Agnóstico total**: de agente, de stack, de tracker, de idioma, de nube.
6. **Interoperable**: importa de Spec Kit/OpenSpec, exporta a markdown plano, y sus specs son legibles por humanos y agentes.
7. **Métricas locales** que permiten mejorar el proceso con datos.
8. **Mockups profesionales integrados**: el contrato visual nace y se aprueba en el mismo flujo, con estándar de calidad verificable (tokens, estados, responsive, a11y, datos reales) y comparación en la verificación. Ninguna alternativa abierta lo hace.
9. **SDD dentro del editor**: extensión VS Code + Open VSX con LSP de specs, matriz de trazabilidad, board, visor de mockups, firmas y acciones; se trabaja sin terminal y sin regalar el IDE a un proveedor.

---

## 7. Decisiones técnicas

| Decisión | Elección | Justificación |
|---|---|---|
| Licencia | **MIT** | Máxima adopción; permite uso corporativo sin fricción. |
| Lenguaje | **TypeScript sobre Node ≥ 20** (ESM, build con `tsup`) | `npx` como distribución universal; ecosistema JSON/YAML/markdown; mismo runtime que la mayoría de agentes; facilita contribuciones. |
| Dependencias | Kernel: `zod` + `yaml`. CLI: cero runtime deps (Node built-ins) | Binario pequeño, instalación rápida, menos superficie de ataque. |
| Monorepo | `packages/core`, `packages/cli`, `packages/adapters`, `packages/mcp`, `profiles/`, `workflow/`, `docs/` (pnpm workspaces) | El plugin/adaptadores no deben duplicar lógica (error que AmigoXCD arrastra). |
| Tests | `vitest` + `fast-check` (propiedades) + fixtures multi-stack + golden tests de adaptadores | Un solo runner (kernel, CLI, LSP, render y extensión); probar "cualquier stack" es parte del producto. |
| Distribución | npm (`npx specatlas`), binarios standalone después (pkg/bun compile) | Fricción cero; sin registry privado. |
| Esquemas | versionados (`spec_version`, `plan_version`, `tasks_version`) + migraciones | Evolución sin romper repos. |
| Seguridad | `execFile` (sin shell), allowlist de hooks, redacción de secretos, resolución de paths anti-traversal | Lecciones directas de AmigoXCD. |
| i18n | **`language: es` por defecto** (templates, prompts y todo artefacto generado: spec, plan, tasks, deltas, verify, review, docs, mockups, presentación); `en` opcional y explícito | El español es el idioma de trabajo; el inglés se activa por configuración o pedido, nunca por defecto. |
| Nombre/binario | **SpecAtlas**, bins publicados `specatlas` + `satlas` (ver 7.2) | Elegido en 7.1; `specforge`, `specrail`, `specpilot`, `specflow`, `speckit` y el paquete npm llamado sdd ya existen y no se tocan. |

### 7.1 Nombres: shortlist con disponibilidad verificada (2026-09-15)

| Nombre | npm | GitHub (handle) | Concepto | Comentario |
|---|---|---|---|---|
| **SpecAtlas — ELEGIDO** | libre | libre | Atlas = mapa de specs y trazabilidad | Único con ambos libres; encaja con "mapa de requisitos" |
| **SpecCharter** | libre | libre | Carta fundacional (constitución + aprobación) | Ambos libres; comunica gobernanza |
| SpecWeaver | libre | ocupado | Teje spec y código | Fuerte como marca; quedó como alternativa |
| **SpecTrail** | libre | s/d | Rastro (trazabilidad) | Comunica el diferencial #1 |
| **SpecTrellis** | libre | ocupado | Espaldera que guía el crecimiento | Bonito, menos obvio |
| **SDDKit** | libre | ocupado | Kit de SDD | Descriptivo y buscable; poco inspirador |
| SpecBlueprint | libre | s/d | Plano arquitectónico | Claro, pero "blueprint" está muy usado |
| SpecCompass | libre | s/d | Brújula | Guía antes de construir |
| SpecNest | libre | s/d | Nido del proyecto | Corto y limpio |
| SpecStudio | libre | ocupado | Estudio | Sugiere UI; riesgo de confundirse con un IDE |
| SpecMesh | libre | s/d | Malla | Ya existe el concepto SpecMesh (Kafka) |
| SDDx | libre | s/d | SDD extendido | Corto; el binario `sddx` está libre |
| Traza | libre | ocupado | Rastro (ES) | Español; menos internacional |
| Brújula / Compás | libre (`brujula`, `compas-sdd`) | ocupado | Brújula / compás de dibujo | Bonitos en español; difíciles de tipear para no hispanohablantes |

Descartados por npm ocupado: `specforge`, `specrail`, `specpilot`, `specflow`, `speckit`, `specloom`, `speccraft`, `speccore`, `specsmith`, `specwright`, `specharbor`, `specanchor`, `cairn`, `weft`, `specbridge`, `speculo` (y `planu`, que ya es un producto SDD).

**Decisión (2026-09-15): `SpecAtlas`.** npm y GitHub libres, concepto de "mapa de specs" alineado con trazabilidad. Registrables: paquete npm `specatlas`, organización GitHub `specatlas`, dominio `specatlas.dev` (verificar). Alternativas conservadas por si aparece un impedimento de marca: `SpecCharter`, `SpecWeaver`, `SpecTrail`.

### 7.2 Binario

Existe un paquete npm llamado `satlas` (herramienta abandonada de 2016, "structured data diff") que podría instalar un ejecutable con ese nombre. Por eso **SpecAtlas no usa sdd en absoluto** — ni bin ni alias — y publica **dos bins propios**: `specatlas` (nombre completo) y **`satlas`** (alias corto, libre en npm), ambos del mismo paquete y sin colisión con nada. Alternativas verificadas por si `satlas` diera problemas: `atls`, `sddx`. La interfaz estable es el contrato CLI, no el nombre: `npx specatlas` funciona siempre.

---

## 8. Roadmap

### F0 — Fundaciones (2-3 semanas)
- Monorepo, CI, licencia, docs site mínimo, `CONTRIBUTING`, `CODE_OF_CONDUCT`.
- Kernel: schemas, parsers (frontmatter + gramática de tareas), `deriveLifecycle`, `validate`.
- CLI: `init`, `status`, `next`, `validate`, `doctor` (v1), `--json`.
- Adaptadores: **opencode + Claude Code** (los dos prioritarios), target genérico.
- Perfiles: `generic`, `node-ts`, `dotnet-sqlserver`, `python` (los 4 probados con fixtures).
- Plantillas en español por defecto (variante en inglés opcional) de spec/plan/tasks/deltas.
- **Criterio de salida:** un repo nuevo ejecuta `npx specatlas init` y `/satlas.specify` en menos de 5 minutos.

### F1 — Ciclo completo + propuesta presentable (4-5 semanas)
- `new`, deltas `ADDED/MODIFIED/REMOVED/RENAMED`, `archive` con fold y `INDEX.md`.
- `plan`/`tasks` con gramática canónica; `waves` con DAG y colisiones.
- `trace --check`, linter de specs (negocio + estructura), `analyze` (checks C1..Cn con reporte), carril `fix`.
- `run` (events/jsonl), `verify --record`, `ci` (pipeline no interactivo).
- **Specs de negocio**: glosario, `personas.md`, linter anti-jerga, `satlas present` (paquete HTML/PDF para stakeholder) y firmas (`approvals.yaml`).
- **Mockups**: pipeline `sketch`/`hifi` (`satlas mockup`), validación a11y/responsive/estados, screenshots, galería y manifest con `Illustrates:`.
- **Extensión VS Code mínima**: árbol de specs, visor con código resaltado y diagramas mermaid (plan incluido), Problems (validate/doctor) y visor de mockups; se apoya en el renderizador compartido `@specatlas/render`.
- Review de código con lentes por tamaño del diff y verificación adversarial de hallazgos (un solo agente; sin segundo modelo).
- **Criterio de salida:** dogfooding — el propio desarrollo se gestiona con la herramienta y su CI bloquea PRs con huecos de trazabilidad; una propuesta completa (spec + mockups + criterios) se aprueba firmada sin salir de VS Code.

### F2 — Ecosistema y editor completo (4-5 semanas)
- `adopt` (brownfield) + matriz de paridad + anclaje de specs.
- Adaptadores: Codex, Cursor, Copilot, Gemini CLI, genérico; golden tests.
- **LSP de specs** (diagnósticos, CodeLens, referencias), matriz de trazabilidad, board, delta view, firmas desde el editor y acciones de agente en terminal.
- `satlas mcp` (read-only), `metrics`, `docs` (técnica + manual + export HTML/PDF opcional), `amend`, `impact`, `env`.
- Providers: aprobación por archivo firmado + PR; tracker: GitHub Issues primero.
- Registro de perfiles de la comunidad + `satlas import` (Spec Kit / OpenSpec).
- **Criterio de salida:** 3 repos externos (stacks distintos) completan un ciclo real; un stakeholder no técnico aprueba una propuesta desde el paquete de presentación.

### F3 — v1.0 (continuo)
- Congelar esquemas y contrato CLI (semver estricto), guía de migración.
- Publicación de la extensión en VS Code Marketplace y Open VSX; dashboard de métricas.
- Packs de cumplimiento, contract testing (OpenAPI/GraphQL), multi-repo (`satlas link`).
- Seguridad: revisión externa, política de disclosure, hooks firmados.
- Gobernanza: RFCs, maintainers, expansión i18n, plantillas por industria y expansion packs de roles (estilo BMAD) opcionales.

---

## 9. Validación "funciona en cualquier escenario"

Matriz de fixtures en CI (cada uno con un ciclo completo automatizado en modo simulado):

| Fixture | Demuestra |
|---|---|
| Node/TS + Postgres | stack moderno full-stack |
| Python + Django | otro lenguaje/ORM |
| Go + SQLite | binario compilado, BD embebida |
| .NET + SQL Server | enterprise, stored procedures, sin ORM |
| Java + Spring | monorepo Maven, capas |
| PHP + MySQL | legacy web |
| Ruby + Rails | convención sobre configuración |
| Terraform/IaC | infraestructura como "código" sin tests clásicos |
| dbt/SQL analítico | data/BI |
| Monorepo mixto | multi-stack y dominios |

Además: golden tests de adaptadores, tests de contrato de esquemas, y una prueba de migración de un repo Spec Kit y uno OpenSpec.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Scope creep (querer ser 5 herramientas) | MVP con 4 perfiles y 2 agentes; todo lo demás es adaptador posterior |
| Cambios de formato en agentes | Compilador + golden tests; el target genérico siempre funciona |
| El drift sigue existiendo | Anclas + `ci --drift` advisory→strict + doctor; nunca prometer cero drift |
| Adopción (otra herramienta SDD más) | Quickstart 5 min, importadores, compatibilidad de nombres de comandos, resultados medibles |
| Complejidad percibida | Carril `fix` de una sola hoja como puerta de entrada; `satlas next` como única interfaz mental |
| Sostenibilidad OSS | Gobernanza desde el día 1, good-first-issues, perfiles como contribución de bajo costo |
| IP/propiedad (AmigoXCD es UNLICENSED de la empresa) | Reimplementación limpia de ideas, cero copia de código; lo específico de AgroMigiva queda fuera; el autor es el mismo, alineación formal con la empresa antes de publicar |
| Seguridad (hooks, ejecución) | Sin shell, allowlist, redacción de secretos, paths seguros, sin telemetría |
| Mockups que salgan genéricos ("slop") | Design tokens + checklist de calidad verificado en navegador + revisión humana + ejemplos de referencia por perfil |
| Mantenimiento de la extensión VS Code + LSP | UI delgada sobre un kernel estable; lógica pura testeable sin `vscode`; LSP incremental (esquema/reglas primero); publicación automatizada |
| Sobre-prometer "cualquier stack" | `generic` explícito que declara validación manual, fixtures multi-stack en CI y prohibición de inventar comandos |

---

## 11. Qué NO vamos a hacer

- Nada de SaaS ni de backend obligatorio.
- Nada de tracker obligatorio (ClickUp/Jira/Linear son adaptadores).
- Nada de IDE propio (Kiro) ni de spec-as-source 1:1 (Tessl) en el MVP.
- Nada de telemetría ni de red por defecto.
- Nada de "reemplazar git/CI": la herramienta es un ciudadano más del repo y del pipeline.
- Nada de un flujo único e impuesto: el proceso se adapta, no el usuario.
- No seremos Figma ni una herramienta de diseño: los mockups son propuestas funcionales de alta calidad; si el equipo tiene sistema de diseño, se respeta y se usa.
- No generaremos código de producción desde el mockup en el MVP: es contrato visual, no fuente de verdad del código.
- Nada de auto-aprobación ni de gates saltables en silencio: todo override se registra y se audita.

---

## 12. Próximos pasos

1. **Nombre decidido: SpecAtlas.** Registrar paquete npm, organización de GitHub, dominio y verificación de marca.
2. **Elegir los 2 agentes prioritarios** del MVP (recomendado: opencode + Claude Code, dado este repo).
3. **Congelar el contrato de artefactos** (sección 5.3) y la gramática de tareas.
4. **Bootstrap del monorepo** con F0 (kernel + CLI + 4 perfiles + 2 adaptadores).
5. **Dogfooding desde el día 1**: el propio desarrollo de SpecAtlas se gestiona con `.sdd/`.
6. **Alineación con la empresa** por el origen de las ideas (sin copia de código) antes de publicar.

---

## Anexo A — Mapeo AmigoXCD → SpecAtlas (reimplementación)

| Pieza AmigoXCD | Equivalente genérico | Cambio de diseño |
|---|---|---|
| `phases/spec.md` (entrevista, linter) | `/satlas.specify` + `/satlas.clarify` + `satlas validate --strict` | Sin ClickUp; lenguaje configurable |
| `phases/plan.md` (arquitecto, waves) | `/satlas.plan` + `/satlas.tasks` + `satlas waves` | Gramática canónica única y parseable |
| `phases/analyze.md` (C1–C18) | `satlas analyze` + `satlas trace` | Checks enumerados y extensibles por perfil |
| `phases/build.md` (waves, subagentes) | `/satlas.build` + `satlas run` | Agnóstico de agente; worktrees opcionales |
| `phases/verify.md` (evidencia) | `satlas verify --record` | Evidencia por escenario `REQ-*` |
| `phases/review.md` (lentes + verificador adversarial) | `satlas review` | Un solo agente; sin 2.º modelo |
| `phases/archive.md` + gate | `satlas archive` | Fold de deltas + `INDEX.md` |
| `phases/fix.md` | carril `fix` | Primer nivel, no apéndice |
| `constitution/` + extractos | `constitution.md` + secciones | Sin empresa; proyecto define la suya |
| `profiles/*` (12) | perfiles + registro | `generic` primero; comunidad |
| `hooks/token-meter`, `scripts/token-report` | `satlas metrics` (opt-in) | Local, sin acoplar a un agente |
| `packages/core` (lifecycle, parsers, waves) | Kernel | Público, versionado, documentado |
| `amigoxcd-cli` | CLI `satlas` | MIT, npm público, sin registry privado |
| Dashboard VS Code | Extensión v1.0+ | Opcional, fuera del MVP |

## Anexo B — Ejemplo mínimo de artefactos

`specs/auth/spec.md` (viva)

```markdown
# Auth

### Requirement: REQ-AUTH-001 — Restablecer contraseña
El sistema DEBE permitir restablecer la contraseña por email.

#### Scenario: REQ-AUTH-001-S1 — Email válido
- **WHEN** el usuario solicita restablecer con un email registrado
- **THEN** recibe un enlace de un solo uso válido por 30 minutos
```

`changes/reset-password/spec.md` (delta)

```markdown
## ADDED Requirements
### Requirement: REQ-AUTH-001 — Restablecer contraseña
(contenido completo del requisito + escenarios)
```

`changes/reset-password/tasks.md`

```markdown
- [ ] T1.1 Crear tabla password_resets · Files: db/migrations/003.sql · Covers: REQ-AUTH-001-S1 · Rollback: DROP TABLE
- [ ] T1.2 Endpoint POST /auth/reset · Files: src/auth/reset.ts · Covers: REQ-AUTH-001-S1 · Depends: T1.1
```

`changes/reset-password/verify.md`

```markdown
| Escenario | Método | Comando | Resultado | Fecha |
|---|---|---|---|---|
| REQ-AUTH-001-S1 | Ejecutable | `npm test -- reset` | 12/12 OK (log) | 2026-09-15 |
```

`changes/reset-password/mockups/manifest.yaml` (contrato visual)

```yaml
version: 3
level: hifi
platform: web
tokens: design/tokens.json
screens:
  - id: reset-request
    file: reset-request.html
    illustrates: [REQ-AUTH-001-S1]
    states: [default, loading, sent, error]
    breakpoints: [390, 768, 1440]
approved: { by: "Maria Perez", date: "2026-09-15", hash: "sha256:ab12..." }
```

`changes/reset-password/presentation/index.html` (paquete para el stakeholder)

```text
Propuesta · Restablecer contraseña
├── Resumen de negocio (objetivo, alcance, fuera de alcance)
├── Criterios de aceptación (medibles, en lenguaje de negocio)
├── Mockups navegables (web/mobile, claro/oscuro, estados)
├── Supuestos y dependencias
└── Cambios respecto a la versión anterior (v3 vs v2)
```

## Anexo C — Configuración de ejemplo

```yaml
# .sdd/config.yaml
project: { name: mi-app, language: es }
lanes:
  default: standard
  allowed: [fix, standard, full]
gates:
  approval: file        # file | pr | jira | linear | clickup | none
  analyze: { mode: blocking, min_severity: medium }
  verify: { mode: blocking, require_evidence: true }
  review: { mode: advisory, second_model: off }
trace: { mode: blocking, id_prefix: REQ }
waves: { max_parallel: 3 }
ci: { drift: advisory } # advisory | strict
spec: { language: es, business_only: true, glossary: .sdd/glossary.md }   # language: es por defecto
syntax: { headers: es }   # encabezados emitidos (Requisito/Escenario/Regla); el parser acepta es y en
mockups:
  level: hifi            # sketch | hifi
  platform: auto         # auto | web | mobile | desktop
  require_approval: true
  compare_in_verify: true
  a11y: AA
editor: { vscode: true, lsp: true, publish: [marketplace, open-vsx] }
integrations:
  tracker: none         # none | github | jira | linear | clickup
  memory: none          # none | mcp
```
