# Delta — Primeros pasos, plantillas y comprobaciones del editor

## Requisitos agregados

### Requisito: REQ-EDITOR-018 — El editor enseña el ciclo la primera vez
Quien abre la herramienta por primera vez no sabe qué es un cambio, ni por qué hay que firmar, ni qué cuenta como evidencia. Hoy eso se explica en un tutorial que vive fuera del editor, así que quien empieza tiene que salir de su trabajo para entenderlo. El editor debe enseñar el ciclo desde dentro, y marcar cada paso conforme se cumple.

- Regla BR-EDITOR-035: el editor ofrece un recorrido de primeros pasos con las cinco etapas del ciclo: inicializar, crear un cambio, especificar, aprobar y cerrar con evidencia.
- Regla BR-EDITOR-036: cada etapa explica para qué sirve y deja a mano la acción que la cumple.
- Regla BR-EDITOR-037: una etapa se marca como cumplida cuando se cumple de verdad, no cuando se lee.

#### Escenario: REQ-EDITOR-018-S1 — Primer contacto con la herramienta
- **CUANDO** alguien abre el recorrido de primeros pasos
- **ENTONCES** ve las cinco etapas del ciclo, cada una con su explicación y su acción

#### Escenario: REQ-EDITOR-018-S2 — Una etapa se cumple
- **CUANDO** se inicializa el proyecto o se crea el primer cambio
- **ENTONCES** la etapa correspondiente queda marcada como cumplida

### Requisito: REQ-EDITOR-019 — Escribir un artefacto sin recordar su estructura
Cada artefacto del flujo tiene una gramática exacta: los requisitos llevan su identificador y sus escenarios, las tareas declaran archivos y lo que cubren, la evidencia declara método, comando y resultado. Escribir eso de memoria es lento y produce errores que solo aparecen al validar.

- Regla BR-EDITOR-038: al escribir dentro de un artefacto del flujo se ofrecen las plantillas de lo que ese artefacto admite.
- Regla BR-EDITOR-039: las plantillas no se ofrecen fuera de los artefactos del flujo.
- Regla BR-EDITOR-040: cada plantilla produce contenido que la validación acepta.

#### Escenario: REQ-EDITOR-019-S1 — Escribir un requisito
- **CUANDO** se escribe dentro de la especificación de un cambio
- **ENTONCES** se ofrecen las plantillas de requisito, escenario y regla

#### Escenario: REQ-EDITOR-019-S2 — Escribir una tarea
- **CUANDO** se escribe dentro del artefacto de tareas
- **ENTONCES** se ofrecen las plantillas de bloque y de tarea, y no las de la especificación

#### Escenario: REQ-EDITOR-019-S3 — Un archivo fuera del flujo
- **CUANDO** se escribe en un archivo que no pertenece al flujo
- **ENTONCES** no se ofrece ninguna plantilla del flujo

### Requisito: REQ-EDITOR-020 — Las comprobaciones se lanzan como cualquier otra del proyecto
El equipo ya lanza sus pruebas y su compilación desde el editor. Las comprobaciones del flujo deberían lanzarse igual, y sus hallazgos aparecer donde el equipo ya mira los errores, en vez de exigir una terminal aparte.

- Regla BR-EDITOR-041: las comprobaciones del flujo se ofrecen como tareas del editor, cada una con lo que hace.
- Regla BR-EDITOR-042: la comprobación completa queda bajo la tecla de compilación y la de trazabilidad bajo la de pruebas.
- Regla BR-EDITOR-043: los hallazgos de una comprobación se recogen con su archivo, su línea y su gravedad.
- Regla BR-EDITOR-044: una comprobación que opera sobre un cambio no se ofrece mientras no haya ninguno.

#### Escenario: REQ-EDITOR-020-S1 — Lanzar la comprobación completa
- **CUANDO** el equipo busca las tareas del proyecto
- **ENTONCES** encuentra las comprobaciones del flujo, con la completa bajo la tecla de compilación

#### Escenario: REQ-EDITOR-020-S2 — Los hallazgos van donde el equipo mira
- **CUANDO** una comprobación termina con hallazgos
- **ENTONCES** cada uno se recoge con su archivo, su línea y su gravedad

#### Escenario: REQ-EDITOR-020-S3 — Sin cambios en curso
- **CUANDO** el proyecto no tiene ningún cambio
- **ENTONCES** las comprobaciones que operan sobre un cambio no se ofrecen

### Requisito: REQ-EDITOR-021 — Lo que solo se ve en el editor también se prueba
La lógica del editor se prueba sin abrirlo, pero hay cosas que solo existen dentro: que la extensión arranque, que sus acciones estén registradas, que sus vistas se abran y que las plantillas y comprobaciones lleguen a ofrecerse. Hoy nada de eso se comprueba, así que una acción declarada y no registrada pasaría inadvertida.

- Regla BR-EDITOR-045: existe una comprobación que arranca el editor de verdad y verifica que la extensión activa con un proyecto del flujo.
- Regla BR-EDITOR-046: esa comprobación verifica que cada acción declarada está registrada, que las secciones del panel se abren y que las plantillas y comprobaciones se ofrecen.
- Regla BR-EDITOR-047: la comprobación forma parte de la verificación continua del proyecto.

#### Escenario: REQ-EDITOR-021-S1 — La extensión arranca
- **CUANDO** se ejecuta la comprobación del editor sobre un proyecto del flujo
- **ENTONCES** la extensión queda activa

#### Escenario: REQ-EDITOR-021-S2 — Una acción declarada y no registrada
- **CUANDO** una acción se declara pero no llega a registrarse
- **ENTONCES** la comprobación falla nombrando esa acción

#### Escenario: REQ-EDITOR-021-S3 — Las secciones del panel se abren
- **CUANDO** la comprobación pide abrir cada sección del panel lateral
- **ENTONCES** todas responden

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: editor -->
