# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Añadido

- **Informe de hallazgos SARIF y Action oficial**: `satlas ci --sarif <ruta>` escribe el informe (SARIF 2.1.0) con el mismo veredicto del gate — reglas por código con descripción, rutas relativas, archivo y línea — y avisa sin cambiar el veredicto si la ruta no es escribible. La Action compuesta de la raíz (`uses: AlonsoAM/specatlas@v1`) instala la herramienta desde npm (versión fijable), corre el gate y publica el informe en Code Scanning sin que publicar pueda alterar el veredicto. Incluye workflow de ejemplo y permisos documentados.
- **`satlas upgrade` (migraciones de esquema)**: `status`, `validate` y `doctor` avisan (sin escribir) cuando el estado del proyecto quedó en una versión anterior; `satlas upgrade` muestra la vista previa, `--apply` sella la versión vigente con respaldo recuperable en `.sdd/.backup/` (todo o nada e idempotente) y `--rollback` restaura el estado previo consumiendo el respaldo. Los proyectos nuevos nacen al día y un proyecto producido por una versión más nueva solo se avisa (nunca se degrada). Incluye `--json`, exclusión del respaldo en `.gitignore` y documentación en README/ARQUITECTURA.
- **Servidor MCP de solo lectura** (`satlas mcp`): los asistentes consultan el estado del proyecto (estado, siguiente acción, hallazgos, cobertura, impacto y glosario) por el protocolo MCP sobre stdio, con las mismas respuestas que la terminal y sin modificar el proyecto. Incluye el análisis de impacto y el lector del glosario en el kernel, pruebas del contrato de mensajes y documentación en README/ARQUITECTURA.
- **Filtros en los paneles**: la Matriz de trazabilidad tiene búsqueda (insensible a acentos), estado (todos / con huecos / verificados) y, cuando aplican, dominio y cambio activo, con contador en vivo; el Tablero filtra por texto, carril y dominio, y actualiza el recuento por columna.
- **El árbol refresca al recuperar el foco** la ventana de VS Code: los cambios hechos desde la terminal (evidencia, tareas, archivado) aparecen sin recargar.
- **Tooltip de «Specs vivas»** en el árbol: explica que es la fuente de verdad y que se llena al archivar; cuando está vacío indica «se llenan al archivar un cambio».
- El prompt de **Especificar** pide la **historia de usuario** («como <rol>, quiero <acción>, para <beneficio>») cuando no está clara y la refleja en la propuesta.
- **Tareas desplegables en el árbol**: el nodo `Tareas` muestra la lista de tareas (id, bloque, hecha/pendiente) y cada una abre `tasks.md` en su línea.
- **Mockups desplegables**: el nodo `Mockups` lista las pantallas del manifiesto (con aviso de desactualizado) y cada una abre el visor de mockups en esa pantalla.
- **Presentación y mockups desde el sidebar**: clic en `Presentación` abre el HTML en una vista previa; clic en `Mockups` abre el visor con el selector de pantallas.
- **Sección «Paneles y acciones» en el sidebar**: lanza Matriz de trazabilidad, Tablero, Métricas, Validar, Diagnóstico y Compilar adaptadores desde la vista (con icono y descripción), sin ensanchar el título de la vista (que queda solo con Refrescar e Inicializar). Al inicializar, la sección muestra las acciones disponibles.
- **Icono propio en las pestañas de los paneles**: Matriz, Tablero, Métricas, vista previa y mockups usan el icono de SpecAtlas en lugar de la hoja genérica.
- **Compilar adaptadores desde el editor**: botón «Compilar adaptadores» en el sidebar de la extensión (y acción en la paleta), que genera los comandos/skills del agente sin salir de VS Code. `Inicializar workspace` ahora compila los adaptadores automáticamente.
- **Packs de cumplimiento**: `satlas packs` (listar) y `satlas packs --check <slug>` (evaluar). Packs integrados `seguridad`, `datos`, `auditoria` y `accesibilidad`, más packs propios en `.sdd/packs/*.yaml`. Los hallazgos (`PACK-<PACK>-<CONTROL>`) se integran en `satlas analyze`, en `satlas ci` y en el panel de Problems de la extensión.

### Corregido

- **Matriz de trazabilidad sin falsos huecos entre cambios archivados**: cuando varios cambios reutilizan los mismos ids de tarea (T1.1, T1.2…), la cobertura de los cambios archivados anteriores se descartaba y escenarios ya cubiertos y verificados aparecían como «sin tarea». Ahora las coberturas y dependencias se fusionan también entre archivados, igual que ya se hacía entre activos.
- **Paneles con refresco en vivo**: la Matriz, el Tablero, las Métricas y las previsualizaciones se reconstruyen solas cuando cambia `.sdd/` (debounce 300 ms), sin cerrar y reabrir; los paneles ocultos se actualizan al volver a mostrarse, un fallo al reconstruir se aísla en el canal de salida y reabrir un panel reutiliza el existente en lugar de duplicarlo.
- **Ciclo de vida con tareas y hallazgos pendientes**: un cambio con tareas hechas y hallazgos bloqueantes ya no se muestra como «spec en borrador»: pasa a «construido» (siguiente: registrar evidencia) y, con tareas pendientes, a «construyendo» (siguiente: construir en olas).
- **Gate de revisión del carril `full`**: se resolvía con `verify.md` en vez del artefacto de revisión. Ahora se carga `review.md` en el modelo y el gate exige `/satlas.review` (con `gates.review.mode: blocking`) hasta que exista; en el árbol aparece el nodo «Revisión».
- **`satlas archive` sin `--yes`** ya no se muestra como ERROR: es una **confirmación requerida** (aviso + exit 2) e indica el comando exacto con el slug (`--dry-run` para revisar, `--yes` para confirmar).
- **Presentación y mockups se abren como desde el explorador**: el clic en `Presentación`, en `Mockups` o en cada pantalla abre el HTML con el editor predeterminado (Integrated Browser), por lo que los mockups embebidos en la propuesta **renderizan correctamente**. Antes se abrían en un visor propio con iframes vacíos y estilos bloqueados por CSP (visor retirado).
- La vista previa HTML de respaldo reescribe las rutas relativas (mockups embebidos) a URIs del webview.
- **Donas de métricas legibles en tema oscuro**: el interior ahora es un **degradado radial del color de la métrica** (no un agujero negro), la pista del anillo se ve en temas claros y oscuros, y el texto central usa su estilo correcto también en la cabecera de los paneles (antes quedaba negro y a 13px porque el selector `.donut` no aplicaba en el hero).
- Los adaptadores serializan el frontmatter como YAML válido: las descripciones con `:` (p. ej. «Adoptar (brownfield): …») ya no rompen el parseo en opencode ni en el preview de VS Code.
- El paquete npm del CLI ahora incluye `workflow/` y `profiles/` (vía `prepack`): al instalar desde npm, `satlas init` y `satlas adapters` ya generan los comandos y skills del agente.
- `satlas init` ahora falla con `ATLAS-ADAPTERS-003` si no encuentra las fuentes de prompts, en lugar de omitir los adaptadores en silencio.
- Las claves de tarea aceptan variantes sin acentos (`Reversion` ≡ `Reversión`).
- La configuración se serializa sin duplicar la clave `packs`.

## [0.1.0] — 2026-09-15

Primera versión pública (alpha). El kernel determinista del SDD: specs vivas, trazabilidad ejecutable y gates reales.

### Añadido

- **Kernel `@specatlas/core`**: parsers de spec viva, deltas (`ADDED`/`MODIFIED`/`REMOVED`/`RENAMED`), tareas (gramática canónica con `Archivos`/`Cubre`/`Depende de`/`Reversión`/`Infra`) y evidencia (bloques YAML). Linter de negocio (jerga técnica, palabras vagas, pérdida de escenarios en `MODIFIED`), motor de trazabilidad `TRACE-*`, olas paralelas con colisión de archivos, ciclo de vida derivado, firmas con hash canónico, plegado de deltas al archivar, doctor, perfiles de stack con detección, métricas locales, utilidades de GitHub (`gh`) y adopción brownfield.
- **CLI `specatlas`** (alias `satlas`): `init`, `adopt`, `new`, `status`, `next`, `validate`, `trace`, `waves`, `analyze`, `approve`, `issue`, `mockup`, `present`, `verify`, `ci`, `metrics`, `run`, `profile`, `adapters`, `hash`, `archive`, `doctor`, `help`, `version`. Envelope JSON estable y exit codes `0/1/2/3`.
- **Compilador de adaptadores `@specatlas/adapters`**: prompts en `workflow/` compilados a opencode, Claude Code, Cursor, Copilot, Gemini CLI, Codex y genérico, con manifiesto y `--check` para CI.
- **Renderizador `@specatlas/render`**: markdown propio, código resaltado con highlight.js, mermaid (doble modo), tokens de diseño y temas `auto/light/dark/vscode`.
- **Servidor de lenguaje `@specatlas/lsp`**: diagnósticos, hover, CodeLens de trazabilidad, definición/referencias, símbolos y quick fixes en `.sdd/`.
- **Extensión VS Code `specatlas-vscode`**: árbol con colores por fase y requisitos navegables, menú contextual, badge de errores, bienvenida con inicialización, visor de artefactos y mockups, Problems, matriz de trazabilidad, tablero y métricas; LSP integrado.
- **Carriles**: `fix` (un artefacto), `standard` y `full` (analyze/review/docs); gates configurables por modo (`off`/`advisory`/`blocking`).
- **Integración GitHub**: `satlas issue sync` (tracker idempotente con marcador) y `satlas approve --from-github` (aprobación por etiqueta, firmada localmente con hash).
- **Mockups como contrato visual**: plan, manifiesto con `inputs_hash`, lint (`LINT-MKP-*`, obsolescencia) y captura opcional con Playwright.
- **Propuesta para el stakeholder**: `satlas present` genera un paquete HTML autocontenido (spec de negocio + criterios de aceptación + mockups).
- **Documentación**: `PROPUESTA.md`, `ARQUITECTURA.md`, `BRAND.md`, README por paquete y plantillas es/en (español por defecto).
- **Tests**: 93 casos con vitest sobre kernel, CLI, adaptadores, LSP, render y lógica de la extensión.

### Notas

- Idioma por defecto: **español** (`language: en` para inglés).
- Los paquetes npm se publican con `pnpm publish` (reescribe el protocolo `workspace:*`).
