<!-- specatlas:generado:inicio -->
# Manual de usuario — Rediseño del panel lateral y la extensión

> **Cambio**: `rediseno-editor` · **Dominio**: editor · **Actualizado**: 2026-09-21
>
> Este manual explica cómo se usa lo que el cambio entrega: qué verás, qué puedes hacer y qué ocurre en cada caso.

## 1. Qué es y qué resuelve

- El panel lateral abre con una sección dedicada a **lo que toca hacer ahora**: el cambio en curso desplegado, su siguiente acción como primer elemento, quién la ejecuta, y junto a ella los bloqueos, el avance de tareas y evidencia, la revisión y los mockups.
- Una sección de **salud** agrupa los hallazgos por lo que hay que hacer con ellos: los que bloquean el avance, los que solo avisan y la deriva entre las specs vivas y el código. Cada hallazgo abre su archivo y permite consultar la explicación de su código.
- El **estado del trabajo acompaña en la barra del editor**: el cambio en foco y el paso que toca, distinguido visualmente cuando está bloqueado.
- El proyecto que todavía no usa el flujo recibe una **bienvenida** que explica qué es y ofrece inicializarlo o adoptarlo.
- El árbol del workspace deja de anidar todo bajo el nombre del proyecto cuando solo hay uno, y los cambios pasan a estar arriba.
- El panel principal suma la sección **Código**, que relaciona las specs vivas con el repositorio: referencias comprobadas, las que dejaron de existir y el estado de la revisión.

### Por qué se hizo

Como desarrollador que trabaja con el flujo todos los días, quiero abrir el editor y ver de inmediato qué me toca hacer, para no perder tiempo recordando en qué fase quedó cada cambio ni recorriendo el árbol del proyecto.

Hoy el panel lateral muestra el proyecto como un árbol: para llegar a la acción que toca hay que abrir el nodo del proyecto, luego el grupo de cambios, luego el cambio. La información más útil —qué sigue, qué está bloqueado, qué detiene el avance— queda a tres niveles de profundidad. Los hallazgos llegan como una lista plana donde un aviso menor pesa lo mismo que algo que detiene el trabajo. Y lo que el flujo aprendió a comprobar recientemente —si el código se movió por debajo de las specs vivas y si la revisión quedó cerrada— no se ve en ninguna parte del editor.

## 2. Antes de empezar

- `@specatlas/core` ya expone `checkDrift`, `loadAllAnchors`, `pruneAnchors`, `reviewPassed`, `openBlockingFindings`, `explainDiagnostic` e `impactOf*`.
- La lógica de la interfaz se prueba con `vitest` sobre los módulos puros; no se requiere `@vscode/test-electron` para este cambio.

## 3. Primeros pasos

Recorrido corto, en orden, para ver la funcionalidad completa por primera vez.

1. **Un cambio en curso** — El equipo abre el editor con un cambio en curso. La primera sección del panel lateral muestra ese cambio desplegado y su primer elemento es la siguiente acción, con el actor que la ejecuta.
2. **Abrir un hallazgo** — El equipo elige un hallazgo. Se abre el archivo en la línea del hallazgo.
3. **Trabajo en curso** — Hay un cambio en curso. La barra de estado muestra su nombre y el paso que toca.
4. **Abrir el panel principal** — El equipo abre la herramienta desde su punto de entrada. Se abre una única ventana con la sección de resumen activa y el estado del proyecto.

## 4. Las pantallas, una por una

_Este cambio no declara mockups, así que no hay contrato visual que recorrer._

## 5. Cómo se usa, tarea por tarea

### El panel lateral abre con lo que toca hacer ahora

Al abrir el editor, el equipo necesita saber en un vistazo qué le toca hacer, sin recorrer el árbol del proyecto ni recordar en qué fase quedó cada cambio. La primera sección del panel lateral responde a esa única pregunta y deja la acción a un clic.

| Qué haces | Qué ocurre |
|---|---|
| El equipo abre el editor con un cambio en curso | La primera sección del panel lateral muestra ese cambio desplegado y su primer elemento es la siguiente acción, con el actor que la ejecuta |
| Hay más de un cambio en curso | Se listan todos, con el más urgente desplegado y el resto plegados |
| La siguiente acción del cambio es un acto que firma una persona | El elemento lo declara como tal y la herramienta no la ejecuta por su cuenta |

### Una sección de salud agrupa lo que hay que resolver

Los hallazgos llegan hoy como una lista plana en la que todo pesa igual. El equipo necesita distinguir lo que detiene el trabajo de lo que solo avisa, y ver aparte cuándo el código se movió por debajo de las specs vivas.

| Qué haces | Qué ocurre |
|---|---|
| El equipo elige un hallazgo | Se abre el archivo en la línea del hallazgo |
| El equipo pide la explicación del código de un hallazgo | Obtiene qué significa, por qué el flujo lo vigila y cómo se cierra |

### El estado del trabajo acompaña sin estorbar

El equipo trabaja en el código, no en el panel. Necesita saber en qué punto está el cambio sin cambiar de ventana, y encontrar la puerta de entrada cuando el proyecto todavía no usa el flujo.

| Qué haces | Qué ocurre |
|---|---|
| Hay un cambio en curso | La barra de estado muestra su nombre y el paso que toca |

### Un único panel principal reúne el trabajo

El equipo necesita un solo punto de entrada en el editor: hoy el estado, el flujo de los cambios, la trazabilidad y las métricas viven en ventanas separadas, hay que abrir una para cada tema y el trabajo queda disperso. Un panel principal único, con secciones internas, reúne la información y las acciones en un mismo lugar. Entre esas secciones está la que relaciona las specs vivas con el código: dónde vive cada requisito, si alguna de esas referencias dejó de existir y en qué estado quedó la revisión del cambio.

| Qué haces | Qué ocurre |
|---|---|
| El equipo abre la herramienta desde su punto de entrada | Se abre una única ventana con la sección de resumen activa y el estado del proyecto |
| El equipo elige otra sección del panel | Su contenido reemplaza al anterior en la misma ventana, sin abrir otra |
| Se pide abrir el panel o una de sus secciones con el panel ya abierto | Se reutiliza la ventana existente y la sección pedida queda activa |
| El equipo abre la sección que relaciona las specs vivas con el código | Ve cuántas referencias se comprobaron, cuáles dejaron de existir y el estado de la revisión del cambio en curso |

## 6. Qué ves cuando todavía no hay nada

| Situación | Qué hace la herramienta |
|---|---|
| **Sin cambios en curso** — El proyecto no tiene ningún cambio en curso | La sección ofrece crear un cambio, adoptar un proyecto existente o abrir el panel principal |
| **El código se movió** — Alguna ancla de una spec viva apunta a código que ya no existe | La deriva aparece como grupo propio, con el modo configurado y el motivo de cada ancla rota |
| **Proyecto sano** — No hay hallazgos ni anclas rotas | La sección lo declara en una sola línea, indicando cuántas anclas se comprobaron |
| **Proyecto sin el flujo** — El proyecto todavía no usa el flujo | El panel lateral explica qué es y ofrece inicializarlo o adoptar el proyecto existente |
| **Sin cambios en curso** — El proyecto usa el flujo pero no tiene cambios en curso | La barra de estado lo dice, sin inventar un paso pendiente |
| **Proyecto sin inicializar** — El proyecto no está inicializado | El panel lo indica y ofrece la acción de inicializar, sin mostrar secciones con datos inexistentes |
| **Sin proyecto abierto** — No hay una carpeta de proyecto abierta | El panel lo indica y no ofrece acciones que requieran proyecto |

Un estado vacío no es un error: la herramienta indica qué falta y qué acción lo produce.

## 7. Problemas frecuentes y qué hacer

| Situación | Qué hace la herramienta |
|---|---|
| **El cambio está bloqueado** — El cambio tiene bloqueos o hallazgos que detienen el avance | Aparecen junto a la acción, y los hallazgos llevan a la sección de salud |
| **Hallazgos de distinto peso** — El proyecto tiene hallazgos que bloquean y hallazgos que solo avisan | La sección de salud los presenta en grupos separados, cada uno con su conteo |
| **Trabajo bloqueado** — El cambio en foco está bloqueado o tiene hallazgos que detienen | La barra de estado lo distingue visualmente |

En todos estos casos la herramienta explica el motivo y no deja el trabajo a medias: corrige lo que indica y vuelve a intentarlo.

## 8. Reglas que conviene conocer

- `BR-EDITOR-012` — La primera sección del panel lateral muestra los cambios en curso, el más urgente desplegado, y su primer elemento es siempre la siguiente acción del cambio.
- `BR-EDITOR-013` — Cada siguiente acción declara quién la ejecuta —el asistente, una persona o la propia herramienta— y se lanza desde el mismo elemento.
- `BR-EDITOR-014` — Junto a la acción se muestran los bloqueos vigentes, los hallazgos que detienen el avance, el avance de tareas y evidencia, y el estado de la revisión y de los mockups cuando el cambio los declara.
- `BR-EDITOR-015` — Sin cambios en curso, la sección ofrece por dónde empezar: crear un cambio, adoptar un proyecto existente o abrir el panel principal.
- `BR-EDITOR-016` — La sección de salud agrupa los hallazgos en los que bloquean el avance y los que solo avisan, con el conteo de cada grupo.
- `BR-EDITOR-017` — La deriva entre las specs vivas y el código es un grupo propio, que indica el modo configurado y qué ancla dejó de existir.
- `BR-EDITOR-018` — Cada hallazgo abre el archivo y la línea donde ocurre, y permite consultar la explicación de su código.
- `BR-EDITOR-019` — Sin hallazgos ni deriva, la sección lo dice en una línea en vez de quedarse vacía.
- `BR-EDITOR-020` — El número de hallazgos que bloquean se anuncia en la propia sección, sin abrirla.
- `BR-EDITOR-021` — La barra de estado del editor muestra el cambio en foco y el paso que toca, y llevar al panel lateral desde ahí es un solo gesto.
- `BR-EDITOR-022` — Cuando el cambio está bloqueado, la barra de estado lo distingue visualmente.
- `BR-EDITOR-023` — Si el proyecto todavía no usa el flujo, el panel lateral explica qué es y ofrece inicializarlo o adoptar el proyecto existente.
- `BR-EDITOR-001` — El panel principal es el único punto de entrada de la herramienta en el editor y reúne, en secciones internas, el resumen, el flujo de los cambios, la trazabilidad, la relación con el código, las métricas, los documentos y las acciones; cambiar de sección no abre ventanas nuevas.
- `BR-EDITOR-002` — El panel principal es único: si ya está abierto, pedirlo de nuevo lo reutiliza y activa la sección pedida; nunca se duplica.
- `BR-EDITOR-003` — Las ventanas independientes de matriz, tablero y métricas dejan de existir; su información se consulta en el panel principal.
- `BR-EDITOR-024` — La sección que relaciona las specs con el código declara cuántas referencias se comprobaron, cuáles dejaron de existir y el estado de la revisión del cambio en curso.

## 9. Glosario

- **Panel principal** _(Panel único)_: La única ventana de trabajo de la herramienta en el editor; reúne el resumen, el flujo, la trazabilidad, las métricas, los documentos y las acciones
- **Sección** _(Pestaña)_: Cada una de las partes internas del panel principal (Resumen, Flujo, Trazabilidad, Métricas y Documentos)
- **Artefacto del cambio** _(Documento)_: Documento del ciclo de un cambio (propuesta, especificación, aclaraciones, plan, tareas, verificación, documentación y presentación)
- **Mockup** _(Prototipo visual)_: Contrato visual de la propuesta de un cambio; ilustra la interfaz sin ser funcional

## 10. Cómo se comprobó

Se comprobaron 20 de 20 escenario(s) (20 ejecutable). El detalle, con comandos y resultados, está en la documentación técnica.

| Requisito | Escenarios | Con evidencia favorable |
|---|---|---|
| El panel lateral abre con lo que toca hacer ahora | 5 | 5 |
| Una sección de salud agrupa lo que hay que resolver | 5 | 5 |
| El estado del trabajo acompaña sin estorbar | 4 | 4 |
| Un único panel principal reúne el trabajo | 6 | 6 |
<!-- specatlas:generado:fin -->

## Notas

(Escribe aquí lo que quieras conservar entre regeneraciones.)
