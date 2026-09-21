# Delta — Un panel principal único para la extensión

## Requisitos agregados

### Requisito: REQ-EDITOR-001 — Un único panel principal reúne el trabajo
El equipo necesita un solo punto de entrada en el editor: hoy el estado, el flujo de los cambios, la trazabilidad y las métricas viven en ventanas separadas, hay que abrir una para cada tema y el trabajo queda disperso. Un panel principal único, con secciones internas, reúne la información y las acciones en un mismo lugar.

- Regla BR-EDITOR-001: El panel principal es el único punto de entrada de la herramienta en el editor y reúne, en secciones internas, el resumen, el flujo de los cambios, la trazabilidad, las métricas, los documentos y las acciones; cambiar de sección no abre ventanas nuevas.
- Regla BR-EDITOR-002: El panel principal es único: si ya está abierto, pedirlo de nuevo lo reutiliza y activa la sección pedida; nunca se duplica.
- Regla BR-EDITOR-003: Las ventanas independientes de matriz, tablero y métricas dejan de existir; su información se consulta en el panel principal.

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

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: editor -->
