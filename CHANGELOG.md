# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Añadido

- **Sección «Paneles y acciones» en el sidebar**: lanza Matriz de trazabilidad, Tablero, Métricas, Validar, Diagnóstico y Compilar adaptadores desde la vista (con icono y descripción), sin ensanchar el título de la vista (que queda solo con Refrescar e Inicializar). Al inicializar, la sección muestra las acciones disponibles.
- **Icono propio en las pestañas de los paneles**: Matriz, Tablero, Métricas, vista previa y mockups usan el icono de SpecAtlas en lugar de la hoja genérica.
- **Compilar adaptadores desde el editor**: botón «Compilar adaptadores» en el sidebar de la extensión (y acción en la paleta), que genera los comandos/skills del agente sin salir de VS Code. `Inicializar workspace` ahora compila los adaptadores automáticamente.
- **Packs de cumplimiento**: `satlas packs` (listar) y `satlas packs --check <slug>` (evaluar). Packs integrados `seguridad`, `datos`, `auditoria` y `accesibilidad`, más packs propios en `.sdd/packs/*.yaml`. Los hallazgos (`PACK-<PACK>-<CONTROL>`) se integran en `satlas analyze`, en `satlas ci` y en el panel de Problems de la extensión.

### Corregido

- **Donas de métricas legibles en tema oscuro**: el interior era transparente y se veía como un agujero negro. Ahora llevan un disco interior con tinte neutro + el color de la métrica, y la pista del anillo es visible en temas claros y oscuros.
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
