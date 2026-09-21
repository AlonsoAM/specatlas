---
domain: editor
title: Un panel principal único para la extensión
version: 4
updated: 2026-09-21
---

# Un panel principal único para la extensión

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

### Requisito: REQ-EDITOR-002 — Resumen: salud del proyecto y siguiente acción
El equipo necesita, al abrir la herramienta, saber de un vistazo cómo está el proyecto y qué hacer ahora, sin interpretar datos por su cuenta.

- Regla BR-EDITOR-004: El resumen muestra los indicadores del proyecto (cambios activos, avance de tareas, evidencia y hallazgos) y, por cada cambio activo, su estado, su carril, su avance y su siguiente acción.
- Regla BR-EDITOR-005: El resumen solo muestra lo registrado; lo que no existe se indica como ausente, sin inventarlo.
- Regla BR-EDITOR-006: Cuando hay puntos que requieren atención (bloqueos, hallazgos o evidencia pendiente), el resumen los destaca con su motivo y la acción sugerida.

#### Escenario: REQ-EDITOR-002-S1 — Proyecto con cambios activos
- **CUANDO** se abre el resumen y hay cambios activos
- **ENTONCES** se muestran los indicadores del proyecto y cada cambio con su estado, su carril, su avance y su siguiente acción

#### Escenario: REQ-EDITOR-002-S2 — Proyecto al día
- **CUANDO** no hay bloqueos, hallazgos ni evidencia pendiente
- **ENTONCES** el resumen lo indica de forma expresa

#### Escenario: REQ-EDITOR-002-S3 — Puntos que requieren atención
- **CUANDO** hay bloqueos, hallazgos o evidencia pendiente
- **ENTONCES** el resumen los destaca con su motivo y la acción que los atiende

#### Escenario: REQ-EDITOR-002-S4 — Proyecto sin cambios activos
- **CUANDO** no hay cambios activos
- **ENTONCES** el resumen lo indica y ofrece crear uno

#### Escenario: REQ-EDITOR-002-S5 — Proyecto sin historial
- **CUANDO** el proyecto no tiene cambios archivados
- **ENTONCES** el resumen lo indica sin presentar datos de archivo

### Requisito: REQ-EDITOR-003 — Sección Flujo: el avance de los cambios por fase
El equipo necesita seguir el avance de cada cambio por las fases del ciclo desde el panel principal, sin abrir el tablero aparte.

- Regla BR-EDITOR-007: El flujo muestra las fases del ciclo con los cambios que están en cada una, con su carril, su dominio, su avance de tareas y evidencia y, si lo tienen, su bloqueo.
- Regla BR-EDITOR-008: Los filtros del flujo (texto, carril y dominio) acotan lo visible sin alterar los datos ni recargar el panel; el conteo por fase refleja lo filtrado.

#### Escenario: REQ-EDITOR-003-S1 — Cambios en distintas fases
- **CUANDO** se abre el flujo y hay cambios activos
- **ENTONCES** cada uno aparece en la fase que le corresponde con su avance y su siguiente acción

#### Escenario: REQ-EDITOR-003-S2 — Cambio bloqueado
- **CUANDO** un cambio tiene un bloqueo
- **ENTONCES** aparece con el motivo del bloqueo

#### Escenario: REQ-EDITOR-003-S3 — Filtros del flujo
- **CUANDO** el equipo filtra por texto, carril o dominio
- **ENTONCES** solo quedan visibles los cambios que cumplen el filtro y los conteos por fase se ajustan, sin alterar los datos

#### Escenario: REQ-EDITOR-003-S4 — Proyecto sin cambios activos
- **CUANDO** no hay cambios activos
- **ENTONCES** el flujo lo indica y no muestra fases con datos inexistentes

### Requisito: REQ-EDITOR-004 — Sección Trazabilidad: requisito, escenario, tarea y evidencia
El equipo necesita comprobar la trazabilidad completa desde el panel principal, con los huecos primero, sin abrir la matriz aparte.

- Regla BR-EDITOR-009: La trazabilidad muestra cada requisito con sus escenarios, las tareas que los cubren, la evidencia de cada escenario y su procedencia (cambios y fixes), con los huecos primero.
- Regla BR-EDITOR-010: Los filtros (texto, estado, dominio, cambio y procedencia) acotan lo visible sin alterar los datos; el conteo refleja lo filtrado.
- Regla BR-EDITOR-011: Cada identificador abre su artefacto en la línea exacta dentro del editor.

#### Escenario: REQ-EDITOR-004-S1 — Requisito con huecos
- **CUANDO** hay escenarios sin tarea o sin evidencia
- **ENTONCES** aparecen primero y se distinguen de los verificados

#### Escenario: REQ-EDITOR-004-S2 — Todo verificado
- **CUANDO** todos los escenarios tienen tarea y evidencia favorable
- **ENTONCES** la sección lo indica de forma expresa

#### Escenario: REQ-EDITOR-004-S3 — Sin requisitos
- **CUANDO** el proyecto no tiene requisitos
- **ENTONCES** la sección lo indica y señala cómo empezar

#### Escenario: REQ-EDITOR-004-S4 — Filtros de la trazabilidad
- **CUANDO** el equipo filtra por texto, estado, dominio, cambio o procedencia
- **ENTONCES** solo quedan visibles los requisitos que cumplen el filtro y el conteo lo refleja

#### Escenario: REQ-EDITOR-004-S5 — Abrir un identificador
- **CUANDO** el equipo elige un identificador de requisito o de escenario
- **ENTONCES** se abre su artefacto en la línea correspondiente, sin abrir ventanas adicionales del panel

### Requisito: REQ-EDITOR-005 — Sección Métricas: la salud del proceso
El equipo necesita las métricas del proceso (evidencia, cierres por mes, antigüedad del trabajo, distribución por carril, trabajo en curso y puntos de atención) dentro del panel principal.

- Regla BR-EDITOR-012: Las métricas se calculan localmente; el panel no envía datos fuera del equipo.
- Regla BR-EDITOR-013: Las métricas mostradas son las mismas que ya ofrece la herramienta; el panel no inventa indicadores.

#### Escenario: REQ-EDITOR-005-S1 — Proyecto con actividad
- **CUANDO** se abre la sección de métricas y hay actividad
- **ENTONCES** se muestran la evidencia, los cierres por mes, la antigüedad del trabajo en curso, la distribución por carril y el trabajo por fase

#### Escenario: REQ-EDITOR-005-S2 — Puntos de atención
- **CUANDO** hay bloqueos, trabajo antiguo o evidencia pendiente
- **ENTONCES** se listan con su motivo

#### Escenario: REQ-EDITOR-005-S3 — Proyecto sin actividad
- **CUANDO** no hay cambios ni archivos
- **ENTONCES** la sección lo indica sin presentar indicadores inexistentes

### Requisito: REQ-EDITOR-006 — Documentos y mockups dentro del panel
El equipo necesita leer los documentos del cambio y ver sus mockups dentro del panel, sin abrir ventanas adicionales ni perder el contexto.

- Regla BR-EDITOR-014: El panel ofrece los documentos del cambio (propuesta, especificación, aclaraciones, plan, tareas, verificación, documentación, presentación y fix, cuando existan) y los muestra en su propia sección; los documentos ausentes se indican como tales.
- Regla BR-EDITOR-015: Los mockups del cambio se ven dentro del panel, pantalla a pantalla; si el cambio no los declara se indica, y si están desactualizados se avisa.
- Regla BR-EDITOR-016: Un documento que no se puede leer se informa con su motivo, sin mostrar contenido incompleto.

#### Escenario: REQ-EDITOR-006-S1 — Abrir un documento del cambio
- **CUANDO** el equipo elige un documento existente del cambio
- **ENTONCES** su contenido se muestra en el panel

#### Escenario: REQ-EDITOR-006-S2 — Documento ausente
- **CUANDO** el equipo elige un documento que aún no existe
- **ENTONCES** se indica que no existe y cuál es la acción que lo produce

#### Escenario: REQ-EDITOR-006-S3 — Mockups del cambio
- **CUANDO** el cambio declara mockups existentes
- **ENTONCES** se ven en el panel, pantalla a pantalla

#### Escenario: REQ-EDITOR-006-S4 — Cambio sin mockups
- **CUANDO** el cambio no declara mockups
- **ENTONCES** se indica y no se muestra contenido de ejemplo

#### Escenario: REQ-EDITOR-006-S5 — Mockups desactualizados
- **CUANDO** los mockups cambiaron respecto de la especificación
- **ENTONCES** se avisa que están desactualizados

#### Escenario: REQ-EDITOR-006-S6 — Documento ilegible
- **CUANDO** un documento no se puede leer
- **ENTONCES** se informa el motivo y no se muestra contenido parcial

### Requisito: REQ-EDITOR-007 — Acciones del ciclo desde el panel
El equipo necesita ejecutar desde el panel las acciones del ciclo, con las mismas reglas y registros que ya rigen la herramienta.

- Regla BR-EDITOR-017: El panel ofrece las acciones válidas para el estado del proyecto y del cambio activo; las que no aplican no se ofrecen y, si se piden, se explica por qué no aplican.
- Regla BR-EDITOR-018: Las acciones humanas (aprobar y archivar) conservan sus reglas: piden quién las ejecuta y quedan auditadas con nombre y fecha.
- Regla BR-EDITOR-019: Una acción que falla informa el motivo y no deja el trabajo a medias.
- Regla BR-EDITOR-020: Las acciones que requieren un asistente abren el asistente en una terminal del proyecto con la instrucción de la acción ya dirigida; la acción no se ejecuta por sí sola.
- Regla BR-EDITOR-021: Si el asistente no se puede abrir, la instrucción queda disponible para copiarla y se informa el motivo.
- Regla BR-EDITOR-022: Las acciones se presentan en el orden del ciclo y agrupadas por carril (express, estándar y completo), con el paso actual marcado y el actor de cada paso (asistente, persona o local), de modo que el flujo completo de un cambio se pueda recorrer desde el panel.
- Regla BR-EDITOR-023: Crear un cambio desde el panel pide carril, título y dominio, y lo deja en el primer paso del flujo de su carril.
- Regla BR-EDITOR-030: Cada paso del flujo ofrece su acción en el propio paso (o explica por qué no aplica); ninguna acción queda escondida detrás de un botón genérico.

#### Escenario: REQ-EDITOR-007-S1 — Acción válida
- **CUANDO** el equipo ejecuta desde el panel una acción válida para el estado
- **ENTONCES** la acción se ejecuta y su resultado se refleja en el panel

#### Escenario: REQ-EDITOR-007-S2 — Acción no válida
- **CUANDO** el equipo pide una acción que no aplica al estado
- **ENTONCES** el panel explica por qué no aplica y no la ejecuta

#### Escenario: REQ-EDITOR-007-S3 — Acción humana sin nombre
- **CUANDO** una acción humana se pide sin indicar quién la ejecuta
- **ENTONCES** no se ejecuta y se pide el nombre

#### Escenario: REQ-EDITOR-007-S4 — Acción que falla
- **CUANDO** una acción falla
- **ENTONCES** el panel informa el motivo y el proyecto queda sin cambios a medias

#### Escenario: REQ-EDITOR-007-S5 — Acción con asistente
- **CUANDO** el equipo pide una acción que requiere un asistente
- **ENTONCES** se abre el asistente en una terminal del proyecto con la instrucción de esa acción ya dirigida

#### Escenario: REQ-EDITOR-007-S6 — El asistente no se puede abrir
- **CUANDO** el asistente no se puede abrir
- **ENTONCES** la instrucción queda disponible para copiarla y se informa el motivo

#### Escenario: REQ-EDITOR-007-S7 — El flujo completo, en orden y por carril
- **CUANDO** el equipo abre la sección de acciones
- **ENTONCES** ve los pasos del ciclo en orden, agrupados por carril, con el paso actual marcado y el actor de cada paso

#### Escenario: REQ-EDITOR-007-S8 — Crear un cambio desde el panel
- **CUANDO** el equipo crea un cambio desde el panel
- **ENTONCES** el panel pide carril, título y dominio, y el cambio queda en el primer paso del flujo de su carril

#### Escenario: REQ-EDITOR-007-S9 — Ejecutar un paso ya pasado u omitido
- **CUANDO** el equipo quiere ejecutar un paso que ya pasó o que quedó omitido
- **ENTONCES** encuentra su acción en el propio paso y puede ejecutarla, o ve el motivo por el que no aplica

### Requisito: REQ-EDITOR-008 — El panel se mantiene al día sin perder el contexto
El equipo necesita que el panel refleje los cambios hechos desde la terminal o el asistente sin recargarlo a mano y sin perder dónde estaba.

- Regla BR-EDITOR-021: El panel se actualiza solo cuando cambian los artefactos del proyecto; la sección activa y los filtros en uso se conservan.
- Regla BR-EDITOR-022: Sin cambios en el proyecto, el panel no se altera.
- Regla BR-EDITOR-023: Una actualización que falla se informa y no deja el panel en un estado incompleto.

#### Escenario: REQ-EDITOR-008-S1 — Cambio hecho fuera del panel
- **CUANDO** los artefactos cambian desde la terminal o el asistente
- **ENTONCES** el panel lo refleja sin intervención del equipo

#### Escenario: REQ-EDITOR-008-S2 — Contexto conservado
- **CUANDO** el panel se actualiza
- **ENTONCES** la sección activa y los filtros en uso se conservan

#### Escenario: REQ-EDITOR-008-S3 — Sin cambios
- **CUANDO** nada cambia en el proyecto
- **ENTONCES** el panel permanece igual

#### Escenario: REQ-EDITOR-008-S4 — Actualización fallida
- **CUANDO** una actualización no puede completarse
- **ENTONCES** se informa el motivo y se conserva la última información válida

### Requisito: REQ-EDITOR-009 — La presentación para aprobar
El equipo necesita una página de presentación que reúna lo que se va a aprobar —la propuesta, la especificación y los mockups— con un diseño legible y navegable, porque la presentación actual no invita a leer ni a firmar y la aprobación es un acto humano.

- Regla BR-EDITOR-024: La presentación reúne, en este orden, la identidad del cambio (nombre, carril, dominio, versión, fecha y huella), el resumen de negocio, la especificación con sus requisitos y escenarios, los mockups y el bloque de firma; con una guía de secciones navegable y sin recursos externos.
- Regla BR-EDITOR-025: La presentación se puede imprimir o guardar como PDF con el contenido completo, sin cortes que oculten información y con el bloque de firma en una página propia.
- Regla BR-EDITOR-026: La presentación refleja el estado real de la firma: vigente, pendiente u obsoleta cuando la especificación cambió después de firmarse.

#### Escenario: REQ-EDITOR-009-S1 — Presentación completa
- **CUANDO** se presenta un cambio que tiene propuesta, especificación y mockups
- **ENTONCES** la página los reúne en el orden esperado, con una guía de secciones navegable y el bloque de firma visible

#### Escenario: REQ-EDITOR-009-S2 — Cambio sin mockups
- **CUANDO** el cambio no declara mockups
- **ENTONCES** la presentación lo indica y no deja la sección vacía

#### Escenario: REQ-EDITOR-009-S3 — Cambio sin propuesta
- **CUANDO** el cambio no tiene propuesta escrita
- **ENTONCES** la presentación lo indica y sigue mostrando la especificación y los mockups

#### Escenario: REQ-EDITOR-009-S4 — Imprimir o guardar como PDF
- **CUANDO** el equipo imprime la presentación o la guarda como PDF
- **ENTONCES** el contenido sale completo, con los mockups visibles y el bloque de firma en una página propia

#### Escenario: REQ-EDITOR-009-S5 — Firma obsoleta
- **CUANDO** la especificación cambió después de firmarse
- **ENTONCES** la presentación lo indica y no muestra la firma como vigente

#### Escenario: REQ-EDITOR-009-S6 — Mockup declarado que falta
- **CUANDO** un mockup declarado no existe al generar la presentación
- **ENTONCES** se avisa del faltante y la presentación sigue siendo válida

### Requisito: REQ-EDITOR-010 — La documentación en tres formatos
El equipo necesita que los documentos técnico y manual salgan además del texto fuente en HTML y PDF, para entregarlos a quien no trabaja en el repositorio sin depender de herramientas externas.

- Regla BR-EDITOR-027: Cada documento se produce en su texto fuente y en HTML y PDF con el mismo contenido; el PDF se genera localmente, sin servicios externos.
- Regla BR-EDITOR-028: Si un formato no se puede generar, se avisa con el motivo y los demás quedan disponibles.
- Regla BR-EDITOR-029: Regenerar la documentación actualiza todos sus formatos sin duplicar secciones ni perder lo escrito a mano.

#### Escenario: REQ-EDITOR-010-S1 — Los dos documentos en todos los formatos
- **CUANDO** el equipo documenta un cambio pidiendo los dos documentos
- **ENTONCES** quedan el técnico y el manual en texto fuente, HTML y PDF, con el mismo contenido

#### Escenario: REQ-EDITOR-010-S2 — Un solo documento
- **CUANDO** el equipo pide solo uno de los dos documentos
- **ENTONCES** se generan sus formatos y el otro documento no se toca

#### Escenario: REQ-EDITOR-010-S3 — Un formato no se puede generar
- **CUANDO** el PDF no se puede generar
- **ENTONCES** se avisa con el motivo y quedan disponibles el texto fuente y el HTML

#### Escenario: REQ-EDITOR-010-S4 — Regenerar la documentación
- **CUANDO** se vuelve a documentar un cambio ya documentado
- **ENTONCES** todos sus formatos se actualizan sin duplicar secciones ni perder lo escrito a mano

#### Escenario: REQ-EDITOR-010-S5 — Documentación sin evidencia
- **CUANDO** el cambio aún no tiene evidencia registrada
- **ENTONCES** los formatos se generan igualmente y señalan lo que queda pendiente, sin inventarlo

### Requisito: REQ-EDITOR-011 — La revisión y el análisis entran en el flujo
El equipo necesita que el flujo no salte de la verificación al archivo: la revisión de código y el análisis del cambio deben ser pasos visibles del ciclo, con su acción en el panel y su artefacto en el cambio, aunque no bloqueen el archivado en el carril estándar.

- Regla BR-EDITOR-031: El flujo del carril estándar y del completo incluye Revisar (con asistente) y Analizar (local) entre verificar y archivar; cada paso muestra su actor y su acción.
- Regla BR-EDITOR-032: La revisión y el análisis se marcan hechos cuando su artefacto existe en el cambio; si no existen, el panel los ofrece como pasos recomendados u opcionales antes de archivar, sin impedir el archivado del carril estándar.

#### Escenario: REQ-EDITOR-011-S1 — Revisión en el flujo
- **CUANDO** el cambio está verificado
- **ENTONCES** el flujo muestra Revisar como paso vigente con su acción y, cuando la revisión queda registrada, el paso aparece hecho

#### Escenario: REQ-EDITOR-011-S2 — Análisis en el flujo
- **CUANDO** el cambio está verificado
- **ENTONCES** el flujo ofrece Analizar con su acción y, cuando el informe existe, el paso aparece hecho

#### Escenario: REQ-EDITOR-011-S3 — Archivado sin revisión en el carril estándar
- **CUANDO** un cambio del carril estándar llega al archivado sin revisión ni análisis
- **ENTONCES** el archivado no se bloquea por ello y el panel los muestra como pasos recomendados u opcionales

#### Escenario: REQ-EDITOR-011-S4 — Carril completo con revisión y análisis
- **CUANDO** un cambio del carril completo llega verificado
- **ENTONCES** el flujo muestra Revisar, Analizar, Documentar y los contratos antes de archivar, en ese orden

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

### Requisito: REQ-EDITOR-015 — El panel lateral acompaña al archivo abierto
Quien trabaja pasa el día en los archivos, no en el panel. Hoy abre la especificación de un cambio y el panel lateral sigue mostrando otro, así que las acciones que ofrece no son las del trabajo que tiene delante. El panel debe seguir al archivo abierto, y los propios archivos deben decir en qué estado están sin necesidad de abrirlos.

- Regla BR-EDITOR-025: al abrir un artefacto de un cambio, ese cambio queda seleccionado y las acciones del panel pasan a ser las suyas.
- Regla BR-EDITOR-026: un archivo que no pertenece a ningún cambio no altera la selección vigente.
- Regla BR-EDITOR-027: los archivos del flujo muestran su estado junto a su nombre; lo que bloquea el avance se distingue de lo que solo avisa y tiene prioridad sobre la fase.
- Regla BR-EDITOR-028: una tarea se marca como hecha desde el propio panel, y el cambio queda escrito en el artefacto de tareas sin alterar el resto de su contenido.

#### Escenario: REQ-EDITOR-015-S1 — Abrir el artefacto de otro cambio
- **CUANDO** se abre un artefacto perteneciente a un cambio distinto del seleccionado
- **ENTONCES** el panel pasa a mostrar ese cambio y sus acciones

#### Escenario: REQ-EDITOR-015-S2 — Abrir un archivo ajeno al flujo
- **CUANDO** se abre un archivo que no pertenece a ningún cambio
- **ENTONCES** la selección del panel se mantiene como estaba

#### Escenario: REQ-EDITOR-015-S3 — Un archivo con hallazgos que bloquean
- **CUANDO** un artefacto acumula hallazgos que bloquean el avance
- **ENTONCES** junto a su nombre aparece cuántos son, distinguidos de los avisos

#### Escenario: REQ-EDITOR-015-S4 — Un archivo sin hallazgos
- **CUANDO** un artefacto no tiene hallazgos
- **ENTONCES** junto a su nombre aparece la fase en la que está su cambio

#### Escenario: REQ-EDITOR-015-S5 — Marcar una tarea como hecha
- **CUANDO** se marca una tarea desde el panel
- **ENTONCES** queda registrada como hecha en el artefacto de tareas, conservando lo demás que declara esa tarea

#### Escenario: REQ-EDITOR-015-S6 — La tarea ya no está donde se creía
- **CUANDO** se marca una tarea cuyo texto ya no corresponde a una tarea del artefacto
- **ENTONCES** no se escribe nada y se avisa de que hay que revisarlo a mano

### Requisito: REQ-EDITOR-016 — Más de una carpeta de proyecto en la misma ventana
Un equipo abre a la vez el servicio y su cliente, o dos productos que comparten specs. Hoy el editor solo atiende a la primera carpeta: el estado, la salud y el asistente que se abre corresponden a un proyecto mientras el árbol muestra los de todos, así que se ve una cosa y se actúa sobre otra.

- Regla BR-EDITOR-029: el trabajo en curso, la salud y el recuento de hallazgos abarcan todas las carpetas de proyecto abiertas.
- Regla BR-EDITOR-030: con más de una carpeta, cada cambio indica a qué proyecto pertenece.
- Regla BR-EDITOR-031: cada acción se ejecuta en el proyecto de su cambio, con el asistente que ese proyecto tiene configurado.

#### Escenario: REQ-EDITOR-016-S1 — Dos proyectos con trabajo en curso
- **CUANDO** la ventana tiene dos carpetas de proyecto con cambios en curso
- **ENTONCES** el panel lista los cambios de ambas, y cada uno indica su proyecto

#### Escenario: REQ-EDITOR-016-S2 — La salud es la del conjunto
- **CUANDO** una de las carpetas tiene hallazgos que bloquean
- **ENTONCES** la sección de salud y el recuento anunciado los incluyen, sin importar en qué carpeta estén

#### Escenario: REQ-EDITOR-016-S3 — Cada acción en su proyecto
- **CUANDO** se ejecuta la siguiente acción de un cambio
- **ENTONCES** se ejecuta en la carpeta de ese cambio y con el asistente configurado en ese proyecto

#### Escenario: REQ-EDITOR-016-S4 — Una sola carpeta
- **CUANDO** la ventana tiene una única carpeta de proyecto
- **ENTONCES** los cambios no repiten el nombre del proyecto

### Requisito: REQ-EDITOR-017 — El editor solo ofrece lo que puede hacer
Ofrecer una acción que no va a funcionar cuesta más que no ofrecerla: quien la elige espera un resultado y no recibe nada. Las acciones del editor deben estar disponibles solo cuando tienen sentido, y los ajustes que se ofrecen deben tener efecto.

- Regla BR-EDITOR-032: una acción que necesita un proyecto inicializado no se ofrece mientras no lo haya.
- Regla BR-EDITOR-033: una acción que opera sobre un cambio no se ofrece mientras no haya ninguno.
- Regla BR-EDITOR-034: los ajustes ofrecidos tienen efecto observable; los que no lo tienen se retiran.

#### Escenario: REQ-EDITOR-017-S1 — Proyecto sin inicializar
- **CUANDO** se buscan las acciones del editor en un proyecto que no usa el flujo
- **ENTONCES** solo se ofrecen inicializar y adoptar

#### Escenario: REQ-EDITOR-017-S2 — Proyecto sin cambios
- **CUANDO** el proyecto está inicializado y no tiene ningún cambio
- **ENTONCES** las acciones que operan sobre un cambio no se ofrecen

#### Escenario: REQ-EDITOR-017-S3 — Ajustes sin efecto
- **CUANDO** se revisan los ajustes que ofrece el editor
- **ENTONCES** cada uno tiene un efecto observable en su comportamiento

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
