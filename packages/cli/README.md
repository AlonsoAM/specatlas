# specatlas

**El kernel determinista del Spec-Driven Development.** Specs vivas, trazabilidad ejecutable y gates reales para cualquier stack, cualquier agente y cualquier proyecto — incluido el que ya existe.

```bash
npm i -g specatlas      # instala los binarios `specatlas` y `satlas`
npx specatlas@latest version
```

> Requiere Node ≥ 20. La documentación completa, la extensión de VS Code y el tutorial viven en [el repositorio](https://github.com/AlonsoAM/specatlas).

## Qué problema resuelve

Escribir software con un asistente es rápido hasta que hay que responder tres preguntas: **qué se acordó**, **por qué está así** y **cómo sabemos que funciona**. SpecAtlas guarda esas respuestas en archivos versionados dentro de `.sdd/`, y las comprueba con un núcleo determinista: el estado de un cambio no lo decide un modelo interpretando texto, se **deriva** de los artefactos.

- La **especificación** se escribe en lenguaje de negocio, sin tecnología.
- Cada requisito tiene escenarios; cada escenario, una tarea que lo cubre y una **evidencia** con su comando y su huella.
- Aprobar y archivar son **actos humanos** firmados con nombre, fecha y hash.
- Todo comando acepta `--json` y devuelve códigos de salida estables: sirve igual a una persona, a un pipeline y a un agente.

## El ciclo, en cinco minutos

```bash
satlas init --name mi-proyecto          # crea .sdd/ y los comandos de tu agente
satlas new reset-password --domain auth --title "Restablecer contraseña"

# escribe la spec funcional en .sdd/changes/reset-password/spec.md
satlas validate                          # lenguaje de negocio, estructura, plantilla sin completar
satlas present reset-password            # propuesta HTML para el stakeholder
satlas approve reset-password --by "Nombre Apellido"   # firma con hash

# plan y tareas en plan.md / tasks.md, luego a construir
satlas waves --change reset-password     # olas paralelas sin colisión de archivos
satlas verify reset-password --scenario REQ-AUTH-001-S1 --command "npm test" --by "Nombre Apellido"
satlas trace --require-evidence          # ¿algún escenario sin respaldo?

satlas analyze reset-password            # consistencia entre artefactos
satlas archive reset-password            # pliega el delta en la spec viva
```

`satlas status` y `satlas next` responden en cualquier momento dónde está cada cambio y qué toca hacer — y `satlas next --run` lo ejecuta.

## Lo que hace distinto

**Las specs vivas saben dónde viven en el código.** Al archivar, cada requisito hereda los archivos de las tareas que cubrieron sus escenarios. Después:

```bash
satlas drift                      # ¿alguna referencia dejó de existir tras un refactor?
satlas impact src/auth/reset.ts   # ¿qué requisitos toca este archivo?
```

**Cualquier agente, sus propios comandos.** Los prompts viven una sola vez y se compilan al formato nativo de cada asistente: opencode, Claude Code, Cursor, Copilot, Gemini CLI, Codex y genérico. Lo que la herramienta te dice que copies existe de verdad en el agente que configuraste.

```bash
satlas adapters --targets opencode,claude-code,cursor
```

**Gates que de verdad detienen.** Aprobación firmada, evidencia obligatoria, trazabilidad sin huecos, packs de cumplimiento (seguridad, datos, auditoría, accesibilidad) y contratos del cambio (OpenAPI, GraphQL, protobuf). Cada gate se configura `off | advisory | blocking`.

**Sirve en un proyecto que ya existe.** `satlas adopt` levanta el inventario, propone dominios y deja las specs base para completarlas con el agente.

## Comandos

| | |
|---|---|
| **Estado** | `status` · `next [--run]` · `watch` · `metrics` · `doctor` · `explain <código>` |
| **Ciclo** | `new` · `validate` · `trace` · `waves` · `verify` · `analyze` · `review` · `approve` · `amend` · `pause` · `resume` · `archive` |
| **Salidas** | `present` · `mockup` · `docs` · `issue` |
| **Código** | `drift` · `impact` · `contracts` · `link` |
| **Proyecto** | `init` · `adopt` · `adapters` · `profile` · `packs` · `upgrade` · `hash` · `run` |
| **Integración** | `ci [--strict] [--sarif <ruta>]` · `mcp` |

`satlas help` lista todo con su uso; `satlas explain <código>` explica cualquier hallazgo.

## En integración continua

```yaml
- uses: AlonsoAM/specatlas@v1
  with:
    strict: 'false'     # 'true' para que los avisos también bloqueen
    upload: 'true'      # publica el informe SARIF en Code Scanning
```

Equivalente local: `satlas ci --sarif specatlas.sarif`. El gate bloquea exactamente igual en tu máquina y en el pipeline.

## Para asistentes (MCP, solo lectura)

```bash
satlas mcp    # vía de consulta por stdio: estado, siguiente acción, hallazgos,
              # cobertura, impacto, glosario, fixes, contratos y enlaces
```

Las respuestas salen del mismo núcleo que la terminal, así que un asistente puede consultar el estado real antes de actuar, sin modificar nada.

## Editor

La extensión de VS Code (`specatlas.specatlas-vscode`, en Marketplace y Open VSX) añade el panel lateral con lo que toca hacer ahora, la salud del proyecto, el panel principal con trazabilidad y métricas, y un servidor de lenguaje con diagnósticos, navegación y quick fixes dentro de `.sdd/`.

## Licencia

MIT © SpecAtlas
