# Delta — Rediseño del panel lateral y la extensión

## Requisitos agregados

### Requisito: REQ-EDITOR-012 — El panel lateral abre con lo que toca hacer ahora
Al abrir el editor, el equipo necesita saber en un vistazo qué le toca hacer, sin recorrer el árbol del proyecto ni recordar en qué fase quedó cada cambio. La primera sección del panel lateral responde a esa única pregunta y deja la acción a un clic.

- Regla BR-EDITOR-012: La primera sección del panel lateral muestra los cambios en curso, el más urgente desplegado, y su primer elemento es siempre la siguiente acción del cambio.
- Regla BR-EDITOR-013: Cada siguiente acción declara quién la ejecuta —el asistente, una persona o la propia herramienta— y se lanza desde el mismo elemento.
- Regla BR-EDITOR-014: Junto a la acción se muestran los bloqueos vigentes, los hallazgos que detienen el avance, el avance de tareas y evidencia, y el estado de la revisión y de los mockups cuando el cambio los declara.
- Regla BR-EDITOR-015: Sin cambios en curso, la sección ofrece por dónde empezar: crear un cambio, adoptar un proyecto existente o abrir el panel principal.

#### Escenario: REQ-EDITOR-012-S1 — Un cambio en curso
- **CUANDO** el equipo abre el editor con un cambio en curso
- **ENTONCES** la primera sección del panel lateral muestra ese cambio desplegado y su primer elemento es la siguiente acción, con el actor que la ejecuta

#### Escenario: REQ-EDITOR-012-S2 — Varios cambios a la vez
- **CUANDO** hay más de un cambio en curso
- **ENTONCES** se listan todos, con el más urgente desplegado y el resto plegados

#### Escenario: REQ-EDITOR-012-S3 — La acción la firma una persona
- **CUANDO** la siguiente acción del cambio es un acto que firma una persona
- **ENTONCES** el elemento lo declara como tal y la herramienta no la ejecuta por su cuenta

#### Escenario: REQ-EDITOR-012-S4 — El cambio está bloqueado
- **CUANDO** el cambio tiene bloqueos o hallazgos que detienen el avance
- **ENTONCES** aparecen junto a la acción, y los hallazgos llevan a la sección de salud

#### Escenario: REQ-EDITOR-012-S5 — Sin cambios en curso
- **CUANDO** el proyecto no tiene ningún cambio en curso
- **ENTONCES** la sección ofrece crear un cambio, adoptar un proyecto existente o abrir el panel principal

### Requisito: REQ-EDITOR-013 — Una sección de salud agrupa lo que hay que resolver
Los hallazgos llegan hoy como una lista plana en la que todo pesa igual. El equipo necesita distinguir lo que detiene el trabajo de lo que solo avisa, y ver aparte cuándo el código se movió por debajo de las specs vivas.

- Regla BR-EDITOR-016: La sección de salud agrupa los hallazgos en los que bloquean el avance y los que solo avisan, con el conteo de cada grupo.
- Regla BR-EDITOR-017: La deriva entre las specs vivas y el código es un grupo propio, que indica el modo configurado y qué ancla dejó de existir.
- Regla BR-EDITOR-018: Cada hallazgo abre el archivo y la línea donde ocurre, y permite consultar la explicación de su código.
- Regla BR-EDITOR-019: Sin hallazgos ni deriva, la sección lo dice en una línea en vez de quedarse vacía.
- Regla BR-EDITOR-020: El número de hallazgos que bloquean se anuncia en la propia sección, sin abrirla.

#### Escenario: REQ-EDITOR-013-S1 — Hallazgos de distinto peso
- **CUANDO** el proyecto tiene hallazgos que bloquean y hallazgos que solo avisan
- **ENTONCES** la sección de salud los presenta en grupos separados, cada uno con su conteo

#### Escenario: REQ-EDITOR-013-S2 — Abrir un hallazgo
- **CUANDO** el equipo elige un hallazgo
- **ENTONCES** se abre el archivo en la línea del hallazgo

#### Escenario: REQ-EDITOR-013-S3 — El código se movió
- **CUANDO** alguna ancla de una spec viva apunta a código que ya no existe
- **ENTONCES** la deriva aparece como grupo propio, con el modo configurado y el motivo de cada ancla rota

#### Escenario: REQ-EDITOR-013-S4 — Proyecto sano
- **CUANDO** no hay hallazgos ni anclas rotas
- **ENTONCES** la sección lo declara en una sola línea, indicando cuántas anclas se comprobaron

#### Escenario: REQ-EDITOR-013-S5 — Explicar un código
- **CUANDO** el equipo pide la explicación del código de un hallazgo
- **ENTONCES** obtiene qué significa, por qué el flujo lo vigila y cómo se cierra

### Requisito: REQ-EDITOR-014 — El estado del trabajo acompaña sin estorbar
El equipo trabaja en el código, no en el panel. Necesita saber en qué punto está el cambio sin cambiar de ventana, y encontrar la puerta de entrada cuando el proyecto todavía no usa el flujo.

- Regla BR-EDITOR-021: La barra de estado del editor muestra el cambio en foco y el paso que toca, y llevar al panel lateral desde ahí es un solo gesto.
- Regla BR-EDITOR-022: Cuando el cambio está bloqueado, la barra de estado lo distingue visualmente.
- Regla BR-EDITOR-023: Si el proyecto todavía no usa el flujo, el panel lateral explica qué es y ofrece inicializarlo o adoptar el proyecto existente.

#### Escenario: REQ-EDITOR-014-S1 — Trabajo en curso
- **CUANDO** hay un cambio en curso
- **ENTONCES** la barra de estado muestra su nombre y el paso que toca

#### Escenario: REQ-EDITOR-014-S2 — Trabajo bloqueado
- **CUANDO** el cambio en foco está bloqueado o tiene hallazgos que detienen
- **ENTONCES** la barra de estado lo distingue visualmente

#### Escenario: REQ-EDITOR-014-S3 — Proyecto sin el flujo
- **CUANDO** el proyecto todavía no usa el flujo
- **ENTONCES** el panel lateral explica qué es y ofrece inicializarlo o adoptar el proyecto existente

#### Escenario: REQ-EDITOR-014-S4 — Sin cambios en curso
- **CUANDO** el proyecto usa el flujo pero no tiene cambios en curso
- **ENTONCES** la barra de estado lo dice, sin inventar un paso pendiente

## Requisitos modificados

### Requisito: REQ-EDITOR-001 — Un único panel principal reúne el trabajo
El equipo necesita un solo punto de entrada en el editor: hoy el estado, el flujo de los cambios, la trazabilidad y las métricas viven en ventanas separadas, hay que abrir una para cada tema y el trabajo queda disperso. Un panel principal único, con secciones internas, reúne la información y las acciones en un mismo lugar. Entre esas secciones está la que relaciona las specs vivas con el código: dónde vive cada requisito, si alguna de esas referencias dejó de existir y en qué estado quedó la revisión del cambio.

- Regla BR-EDITOR-001: El panel principal es el único punto de entrada de la herramienta en el editor y reúne, en secciones internas, el resumen, el flujo de los cambios, la trazabilidad, la relación con el código, las métricas, los documentos y las acciones; cambiar de sección no abre ventanas nuevas.
- Regla BR-EDITOR-002: El panel principal es único: si ya está abierto, pedirlo de nuevo lo reutiliza y activa la sección pedida; nunca se duplica.
- Regla BR-EDITOR-003: Las ventanas independientes de matriz, tablero y métricas dejan de existir; su información se consulta en el panel principal.
- Regla BR-EDITOR-024: La sección que relaciona las specs con el código declara cuántas referencias se comprobaron, cuáles dejaron de existir y el estado de la revisión del cambio en curso.

#### Escenario: REQ-EDITOR-001-S1 — Abrir el panel principal
- **CUANDO** el equipo abre la herramienta desde su punto de entrada
- **ENTONCES** se abre una única ventana con la sección de resumen activa y el estado del proyecto

#### Escenario: REQ-EDITOR-001-S2 — Cambiar de sección
- **CUANDO** el equipo elige otra sección del panel
- **ENTONCES** su contenido reemplaza al anterior en la misma ventana, sin abrir otra

#### Escenario: REQ-EDITOR-001-S3 — El panel ya estaba abierto
- **CUANDO** se pide abrir el panel o una de sus secciones con el panel ya abierto
- **ENTONCES** se reutiliza la ventana existente y la sección pedida queda activa

#### Escenario: REQ-EDITOR-001-S4 — Proyecto sin inicializar
- **CUANDO** el proyecto no está inicializado
- **ENTONCES** el panel lo indica y ofrece la acción de inicializar, sin mostrar secciones con datos inexistentes

#### Escenario: REQ-EDITOR-001-S5 — Sin proyecto abierto
- **CUANDO** no hay una carpeta de proyecto abierta
- **ENTONCES** el panel lo indica y no ofrece acciones que requieran proyecto

#### Escenario: REQ-EDITOR-001-S6 — La relación con el código
- **CUANDO** el equipo abre la sección que relaciona las specs vivas con el código
- **ENTONCES** ve cuántas referencias se comprobaron, cuáles dejaron de existir y el estado de la revisión del cambio en curso

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: editor -->
