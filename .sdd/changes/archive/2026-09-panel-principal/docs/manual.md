<!-- specatlas:generado:inicio -->
# Manual de usuario — Un panel principal único para la extensión

> **Cambio**: `panel-principal` · **Dominio**: editor · **Actualizado**: 2026-09-21
>
> Este manual explica cómo se usa lo que el cambio entrega: qué verás, qué puedes hacer y qué ocurre en cada caso.

## 1. Qué es y qué resuelve

- Un **panel principal único** con secciones internas: Resumen, Flujo, Trazabilidad, Métricas y Documentos.
- Las **acciones del ciclo** (crear, validar, diagnosticar, compilar adaptadores, verificar, aprobar, archivar, mockups) se ofrecen desde el panel según el estado del proyecto y del cambio activo, con las mismas reglas y auditoría que ya existen.
- Los **documentos del cambio y sus mockups** se leen dentro del panel, sin ventanas adicionales.
- El panel **se mantiene al día** solo (refleja lo hecho desde la terminal o el asistente) y conserva la sección y los filtros en uso.
- **Desaparecen las ventanas independientes** de matriz, tablero y métricas: su información pasa al panel principal.

### Por qué se hizo

Hoy la herramienta reparte su información en ventanas separadas (matriz de trazabilidad, tablero y métricas) más las vistas de documentos y mockups. Quien trabaja en un cambio debe abrir una ventana por tema, alternar entre ellas y pierde el hilo de lo que está haciendo.

Como responsable de un cambio, quiero un único panel principal que reúna el estado, el flujo, la trazabilidad, las métricas, los documentos y las acciones, para trabajar sin dispersarme y tener un solo lugar donde mirar.

## 2. Antes de empezar

- **Dependencia nueva**: `pdf-lib` en `@specatlas/render` (pura JavaScript, sin servicios externos).
- **Supuestos**: la extensión sigue siendo la única superficie del editor; el índice del LSP expone lo que necesitan las secciones; `opencode` está disponible en el PATH del proyecto (si no, se usa el respaldo de copiar).
- **Talla y confianza**: el cambio es **grande** (5 bloques, 23 tareas); confianza **alta** en las secciones que reutilizan código existente y **media** en el PDF local (layout propio) y en el rediseño de la presentación (juicio visual del usuario sobre el contrato aprobado).

## 3. Primeros pasos

Recorrido corto, en orden, para ver la funcionalidad completa por primera vez.

1. **Abrir el panel principal** — El equipo abre la herramienta desde su punto de entrada. Se abre una única ventana con la sección de resumen activa y el estado del proyecto.
2. **Proyecto con cambios activos** — Se abre el resumen y hay cambios activos. Se muestran los indicadores del proyecto y cada cambio con su estado, su carril, su avance y su siguiente acción.
3. **Cambios en distintas fases** — Se abre el flujo y hay cambios activos. Cada uno aparece en la fase que le corresponde con su avance y su siguiente acción.
4. **Todo verificado** — Todos los escenarios tienen tarea y evidencia favorable. La sección lo indica de forma expresa.
5. **Proyecto con actividad** — Se abre la sección de métricas y hay actividad. Se muestran la evidencia, los cierres por mes, la antigüedad del trabajo en curso, la distribución por carril y el trabajo por fase.
6. **Abrir un documento del cambio** — El equipo elige un documento existente del cambio. Su contenido se muestra en el panel.
7. **Acción válida** — El equipo ejecuta desde el panel una acción válida para el estado. La acción se ejecuta y su resultado se refleja en el panel.
8. **Cambio hecho fuera del panel** — Los artefactos cambian desde la terminal o el asistente. El panel lo refleja sin intervención del equipo.

## 4. Las pantallas, una por una

### Panel principal — Resumen y siguiente acción

Archivo del mockup: `panel-resumen.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Abrir el panel principal
- Cambiar de sección
- El panel ya estaba abierto
- Proyecto con cambios activos
- Proyecto al día
- Puntos que requieren atención
- Proyecto sin cambios activos
- Proyecto sin historial

### Panel principal — Flujo de cambios por fase

Archivo del mockup: `panel-flujo.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Cambios en distintas fases
- Cambio bloqueado
- Filtros del flujo
- Proyecto sin cambios activos

### Panel principal — Trazabilidad requisito → evidencia

Archivo del mockup: `panel-trazabilidad.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Requisito con huecos
- Todo verificado
- Sin requisitos
- Filtros de la trazabilidad
- Abrir un identificador

### Panel principal — Métricas del proceso

Archivo del mockup: `panel-metricas.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Proyecto con actividad
- Puntos de atención
- Proyecto sin actividad

### Panel principal — Documentos y mockups del cambio

Archivo del mockup: `panel-documentos.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Abrir un documento del cambio
- Documento ausente
- Mockups del cambio
- Cambio sin mockups
- Mockups desactualizados
- Documento ilegible

### Panel principal — Acciones del ciclo

Archivo del mockup: `panel-acciones.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Acción válida
- Acción no válida
- Acción humana sin nombre
- Acción que falla
- Acción con asistente
- El asistente no se puede abrir
- El flujo completo, en orden y por carril
- Crear un cambio desde el panel
- Ejecutar un paso ya pasado u omitido

### Panel principal — Estados, vacíos y panel vivo

Archivo del mockup: `panel-estados.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Proyecto sin inicializar
- Sin proyecto abierto
- Cambio hecho fuera del panel
- Contexto conservado
- Sin cambios
- Actualización fallida

### Presentación para aprobar — propuesta, especificación y mockups

Archivo del mockup: `presentacion.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Presentación completa
- Cambio sin mockups
- Cambio sin propuesta
- Imprimir o guardar como PDF
- Firma obsoleta
- Mockup declarado que falta

### Documentación — texto fuente, HTML y PDF

Archivo del mockup: `docs-formatos.html` · Estados: default, loading, empty, error

**Qué encuentras aquí**

- Los dos documentos en todos los formatos
- Un solo documento
- Un formato no se puede generar
- Regenerar la documentación
- Documentación sin evidencia

## 5. Cómo se usa, tarea por tarea

### Un único panel principal reúne el trabajo

El equipo necesita un solo punto de entrada en el editor: hoy el estado, el flujo de los cambios, la trazabilidad y las métricas viven en ventanas separadas, hay que abrir una para cada tema y el trabajo queda disperso. Un panel principal único, con secciones internas, reúne la información y las acciones en un mismo lugar.

| Qué haces | Qué ocurre |
|---|---|
| El equipo abre la herramienta desde su punto de entrada | Se abre una única ventana con la sección de resumen activa y el estado del proyecto |
| El equipo elige otra sección del panel | Su contenido reemplaza al anterior en la misma ventana, sin abrir otra |
| Se pide abrir el panel o una de sus secciones con el panel ya abierto | Se reutiliza la ventana existente y la sección pedida queda activa |

### Resumen: salud del proyecto y siguiente acción

El equipo necesita, al abrir la herramienta, saber de un vistazo cómo está el proyecto y qué hacer ahora, sin interpretar datos por su cuenta.

| Qué haces | Qué ocurre |
|---|---|
| Se abre el resumen y hay cambios activos | Se muestran los indicadores del proyecto y cada cambio con su estado, su carril, su avance y su siguiente acción |
| Hay bloqueos, hallazgos o evidencia pendiente | El resumen los destaca con su motivo y la acción que los atiende |

### Sección Flujo: el avance de los cambios por fase

El equipo necesita seguir el avance de cada cambio por las fases del ciclo desde el panel principal, sin abrir el tablero aparte.

| Qué haces | Qué ocurre |
|---|---|
| Se abre el flujo y hay cambios activos | Cada uno aparece en la fase que le corresponde con su avance y su siguiente acción |
| El equipo filtra por texto, carril o dominio | Solo quedan visibles los cambios que cumplen el filtro y los conteos por fase se ajustan, sin alterar los datos |

### Sección Trazabilidad: requisito, escenario, tarea y evidencia

El equipo necesita comprobar la trazabilidad completa desde el panel principal, con los huecos primero, sin abrir la matriz aparte.

| Qué haces | Qué ocurre |
|---|---|
| Todos los escenarios tienen tarea y evidencia favorable | La sección lo indica de forma expresa |
| El equipo filtra por texto, estado, dominio, cambio o procedencia | Solo quedan visibles los requisitos que cumplen el filtro y el conteo lo refleja |
| El equipo elige un identificador de requisito o de escenario | Se abre su artefacto en la línea correspondiente, sin abrir ventanas adicionales del panel |

### Sección Métricas: la salud del proceso

El equipo necesita las métricas del proceso (evidencia, cierres por mes, antigüedad del trabajo, distribución por carril, trabajo en curso y puntos de atención) dentro del panel principal.

| Qué haces | Qué ocurre |
|---|---|
| Se abre la sección de métricas y hay actividad | Se muestran la evidencia, los cierres por mes, la antigüedad del trabajo en curso, la distribución por carril y el trabajo por fase |
| Hay bloqueos, trabajo antiguo o evidencia pendiente | Se listan con su motivo |

### Documentos y mockups dentro del panel

El equipo necesita leer los documentos del cambio y ver sus mockups dentro del panel, sin abrir ventanas adicionales ni perder el contexto.

| Qué haces | Qué ocurre |
|---|---|
| El equipo elige un documento existente del cambio | Su contenido se muestra en el panel |
| El cambio declara mockups existentes | Se ven en el panel, pantalla a pantalla |

### Acciones del ciclo desde el panel

El equipo necesita ejecutar desde el panel las acciones del ciclo, con las mismas reglas y registros que ya rigen la herramienta.

| Qué haces | Qué ocurre |
|---|---|
| El equipo ejecuta desde el panel una acción válida para el estado | La acción se ejecuta y su resultado se refleja en el panel |
| El equipo pide una acción que requiere un asistente | Se abre el asistente en una terminal del proyecto con la instrucción de esa acción ya dirigida |
| El equipo abre la sección de acciones | Ve los pasos del ciclo en orden, agrupados por carril, con el paso actual marcado y el actor de cada paso |
| El equipo crea un cambio desde el panel | El panel pide carril, título y dominio, y el cambio queda en el primer paso del flujo de su carril |

### El panel se mantiene al día sin perder el contexto

El equipo necesita que el panel refleje los cambios hechos desde la terminal o el asistente sin recargarlo a mano y sin perder dónde estaba.

| Qué haces | Qué ocurre |
|---|---|
| Los artefactos cambian desde la terminal o el asistente | El panel lo refleja sin intervención del equipo |
| El panel se actualiza | La sección activa y los filtros en uso se conservan |

### La presentación para aprobar

El equipo necesita una página de presentación que reúna lo que se va a aprobar —la propuesta, la especificación y los mockups— con un diseño legible y navegable, porque la presentación actual no invita a leer ni a firmar y la aprobación es un acto humano.

| Qué haces | Qué ocurre |
|---|---|
| Se presenta un cambio que tiene propuesta, especificación y mockups | La página los reúne en el orden esperado, con una guía de secciones navegable y el bloque de firma visible |
| El equipo imprime la presentación o la guarda como PDF | El contenido sale completo, con los mockups visibles y el bloque de firma en una página propia |

### La documentación en tres formatos

El equipo necesita que los documentos técnico y manual salgan además del texto fuente en HTML y PDF, para entregarlos a quien no trabaja en el repositorio sin depender de herramientas externas.

| Qué haces | Qué ocurre |
|---|---|
| El equipo documenta un cambio pidiendo los dos documentos | Quedan el técnico y el manual en texto fuente, HTML y PDF, con el mismo contenido |
| El equipo pide solo uno de los dos documentos | Se generan sus formatos y el otro documento no se toca |
| Se vuelve a documentar un cambio ya documentado | Todos sus formatos se actualizan sin duplicar secciones ni perder lo escrito a mano |

### La revisión y el análisis entran en el flujo

El equipo necesita que el flujo no salte de la verificación al archivo: la revisión de código y el análisis del cambio deben ser pasos visibles del ciclo, con su acción en el panel y su artefacto en el cambio, aunque no bloqueen el archivado en el carril estándar.

| Qué haces | Qué ocurre |
|---|---|
| El cambio está verificado | El flujo muestra Revisar como paso vigente con su acción y, cuando la revisión queda registrada, el paso aparece hecho |
| El cambio está verificado | El flujo ofrece Analizar con su acción y, cuando el informe existe, el paso aparece hecho |
| Un cambio del carril completo llega verificado | El flujo muestra Revisar, Analizar, Documentar y los contratos antes de archivar, en ese orden |

## 6. Qué ves cuando todavía no hay nada

| Situación | Qué hace la herramienta |
|---|---|
| **Proyecto sin inicializar** — El proyecto no está inicializado | El panel lo indica y ofrece la acción de inicializar, sin mostrar secciones con datos inexistentes |
| **Sin proyecto abierto** — No hay una carpeta de proyecto abierta | El panel lo indica y no ofrece acciones que requieran proyecto |
| **Proyecto al día** — No hay bloqueos, hallazgos ni evidencia pendiente | El resumen lo indica de forma expresa |
| **Proyecto sin cambios activos** — No hay cambios activos | El resumen lo indica y ofrece crear uno |
| **Proyecto sin historial** — El proyecto no tiene cambios archivados | El resumen lo indica sin presentar datos de archivo |
| **Proyecto sin cambios activos** — No hay cambios activos | El flujo lo indica y no muestra fases con datos inexistentes |
| **Requisito con huecos** — Hay escenarios sin tarea o sin evidencia | Aparecen primero y se distinguen de los verificados |
| **Sin requisitos** — El proyecto no tiene requisitos | La sección lo indica y señala cómo empezar |
| **Proyecto sin actividad** — No hay cambios ni archivos | La sección lo indica sin presentar indicadores inexistentes |
| **Documento ausente** — El equipo elige un documento que aún no existe | Se indica que no existe y cuál es la acción que lo produce |
| **Cambio sin mockups** — El cambio no declara mockups | Se indica y no se muestra contenido de ejemplo |
| **Acción humana sin nombre** — Una acción humana se pide sin indicar quién la ejecuta | No se ejecuta y se pide el nombre |
| **Sin cambios** — Nada cambia en el proyecto | El panel permanece igual |
| **Cambio sin mockups** — El cambio no declara mockups | La presentación lo indica y no deja la sección vacía |
| **Cambio sin propuesta** — El cambio no tiene propuesta escrita | La presentación lo indica y sigue mostrando la especificación y los mockups |
| **Mockup declarado que falta** — Un mockup declarado no existe al generar la presentación | Se avisa del faltante y la presentación sigue siendo válida |
| **Documentación sin evidencia** — El cambio aún no tiene evidencia registrada | Los formatos se generan igualmente y señalan lo que queda pendiente, sin inventarlo |
| **Archivado sin revisión en el carril estándar** — Un cambio del carril estándar llega al archivado sin revisión ni análisis | El archivado no se bloquea por ello y el panel los muestra como pasos recomendados u opcionales |

Un estado vacío no es un error: la herramienta indica qué falta y qué acción lo produce.

## 7. Problemas frecuentes y qué hacer

| Situación | Qué hace la herramienta |
|---|---|
| **Cambio bloqueado** — Un cambio tiene un bloqueo | Aparece con el motivo del bloqueo |
| **Mockups desactualizados** — Los mockups cambiaron respecto de la especificación | Se avisa que están desactualizados |
| **Documento ilegible** — Un documento no se puede leer | Se informa el motivo y no se muestra contenido parcial |
| **Acción no válida** — El equipo pide una acción que no aplica al estado | El panel explica por qué no aplica y no la ejecuta |
| **Acción que falla** — Una acción falla | El panel informa el motivo y el proyecto queda sin cambios a medias |
| **El asistente no se puede abrir** — El asistente no se puede abrir | La instrucción queda disponible para copiarla y se informa el motivo |
| **Ejecutar un paso ya pasado u omitido** — El equipo quiere ejecutar un paso que ya pasó o que quedó omitido | Encuentra su acción en el propio paso y puede ejecutarla, o ve el motivo por el que no aplica |
| **Actualización fallida** — Una actualización no puede completarse | Se informa el motivo y se conserva la última información válida |
| **Firma obsoleta** — La especificación cambió después de firmarse | La presentación lo indica y no muestra la firma como vigente |
| **Un formato no se puede generar** — El PDF no se puede generar | Se avisa con el motivo y quedan disponibles el texto fuente y el HTML |

En todos estos casos la herramienta explica el motivo y no deja el trabajo a medias: corrige lo que indica y vuelve a intentarlo.

## 8. Reglas que conviene conocer

- `BR-EDITOR-001` — El panel principal es el único punto de entrada de la herramienta en el editor y reúne, en secciones internas, el resumen, el flujo de los cambios, la trazabilidad, las métricas, los documentos y las acciones; cambiar de sección no abre ventanas nuevas.
- `BR-EDITOR-002` — El panel principal es único: si ya está abierto, pedirlo de nuevo lo reutiliza y activa la sección pedida; nunca se duplica.
- `BR-EDITOR-003` — Las ventanas independientes de matriz, tablero y métricas dejan de existir; su información se consulta en el panel principal.
- `BR-EDITOR-004` — El resumen muestra los indicadores del proyecto (cambios activos, avance de tareas, evidencia y hallazgos) y, por cada cambio activo, su estado, su carril, su avance y su siguiente acción.
- `BR-EDITOR-005` — El resumen solo muestra lo registrado; lo que no existe se indica como ausente, sin inventarlo.
- `BR-EDITOR-006` — Cuando hay puntos que requieren atención (bloqueos, hallazgos o evidencia pendiente), el resumen los destaca con su motivo y la acción sugerida.
- `BR-EDITOR-007` — El flujo muestra las fases del ciclo con los cambios que están en cada una, con su carril, su dominio, su avance de tareas y evidencia y, si lo tienen, su bloqueo.
- `BR-EDITOR-008` — Los filtros del flujo (texto, carril y dominio) acotan lo visible sin alterar los datos ni recargar el panel; el conteo por fase refleja lo filtrado.
- `BR-EDITOR-009` — La trazabilidad muestra cada requisito con sus escenarios, las tareas que los cubren, la evidencia de cada escenario y su procedencia (cambios y fixes), con los huecos primero.
- `BR-EDITOR-010` — Los filtros (texto, estado, dominio, cambio y procedencia) acotan lo visible sin alterar los datos; el conteo refleja lo filtrado.
- `BR-EDITOR-011` — Cada identificador abre su artefacto en la línea exacta dentro del editor.
- `BR-EDITOR-012` — Las métricas se calculan localmente; el panel no envía datos fuera del equipo.
- `BR-EDITOR-013` — Las métricas mostradas son las mismas que ya ofrece la herramienta; el panel no inventa indicadores.
- `BR-EDITOR-014` — El panel ofrece los documentos del cambio (propuesta, especificación, aclaraciones, plan, tareas, verificación, documentación, presentación y fix, cuando existan) y los muestra en su propia sección; los documentos ausentes se indican como tales.
- `BR-EDITOR-015` — Los mockups del cambio se ven dentro del panel, pantalla a pantalla; si el cambio no los declara se indica, y si están desactualizados se avisa.
- `BR-EDITOR-016` — Un documento que no se puede leer se informa con su motivo, sin mostrar contenido incompleto.
- `BR-EDITOR-017` — El panel ofrece las acciones válidas para el estado del proyecto y del cambio activo; las que no aplican no se ofrecen y, si se piden, se explica por qué no aplican.
- `BR-EDITOR-018` — Las acciones humanas (aprobar y archivar) conservan sus reglas: piden quién las ejecuta y quedan auditadas con nombre y fecha.
- `BR-EDITOR-019` — Una acción que falla informa el motivo y no deja el trabajo a medias.
- `BR-EDITOR-020` — Las acciones que requieren un asistente abren el asistente en una terminal del proyecto con la instrucción de la acción ya dirigida; la acción no se ejecuta por sí sola.
- `BR-EDITOR-021` — Si el asistente no se puede abrir, la instrucción queda disponible para copiarla y se informa el motivo.
- `BR-EDITOR-022` — Las acciones se presentan en el orden del ciclo y agrupadas por carril (express, estándar y completo), con el paso actual marcado y el actor de cada paso (asistente, persona o local), de modo que el flujo completo de un cambio se pueda recorrer desde el panel.
- `BR-EDITOR-023` — Crear un cambio desde el panel pide carril, título y dominio, y lo deja en el primer paso del flujo de su carril.
- `BR-EDITOR-030` — Cada paso del flujo ofrece su acción en el propio paso (o explica por qué no aplica); ninguna acción queda escondida detrás de un botón genérico.
- `BR-EDITOR-021` — El panel se actualiza solo cuando cambian los artefactos del proyecto; la sección activa y los filtros en uso se conservan.
- `BR-EDITOR-022` — Sin cambios en el proyecto, el panel no se altera.
- `BR-EDITOR-023` — Una actualización que falla se informa y no deja el panel en un estado incompleto.
- `BR-EDITOR-024` — La presentación reúne, en este orden, la identidad del cambio (nombre, carril, dominio, versión, fecha y huella), el resumen de negocio, la especificación con sus requisitos y escenarios, los mockups y el bloque de firma; con una guía de secciones navegable y sin recursos externos.
- `BR-EDITOR-025` — La presentación se puede imprimir o guardar como PDF con el contenido completo, sin cortes que oculten información y con el bloque de firma en una página propia.
- `BR-EDITOR-026` — La presentación refleja el estado real de la firma: vigente, pendiente u obsoleta cuando la especificación cambió después de firmarse.
- `BR-EDITOR-027` — Cada documento se produce en su texto fuente y en HTML y PDF con el mismo contenido; el PDF se genera localmente, sin servicios externos.
- `BR-EDITOR-028` — Si un formato no se puede generar, se avisa con el motivo y los demás quedan disponibles.
- `BR-EDITOR-029` — Regenerar la documentación actualiza todos sus formatos sin duplicar secciones ni perder lo escrito a mano.
- `BR-EDITOR-031` — El flujo del carril estándar y del completo incluye Revisar (con asistente) y Analizar (local) entre verificar y archivar; cada paso muestra su actor y su acción.
- `BR-EDITOR-032` — La revisión y el análisis se marcan hechos cuando su artefacto existe en el cambio; si no existen, el panel los ofrece como pasos recomendados u opcionales antes de archivar, sin impedir el archivado del carril estándar.

## 9. Glosario

- **Panel principal** _(Panel único)_: La única ventana de trabajo de la herramienta en el editor; reúne el resumen, el flujo, la trazabilidad, las métricas, los documentos y las acciones
- **Sección** _(Pestaña)_: Cada una de las partes internas del panel principal (Resumen, Flujo, Trazabilidad, Métricas y Documentos)
- **Artefacto del cambio** _(Documento)_: Documento del ciclo de un cambio (propuesta, especificación, aclaraciones, plan, tareas, verificación, documentación y presentación)
- **Mockup** _(Prototipo visual)_: Contrato visual de la propuesta de un cambio; ilustra la interfaz sin ser funcional

## 10. Cómo se comprobó

Se comprobaron 56 de 56 escenario(s) (52 ejecutable, 4 semiautomático). El detalle, con comandos y resultados, está en la documentación técnica.

| Requisito | Escenarios | Con evidencia favorable |
|---|---|---|
| Un único panel principal reúne el trabajo | 5 | 5 |
| Resumen: salud del proyecto y siguiente acción | 5 | 5 |
| Sección Flujo: el avance de los cambios por fase | 4 | 4 |
| Sección Trazabilidad: requisito, escenario, tarea y evidencia | 5 | 5 |
| Sección Métricas: la salud del proceso | 3 | 3 |
| Documentos y mockups dentro del panel | 6 | 6 |
| Acciones del ciclo desde el panel | 9 | 9 |
| El panel se mantiene al día sin perder el contexto | 4 | 4 |
| La presentación para aprobar | 6 | 6 |
| La documentación en tres formatos | 5 | 5 |
| La revisión y el análisis entran en el flujo | 4 | 4 |
<!-- specatlas:generado:fin -->

## Notas

(Escribe aquí lo que quieras conservar entre regeneraciones.)
