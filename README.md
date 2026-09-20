<p align="center">
  <img src="packages/vscode/media/atlas-logo.svg" alt="SpecAtlas" width="380">
</p>

**El kernel determinista del Spec-Driven Development.** Specs vivas, trazabilidad ejecutable y gates reales para cualquier stack, cualquier agente y cualquier proyecto — incluido el que ya existe.

> **¿Primera vez? Empieza por el [tutorial completo](docs/tutorial/TUTORIAL.md)** (versión HTML: [`docs/tutorial/index.html`](docs/tutorial/index.html), se regenera con `pnpm docs:build`).
>
> Identidad de marca: [`BRAND.md`](BRAND.md) · Propuesta: [`PROPUESTA.md`](PROPUESTA.md) · Arquitectura: [`ARQUITECTURA.md`](ARQUITECTURA.md) · Publicación: [`RELEASING.md`](RELEASING.md).

- Diseño y propuesta: [`PROPUESTA.md`](PROPUESTA.md)
- Arquitectura técnica: [`ARQUITECTURA.md`](ARQUITECTURA.md)

## Estado

F0 (fundaciones) en desarrollo:

| Pieza | Estado |
|---|---|
| Kernel `@specatlas/core` (parsers, lint de negocio, trace, waves, lifecycle, archive) | ✅ |
| CLI `specatlas` / `satlas` (`init`, `new`, `approve`, `status`, `next`, `validate`, `trace`, `waves`, `doctor`, `archive`) | ✅ |
| Perfiles de stack (`generic`, `node-ts`, `python`, `dotnet-sqlserver`) + detección | ✅ |
| Plantillas es/en (es por defecto), `meta.yaml`, evidencia por escenario | ✅ |
| Tests (vitest, 207 casos) y typecheck | ✅ |
| Compilador de adaptadores (`@specatlas/adapters`: opencode, Claude Code, genérico) + manifiesto y `--check` | ✅ |
| Comandos `adapters`, `profile`, `hash` | ✅ |
| Fixtures multi-stack (node-ts, python, dotnet) | ✅ |
| F1: `verify --record` (ejecuta y registra evidencia con hash), `analyze`, `ci`, `run` (auditoría), carril `fix` | ✅ |
| F1: `present` (paquete HTML para el stakeholder) y `mockup` (plan + manifiesto + lint + captura opcional con Playwright) | ✅ |
| F1: extensión VS Code mínima (árbol de specs/cambios, visor, Problems, mockups, aprobar y archivar) | ✅ |
| F2: `satlas adopt` (brownfield: inventario, dominios y specs baseline + informe) y fase `/satlas-adopt` | ✅ |
| F2: LSP de specs (`@specatlas/lsp`): diagnósticos inline, hover, CodeLens de trazabilidad, definición/referencias, símbolos y quick fixes | ✅ |
| F2: `@specatlas/render` (markdown + código resaltado con highlight.js + mermaid + tokens de diseño) usado por la extensión y por `satlas present` | ✅ |
| F2: adaptadores para **opencode, Claude Code, Cursor, Copilot, Gemini CLI, Codex y genérico** (con dedupe de archivos compartidos) | ✅ |
| F2: integración GitHub: `satlas issue sync` (tracker idempotente) y `satlas approve --from-github` (aprobación por etiqueta, firmada con hash) | ✅ |
| F3: matriz de trazabilidad, tablero y panel de métricas en la extensión + `satlas metrics` (local, sin telemetría) | ✅ |
| F3: packs de cumplimiento (`seguridad`, `datos`, `auditoria`, `accesibilidad` + packs de proyecto) con `satlas packs --check` y gate en `ci`/`analyze` | ✅ |
| F3: servidor MCP de solo lectura (`satlas mcp`) para que los asistentes consulten estado, siguiente acción, hallazgos, cobertura, impacto y glosario | ✅ |
| F3: `satlas upgrade` (migraciones de esquema): aviso pasivo, vista previa, aplicación con respaldo recuperable, reversión y `--json` | ✅ |
| F3: informe de hallazgos **SARIF** (`satlas ci --sarif`) y **Action oficial** en el repo (`uses: AlonsoAM/specatlas@v1`) con gate real en cada PR | ✅ |
| Publicación: 5 paquetes npm (`specatlas`, `@specatlas/core`, `render`, `adapters`, `lsp`) + extensión en **VS Code Marketplace** y **Open VSX** + GitHub Release v0.1.0 | ✅ |
| F3 restante: contract testing y multi-repo | 🔲 pendiente |

## Requisitos

- Node ≥ 20 y pnpm ≥ 9.

## Instalación

Los paquetes se publican en npm y la extensión en ambos mercados (ver [`RELEASING.md`](RELEASING.md)).

```bash
# CLI (publicado en npm)
npx specatlas@latest version
npm i -g specatlas        # bins: specatlas y satlas

# Extensión
code --install-extension specatlas.specatlas-vscode
#  - VS Code Marketplace → https://marketplace.visualstudio.com/items?itemName=specatlas.specatlas-vscode
#  - Open VSX → https://open-vsx.org/extension/specatlas/specatlas-vscode
#  - .vsix → descárgalo del release: https://github.com/AlonsoAM/specatlas/releases
```

## Uso rápido (desde el repo)

```bash
pnpm install

# en la carpeta de tu proyecto (o en este repo para dogfooding):
pnpm satlas init --name mi-proyecto
pnpm satlas adopt                                      # proyecto existente: inventario + specs baseline
pnpm satlas new reset-password --lane standard --domain auth --title "Restablecer contraseña"
# escribe la spec funcional en .sdd/changes/reset-password/spec.md (deltas)
pnpm satlas validate
pnpm satlas trace
pnpm satlas waves --change reset-password
pnpm satlas mockup reset-password                         # plan + manifiesto del contrato visual
pnpm satlas present reset-password                        # propuesta HTML para el stakeholder
pnpm satlas verify reset-password --scenario REQ-AUTH-001-S1 --command "npm test" --by "Nombre Apellido"
pnpm satlas approve reset-password --by "Nombre Apellido"   # firma la spec (hash + autor)
pnpm satlas analyze reset-password                        # chequeo cruzado + analyze.md
pnpm satlas ci                                            # gate de pipeline (sin agente)
pnpm satlas metrics                                       # métricas locales del workspace
pnpm satlas packs --check reset-password                  # controles de cumplimiento del cambio
pnpm satlas status
pnpm satlas archive reset-password --dry-run

# adaptadores de agente (se compilan solos en `init`; recompila cuando cambie workflow/)
pnpm satlas adapters                      # usa adapters.targets de config (por defecto opencode + generic)
pnpm satlas adapters --targets opencode,claude-code,cursor,copilot,gemini,codex,generic
pnpm satlas adapters --check              # falla si están desactualizados (CI)
pnpm satlas profile detect | list | create mi-stack
```

Cada agente recibe sus artefactos en su formato nativo:

| Target | Artefactos | Invocación |
|---|---|---|
| `opencode` | `.opencode/command/satlas-*.md` + `.opencode/skills/satlas-*/SKILL.md` | `/satlas-specify` |
| `claude-code` | `.claude/commands/satlas/*.md` + `.claude/skills/satlas-*/SKILL.md` | `/satlas:specify` |
| `cursor` | `.cursor/skills/satlas-*/SKILL.md` + `.cursor/commands/satlas-*.md` | `/satlas-specify` |
| `copilot` | `.github/prompts/satlas-*.prompt.md` + `.github/copilot-instructions.md` | `/satlas-specify` (chat) |
| `gemini` | `.gemini/commands/satlas/*.toml` + `GEMINI.md` | `/satlas:specify` |
| `codex` / `generic` | `prompts/satlas-*.md` + `AGENTS.md` | copiar a `~/.codex/prompts/` o pedirlo en el chat |

Tras compilar adaptadores en un proyecto con opencode, reinicia la sesión para que aparezcan los comandos `/satlas-specify`, `/satlas-plan`, `/satlas-build`, etc.

Todos los comandos aceptan `--json` (envelope estable para CI y agentes) y devuelven exit codes: `0` ok, `1` hallazgos, `2` uso/config, `3` E/S.

## Packs de cumplimiento (opcional)

Controles deterministas por dominio regulatorio, evaluados contra el cambio y convertidos en gate de `satlas ci`:

```bash
pnpm satlas packs                          # lista los packs integrados y si están activos
pnpm satlas packs --check reset-password   # evalúa los packs activos contra el cambio (exit 1 si hay fallas)
```

Se activan en `.sdd/config.yaml`:

```yaml
packs: [seguridad, auditoria]
```

| Pack | Qué exige |
|---|---|
| `seguridad` | Toda tarea declara `Reversión`, evidencia automatizable y una regla que nombre el control (sesión, permisos, token…) |
| `datos` | Finalidad y ciclo de vida del dato (regla), `Reversión` por tarea y un escenario de eliminación/exportación |
| `auditoria` | `Reversión` por tarea, evidencia ejecutable/automática (sin manual), rastro de auditoría y aprobación nominal activa |
| `accesibilidad` | Escenarios con teclado/foco/contraste y un requisito no funcional medible (WCAG AA) |

También puedes escribir **packs propios** en `.sdd/packs/<id>.yaml` (mismo esquema que los integrados: `id`, `title`, `description`, `checks[]` con tipos `task-rollback`, `evidence-strong`, `spec-terms`, `rule-terms`, `nfr-measurable`, `approval-provider`). Los hallazgos aparecen como `PACK-<PACK>-<CONTROL>` en `analyze`, en `ci` y en el panel de Problems de la extensión.

## Servidor MCP (solo lectura)

`satlas mcp` inicia la **vía de consulta para asistentes** (protocolo MCP sobre entrada/salida estándar). Es de **solo lectura**: nunca modifica el proyecto, por lo que los asistentes pueden consultar el estado real antes de actuar.

```bash
pnpm satlas mcp        # queda escuchando mensajes JSON-RPC por stdio
```

| Operación | Qué consulta |
|---|---|
| `atlas_status` | Estado general o de un cambio: fase, avance de tareas y evidencia, bloqueos |
| `atlas_next` | Siguiente acción recomendada, con la indicación explícita de si requiere una persona |
| `atlas_validate` | Hallazgos vigentes de un cambio (idénticos a los que reporta la herramienta) |
| `atlas_trace` | Cobertura por escenario: tarea que lo cubre, evidencia y huecos |
| `atlas_impact` | Impacto registrado de un requisito (`REQ-…`) o de un archivo |
| `atlas_glossary` | Términos del glosario del negocio con su definición vigente |

Se registra como servidor local en el asistente (opencode, Claude Code, Cursor…). En opencode, por ejemplo:

```json
{
  "mcp": {
    "specatlas": { "type": "local", "command": ["satlas", "mcp"], "enabled": true }
  }
}
```

Las respuestas son deterministas: salen del mismo núcleo que la terminal, no de un modelo interpretando archivos. Sin proyecto inicializado, la vía responde con la acción recomendada (`satlas init`).

## Actualizar el estado del proyecto (`satlas upgrade`)

Los elementos de estado (configuración, cambios, aprobaciones, perfiles y manifiesto de mockups) declaran su versión. Si un proyecto quedó en una versión anterior, `status`, `validate` y `doctor` lo avisan **sin escribir nada**, y `satlas upgrade` lo actualiza:

```bash
satlas upgrade              # vista previa: qué cambiaría (no escribe nada)
satlas upgrade --apply      # aplica con respaldo recuperable en .sdd/.backup/
satlas upgrade --rollback   # restaura el estado previo (consume el respaldo)
```

La aplicación es **todo o nada** (si algo falla, el proyecto queda exactamente como estaba), **idempotente** (repetirla no cambia nada) y admite `--json`. Nunca actualiza hacia atrás: un proyecto producido por una versión más nueva se avisa, no se degrada. El respaldo en `.sdd/.backup/` no debe versionarse.

## Integración con GitHub (opcional, nunca un gate por defecto)

Requiere `gh` instalado y autenticado (`gh auth login`) y el remoto `origin` en GitHub.

```bash
pnpm satlas issue sync reset-password --labels specatlas   # crea/actualiza el issue (idempotente, marcador)
pnpm satlas issue status reset-password                    # issue vinculado y estado de etiquetas
pnpm satlas approve reset-password --from-github           # firma la spec si el issue tiene la etiqueta aprobadora
```

- El issue se vincula en `meta.yaml` (`tracker: { provider: github, id, url }`) y su cuerpo se regenera desde el cambio (siguiente acción, tareas, evidencia).
- Aprobación por etiqueta: quien aprueba aplica `spec-approved` (configurable con `gates.approval_label`) y `satlas approve --from-github` registra la **firma local con hash y canal `tracker`**.
- Config: `integrations.tracker: github`, `gates.approval: file | none | github-label`.

## Comprobación continua en GitHub (Action oficial)

`satlas ci --sarif <ruta>` ejecuta el gate y, además, escribe un **informe de hallazgos en formato SARIF 2.1.0** (reglas por código, rutas relativas, archivo y línea) que GitHub Code Scanning muestra anotado en cada propuesta. La **Action oficial** hace todo con un solo paso:

```yaml
name: SDD
on: [pull_request]
permissions:
  contents: read
  security-events: write   # necesario solo para publicar el informe
jobs:
  specatlas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: AlonsoAM/specatlas@v1
        with:
          version: latest        # o una versión fija, p. ej. 0.1.27
          strict: 'false'        # 'true' para que los avisos también bloqueen
          upload: 'true'         # publica el informe en Code Scanning
```

| Entrada | Por defecto | Qué hace |
|---|---|---|
| `version` | `latest` | Versión de la herramienta que se instala desde npm |
| `path` | `.` | Ruta del proyecto dentro del repositorio |
| `strict` | `'false'` | Con `'true'`, los avisos también bloquean la propuesta |
| `sarif-file` | `specatlas.sarif` | Ruta del informe, relativa a `path` |
| `upload` | `'true'` | Publica el informe en Code Scanning |

- El paso **bloquea el job exactamente cuando bloquea el gate local** con la misma configuración (avisos incluidos en modo estricto).
- Publicar el informe es **opcional**: si falta el permiso `security-events` o no hay conexión, se avisa del motivo y el veredicto no cambia.
- El informe contiene solo hallazgos y ubicaciones: **nunca** contenido de archivos ni credenciales. El gate no usa la red.
- Equivalente local: `pnpm satlas ci --sarif specatlas.sarif [--strict]`.

## Extensión de VS Code

Panel **SpecAtlas** en la barra de actividad con:

- **Árbol** de specs vivas y cambios: iconos con color por fase, progreso visual (`▓▓▓░░ 3/4`), evidencia, **siguiente acción** (se ejecuta si es determinista o se copia si requiere agente) y, al expandir cada spec, sus **requisitos navegables** (clic abre el archivo en esa línea).
- **Menú contextual** por cambio (aprobar, analizar, trazabilidad, olas, propuesta, mockups, copiar siguiente acción, archivar), **badge de errores** en la barra de actividad y pantalla de **bienvenida con inicialización** desde el propio editor (`SpecAtlas: Inicializar workspace`, con detección de stack).
- **Visor** de los artefactos: abre los `.md` con la vista previa nativa de VS Code y, como respaldo, usa `@specatlas/render` (markdown propio, **código resaltado** con highlight.js y **diagramas mermaid** renderizados con el asset local). **Visor de mockups** con selector de pantalla.
- **Problems** alimentado por el kernel (lint + trazabilidad + doctor) con códigos `LINT-*`, `TRACE-*`, `ATLAS-*`.
- **Servidor de lenguaje (LSP)** en `.sdd/**`: diagnósticos inline, hover con el detalle del requisito/escenario/tarea, **CodeLens** (`N tareas · evidencia M/N`, `ola N`, `evidencia: pass`), ir a definición y **referencias** entre spec, tareas, verificación y mockups, símbolos del documento y del workspace, y **quick fixes** (añadir `Cubre:` con el escenario pendiente, copiar el bloque completo para `MODIFIED`).
- **Matriz de trazabilidad**: portada con cobertura (donut), KPIs y tabla agrupada por requisito, con huecos en rojo y navegación al artefacto.
- **Tablero**: columnas por fase con acento de color, tarjetas con chips, barra de progreso, evidencia y bloqueos.
- **Métricas locales**: KPIs, donut de evidencia, barras de archivados por mes, distribución por método y WIP (todo local, sin telemetría).
- Acciones seguras: **aprobar** (firma con hash y autor), **archivar**, generar la **propuesta**, analizar, validar, olas y doctor.

Se puede desactivar con `specatlas.lsp: false` en la configuración.

**Instalar el `.vsix`** (recomendado para usarla ya):

```bash
pnpm --filter specatlas-vscode build
pnpm --filter specatlas-vscode exec vsce package --no-dependencies --allow-missing-repository
code --install-extension packages/vscode/specatlas-vscode-0.0.1.vsix
```

Luego recarga la ventana de VS Code (`Developer: Reload Window`) y busca el icono de SpecAtlas (libro) en la barra de actividad. También puedes instalarlo desde la UI: Extensions → `...` → *Install from VSIX…*.

**Desarrollo**: abre este repositorio en VS Code y pulsa **F5** (configuración `Extensión SpecAtlas (Extension Host)`), o compílala con:

```bash
pnpm --filter specatlas-vscode build
```

## Desarrollo

```bash
pnpm test          # tests (kernel, CLI, adaptadores y lógica de la extensión)
pnpm -r typecheck  # tipos
```

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licencia

MIT.
