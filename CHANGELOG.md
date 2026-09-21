# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

## [0.1.37] — 2026-09-21

### Añadido

- **`satlas self-update`**: actualiza la herramienta a la versión publicada con el gestor con el que se instaló (npm, pnpm, yarn o bun, reconocido por la ruta del ejecutable). `--check` consulta sin instalar; si la herramienta se ejecuta sin instalar (`npx`), lo dice en vez de instalar nada. Si el gestor falla, explica el motivo, ofrece la orden para ejecutarla a mano y la versión instalada sigue funcionando. El nombre evita confundirlo con `satlas upgrade`, que migra el esquema del proyecto.
- **Aviso de versión nueva**: cualquier comando avisa al terminar si hay una versión posterior, como mucho una vez al día (caché en `~/.specatlas/update-check.json`) y con dos segundos de límite para consultar el registro. Nunca altera el resultado ni el código de salida, y se calla con `--json`, en integración continua, con `SPECATLAS_NO_UPDATE_CHECK=1` y en `satlas mcp`.
- **Actualización desatendida opcional**: `satlas self-update --auto on` la activa en `~/.specatlas/config.json` (preferencia de la persona, no del proyecto); nace desactivada y con `--auto off` se vuelve al aviso.

## [0.1.36] — 2026-09-21

### Añadido

- **El editor enseña el ciclo la primera vez**: recorrido de primeros pasos con las cinco etapas (inicializar, crear un cambio, especificar, aprobar, cerrar con evidencia), cada una con su explicación y su acción; las etapas se marcan cuando se cumplen de verdad, no cuando se leen.
- **Plantillas de los artefactos**: escribiendo dentro de `.sdd/` se ofrecen `req`, `esc`, `regla`, `bloque`, `tarea`, `evidencia`, `hallazgo`, `pregunta` y `contrato`, cada una donde corresponde y produciendo contenido que la validación acepta. No se ofrecen fuera del flujo.
- **Las comprobaciones, como tareas del editor**: `ci`, `validate`, `trace`, `drift`, `doctor` y `analyze` se lanzan con la tecla de compilación o de pruebas, y sus hallazgos se recogen en el panel de problemas con archivo, línea y gravedad (dos `problemMatcher`, uno por nivel, porque el CLI escribe `ERROR` y `AVISO` en español).
- **La extensión se prueba dentro de un VS Code real**: `pnpm --filter specatlas-vscode test:integracion` arranca el editor con un proyecto del flujo y verifica que la extensión activa, que cada acción declarada está registrada, que las cuatro secciones del panel abren y que plantillas y comprobaciones se ofrecen. La verificación continua lo ejecuta con servidor X virtual.

## [0.1.35] — 2026-09-21

### Añadido

- **El panel lateral acompaña al archivo abierto**: entrar en un artefacto selecciona su cambio y las acciones pasan a ser las suyas; un archivo ajeno al flujo no altera la selección. Los archivos de `.sdd/` muestran su estado junto al nombre —lo que bloquea el avance por delante de la fase— y una tarea se marca como hecha desde el propio panel, sustituyendo solo su marcador en el artefacto de tareas.
- **Más de una carpeta de proyecto en la misma ventana**: el trabajo en curso, la salud y el recuento de hallazgos abarcan todas; cada cambio indica a qué proyecto pertenece y cada acción se ejecuta en el suyo, con el asistente que ese proyecto tiene configurado.
- **El editor solo ofrece lo que puede hacer**: 25 de 30 comandos declaran cuándo aplican (proyecto inicializado o cambio existente) y el ajuste `specatlas.language`, que no se leía en ningún punto, se retira.

### Corregido

- **La firma dejaba de pedirse cuando el cambio ya tenía tareas**: los huecos de trazabilidad (escenarios sin evidencia) se evaluaban antes que la aprobación, así que un cambio sin firmar con las tareas marcadas aparecía como «construido» y la siguiente acción era verificar. El `doctor` sí lo detectaba (`ATLAS-LIFECYCLE-001`), pero el estado y la acción mentían. Ahora los hallazgos de la propia especificación se corrigen primero, la firma va después y solo entonces cuentan los huecos de trazabilidad.

### Cambiado

- **El release publica directo o encola, según lo que permita el publicador de confianza**: una configuración de *trusted publishing* nace con permiso para encolar (`allow-stage-publish`) y sin publicación directa, así que `npm publish` responde `403 — OIDC permission denied for this action`. Cada paquete se empaqueta con `pnpm pack` (que reescribe las dependencias `workspace:*` a su versión real), se intenta publicar y, si solo se permite encolar, se usa `npm stage publish` y el resumen del job explica cómo aprobarlo.

## [0.1.34] — 2026-09-21

### Cambiado

- **La publicación en npm deja de necesitar tokens**: el job de release pide un token OIDC de corta vida (*trusted publishing*), con `NPM_TOKEN` como respaldo si no hay OIDC disponible. `RELEASING.md` explica cómo declarar el publicador de confianza en cada paquete y cómo aprobar una versión en cola (`npm stage approve`).

### Corregido

- **Open VSX se daba por publicado sin estarlo**: la comprobación usaba `ovsx get`, que devuelve éxito sin credencial válida, así que el paso se saltaba y la extensión se quedaba atrás. Ahora se consulta la API pública del registro.
- **El workflow de publicación nunca publicaba**: los pasos de npm, Marketplace y Open VSX se saltaban con `if: env.X != ''` porque GitHub enmascara los secretos en las expresiones `if`, así que cada release terminaba «con éxito» sin publicar nada. La comprobación del token pasa al propio script.

## [0.1.33] — 2026-09-21

### Añadido

- **Las tareas se escriben como salgan**: los metadatos (`Archivos:`, `Cubre:`, `Depende de:`, `Reversión:`, `Infra`) se aceptan como sub-viñetas debajo de la tarea, además del formato `· Clave: valor` en la misma línea. Antes, escribirlas como sub-viñetas producía el mensaje engañoso «el escenario no está cubierto por ninguna tarea»; ahora, si faltan de verdad, la sugerencia nombra los dos formatos.
- **`satlas watch`**: recomprueba especificación, trazabilidad y siguiente acción cada vez que cambia `.sdd/`, con el bucle de retroalimentación fuera del editor.
- **`satlas next [slug] --run`**: ejecuta la siguiente acción — corre el comando determinista, abre el asistente configurado cuando el paso es del agente, y se niega a disparar lo que firma una persona (aprobar, archivar, enmendar, pausar).
- **`satlas explain [<código>]`**: qué significa un diagnóstico, por qué lo vigila el flujo y cómo se cierra; sin argumento, lista las familias y las fichas. Cubre la mitigación que la arquitectura declaraba para el riesgo de «linter que frustra».
- **El repositorio pasa por su propio gate**: el CI corre `satlas adapters --check` y `satlas ci` con el código del commit, y un job aparte ejercita la Action publicada sobre este mismo repo.
- **Las specs vivas saben dónde viven en el código**: cada dominio gana `.sdd/specs/<dominio>/anchors.yaml`, que `satlas archive` rellena solo desde los `Archivos:` de las tareas (requisito → escenario → tarea → archivo) y respeta lo escrito a mano. `satlas drift` compara esas anclas con el repositorio (`ATLAS-DRIFT-001` archivo que ya no existe, `ATLAS-DRIFT-002` símbolo renombrado), `satlas drift --prune` retira las rotas y `satlas ci` lo comprueba con el modo que dice `ci.drift` (`advisory` avisa, `strict` bloquea) — la clave existía en la configuración desde el principio y no hacía nada.
- **`satlas impact <REQ-…|archivo>`**: qué escenarios, tareas, evidencia y archivos toca un requisito, o qué requisitos toca un archivo. Con las anclas responde aunque no haya ningún cambio activo; la vía de consulta para asistentes (`atlas_impact`) las usa también.
- **`satlas review <slug>` y gate de revisión real**: crea `review.md` desde plantilla si falta y lee lo que decide el gate — veredicto (`- resultado: pass`) y hallazgos bloqueantes sin resolver. Que el archivo exista ya no cuenta como revisión hecha, y el gate `gates.review.mode` pasa a aplicar también al carril `standard` (antes solo `full`). En modo aviso, el recordatorio aparece cuando las tareas están terminadas.
- **`satlas amend <slug> --reason "<motivo>" --by "<nombre>"`**: cambio de alcance sobre una spec aprobada, como prometía el Artículo 5 de la constitución. Registra la enmienda en `meta.yaml` (motivo, autor, fecha, huella anterior y nueva) y vuelve a firmar la especificación.
- **La plantilla ya no pasa por especificación**: un cambio recién creado con el esqueleto de `satlas new` (prosa, reglas y escenarios entre paréntesis) se reporta como `LINT-BIZ-003` y su estado es **spec en borrador**, con la fase de especificar como siguiente acción. Antes `validate`, `analyze` y `ci` lo daban por válido y `next` proponía aprobarlo. Un requisito entero sin escribir se reporta una sola vez; los huecos sueltos, uno por hueco.
- **La invocación del agente sale de la configuración**: `next`, `status`, el panel, los avisos y los botones de la extensión derivan la instrucción del primer target de `adapters.targets` (`/satlas-plan` en opencode, `/satlas:plan` en Claude Code y Gemini, la ruta del prompt en `generic`), y la terminal abre el ejecutable de ese agente. Antes se copiaban invocaciones (`/satlas.plan`) que ningún agente reconocía.
- **`satlas pause <slug> --reason "<motivo>" --by "<nombre>"` y `satlas resume <slug>`**: la pausa de un cambio se registra en `meta.yaml` con motivo, autor y fecha, conservando el resto del archivo; el cambio aparece como **pausado** en `status`, en el árbol y en el panel, y al reanudar se vuelve a derivar el paso real desde los artefactos. El estado `paused` que ya proponía `satlas resume` por fin tiene comando que lo escriba y lo quite.
- **`init --agents <target>` configura el proyecto, no solo compila**: antes dejaba `adapters.targets` en `opencode, generic` aunque los artefactos fueran de otro agente, así que las invocaciones que se copiaban no correspondían a lo instalado. Los prompts compilados también se refieren entre sí con la sintaxis del agente (`/satlas:mockup` en Claude Code y Gemini).
- **Carriles permitidos**: crear un cambio en un carril fuera de `lanes.allowed` falla con `ATLAS-NEW-003` y dice cuáles admite el proyecto.
- **Sugerencia de comando**: un comando mal escrito propone el más cercano (`satlas stauts` → «¿Quisiste decir \`satlas status\`?»).

- **Panel principal único en la extensión**: una sola ventana (`specatlas.panel`) con secciones internas — **Resumen**, **Flujo**, **Trazabilidad**, **Métricas**, **Documentos** y **Acciones** — que reúne el estado del proyecto, el flujo por fase (incluida «esperando mockups»), la matriz con filtros, las métricas, los documentos y mockups del cambio, y las acciones del ciclo. Se refresca solo al cambiar `.sdd/` y conserva la sección activa y los filtros; los paneles sueltos de matriz, tablero y métricas dejan de existir.
- **Acciones del ciclo en orden y por carril**: cada paso muestra su actor (**con agente**, **humana** o **local**), su comando, su estado (hecho, omitido, ahora, pendiente, bloqueada) y su propio botón; crear un cambio desde el panel es el paso 1. Las acciones con agente **abren opencode en una terminal del proyecto** con la instrucción del paso (con respaldo al portapapeles si no se puede abrir); aprobar y archivar siguen siendo actos humanos auditados.
- **Presentación para aprobar rediseñada**: portada con identidad, estado de la firma y huella; guía de secciones navegable; resumen de negocio, especificación, criterios de aceptación, galería de mockups y bloque de firma. Se imprime o guarda como PDF con la firma en página propia, y avisa cuando falta la propuesta, no hay mockups, la firma quedó obsoleta o falta un mockup declarado.
- **Documentación en tres formatos**: los documentos técnico y manual se generan en texto fuente, **HTML** y **PDF** (motor propio sobre `pdf-lib`, local y sin servicios externos, con encabezado, pie paginado y tablas). Si un formato falla se avisa con el motivo (`ATLAS-DOCS-003`) y los demás quedan disponibles; regenerar conserva lo escrito a mano.

### Cambiado

- **Configuración que no hacía nada**: `gates.analyze.min_severity` ahora decide cuándo un cambio pasa «con deuda» (`low` desde el primer aviso, `medium` a partir de cinco, `high` solo mira errores); `gates.mockup.compare_in_verify` avisa al registrar evidencia si el contrato visual quedó obsoleto (`ATLAS-VERIFY-002`); `mockups.level` y `mockups.a11y` viajan al manifiesto y al plan. `syntax.headers` se retira del esquema: no tenía implementación y `spec.language` ya decide el idioma de los encabezados.
- **Los avisos no se pintan como fallas en `satlas ci`**: un check con avisos y sin errores se muestra como `AVISO`; el veredicto final sigue siendo el que manda.

### Corregido

- **El carril express ya no pide un delta que no lleva**: un cambio `fix` avisaba de que le faltaba `spec.md` (`ATLAS-FILES-002`) cuando su artefacto único es `fix.md` por diseño.
- **La evidencia con `npm`, `npx`, `pnpm` o `yarn` fallaba siempre en Windows**: esos lanzadores son archivos `.cmd` que `execFile` no resuelve (ENOENT) y que Node se niega a ejecutar sin shell (EINVAL), así que `satlas verify` registraba `result: fail` con la salida vacía aunque la prueba pasara. Ahora se reintenta con shell —seguro, porque el comando ya pasó el filtro de metacaracteres— y el fallo al lanzar un proceso se distingue del fallo del programa.

- **Interlineado del PDF**: el avance de línea escala con el tamaño de fuente y el marcador de las listas se dibuja en su primera línea (antes los bloques grandes se solapaban entre sí).
- **Documentación con contenido real**: la documentación técnica pasa a 13 secciones con resumen de cifras, los requisitos en lenguaje de negocio con sus reglas, el mapa de archivos (archivo → tarea → requisito), la trazabilidad con cabecera y resumen de huecos, y la evidencia con lo que comprueba cada escenario y los comandos con que se reproduce. El **manual de usuario** deja de ser un volcado de escenarios: primeros pasos, recorrido por pantallas con sus estados, tareas paso a paso («qué haces» / «qué ocurre»), estados vacíos, problemas frecuentes, reglas de negocio y glosario.
- **`analyze.md` explica para qué sirve**: el informe abre diciendo qué comprueba (consistencia entre artefactos, no el código), cómo se regenera, qué significa su estado y cuál es el siguiente paso; añade la tabla **Qué se comprobó** (especificación, trazabilidad, tareas y olas, plan, evidencia, mockups y packs, con el resultado de cada comprobación) y los hallazgos incluyen la columna **Qué hacer**.
- **Mockups fuera de la presentación incrustada**: en el panel, la presentación ya no incrusta debajo el visor de mockups (no se pintaba); ofrece «Abrir visor de mockups» y un acceso a la sección de mockups. La galería de la presentación muestra tarjetas con el enlace a cada pantalla y solo previsualiza en línea cuando se abre como documento propio en el navegador.
- **PDF**: se dejan de imprimir los marcadores del bloque gestionado (`<!-- specatlas:generado:… -->`) y se conservan los caracteres tipográficos que WinAnsi sí admite (— – « » comillas), que antes se descartaban.
- **Evidencia con texto libre**: `satlas verify` entrecomilla `command`, `by` y `notes` al escribir el bloque `evidence`, así que una nota con dos puntos ya no rompe el YAML (`LINT-EVD-000`).

- **Contratos del cambio y enlaces multi-repo**: `satlas contracts <slug>` comprueba **localmente** los contratos declarados en `contracts/` (OpenAPI 3.x, GraphQL SDL y protobuf) — forma (`ATLAS-CONTRACT-001/002`) y **cobertura cruzada** con los escenarios (`ATLAS-CONTRACT-003/004`, referencias `- **Contrato**: GET /tareas`) — con modo `gates.contracts.mode: off | advisory | blocking` (aviso por defecto; en bloqueante no se archiva con huecos o roturas). `satlas link add|list|remove` enlaza otros proyectos (monorepo y polyrepo) y consulta sus specs en **solo lectura**; la trazabilidad y el impacto marcan lo externo con su origen y avisan de referencias no resueltas (`ATLAS-LINK-003`). La vía de consulta para asistentes expone `atlas_contracts` y `atlas_links`.
- **Fases aclarar y documentar**: `/satlas.clarify` (y `satlas clarify <slug>`) vacía supuestos, dependencias y preguntas abiertas tras especificar y antes de planificar, con las respuestas en `clarify.md` (`- [ ]` abiertas · `- [x] pregunta — respuesta`), el resumen en la propuesta y re-firma avisada si cambia la especificación; modo `gates.clarify.mode: off | advisory | blocking` (aviso por defecto). `/satlas.docs` (y `satlas docs <slug> [--tipo tecnica|manual|all]`) genera la documentación técnica y manual del carril completo desde plantillas y evidencia real, con bloque gestionado que conserva lo escrito a mano al regenerar y lo pendiente de evidencia señalado; modo `gates.docs.mode` (bloqueante por defecto en carril completo: el cambio queda «revisado» hasta documentarse). Ambos artefactos aparecen en el árbol del editor.
- **Fixes vivos y trazabilidad de specs y fixes**: al archivar un fix (carril express) la corrección queda viva en `.sdd/fixes/<AAAA-MM>-<slug>.md` (idempotente, sin tocar las specs vivas) y se lista en el registro; el árbol del editor suma los grupos **Fixes** (fecha, dominio y resultado) e **Histórico** (archivados que no son fixes); la **Matriz** muestra por requisito qué cambios y fixes lo tocaron, con filtro por procedencia y aviso cuando no hay registros; un fix puede declarar `Cubre: REQ-…` (opcional, con aviso `TRACE-011` si el requisito no existe); `satlas status` y la vía de consulta para asistentes (`atlas_fixes`, solo lectura) listan los fixes vivos.
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

- **Resolutor de fuentes en el checkout del repo**: `satlas adapters`/`doctor` usaban la copia empaquetada de `workflow/` y `profiles/` (la genera `prepack`) en vez de las fuentes de la raíz, así que las fases nuevas no se compilaban hasta forzar `SPECATLAS_WORKFLOW_DIR`. Ahora un checkout fuente usa la raíz y un paquete instalado usa su copia empaquetada (la variable de entorno sigue teniendo prioridad).
- **Fixes archivados visibles**: los fixes del carril express archivados por versiones anteriores ahora aparecen en el grupo **Fixes**, en `satlas status` (marcados «(histórico)»), en `atlas_fixes` y en el registro del proyecto, leídos del histórico y sin duplicar los que ya tienen fix vivo. El grupo «Histórico» pasa a **Histórico de cambios** con tooltips que explican su propósito (la historia del cambio — qué se cerró, cuándo y con qué evidencia —, no el comportamiento vigente).
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
