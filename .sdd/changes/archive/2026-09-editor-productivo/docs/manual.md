<!-- specatlas:generado:inicio -->
# Manual de usuario — Primeros pasos, plantillas y comprobaciones del editor

> **Cambio**: `editor-productivo` · **Dominio**: editor · **Actualizado**: 2026-09-21
>
> Este manual explica cómo se usa lo que el cambio entrega: qué verás, qué puedes hacer y qué ocurre en cada caso.

## 1. Qué es y qué resuelve

- Un **recorrido de primeros pasos** dentro del editor, con las cinco etapas del ciclo, la acción de cada una y marcado automático cuando se cumplen de verdad.
- **Plantillas de los artefactos** al escribir dentro del flujo: requisito, escenario, regla, bloque, tarea, evidencia, hallazgo de revisión, pregunta y contrato. Solo donde corresponde, y produciendo contenido que la validación acepta.
- Las **comprobaciones del flujo como tareas del editor**: la completa bajo la tecla de compilación, la trazabilidad bajo la de pruebas, y los hallazgos recogidos con su archivo, su línea y su gravedad.
- Una **comprobación que arranca el editor de verdad** y verifica lo que solo existe dentro: que la extensión active, que cada acción declarada esté registrada, que las secciones abran y que plantillas y comprobaciones se ofrezcan.

### Por qué se hizo

Como equipo que adopta el flujo, queremos aprenderlo y usarlo sin salir del editor, para que la ceremonia no cueste más que el trabajo que ordena.

Hoy pasan tres cosas. Quien empieza tiene que leerse un tutorial que vive fuera del editor para entender qué es un cambio, por qué se firma y qué cuenta como evidencia. Quien ya lo conoce escribe los artefactos de memoria —el identificador del requisito, los archivos de una tarea, el bloque de evidencia con su método y su comando— y los errores solo aparecen al validar. Y las comprobaciones del flujo viven en una terminal aparte, mientras el equipo ya lanza sus pruebas y mira sus errores en el propio editor.

Hay además un riesgo que no se ve: todo lo que probamos del editor es lógica pura. Una acción declarada y nunca registrada, una vista que no abre o una plantilla que dejó de ofrecerse pasarían inadvertidas, porque nada arranca el editor para comprobarlo.

## 2. Antes de empezar

- `@vscode/test-cli`, `@vscode/test-electron` y `mocha` como dependencias de desarrollo del paquete de la extensión.
- La verificación continua dispone de `xvfb-run` en Linux (viene en las imágenes de GitHub).
- El formato de salida del CLI (`NIVEL CÓDIGO ruta[:línea] — mensaje`) se mantiene estable.

## 3. Primeros pasos

Recorrido corto, en orden, para ver la funcionalidad completa por primera vez.

1. **Primer contacto con la herramienta** — Alguien abre el recorrido de primeros pasos. Ve las cinco etapas del ciclo, cada una con su explicación y su acción.
2. **Escribir un requisito** — Se escribe dentro de la especificación de un cambio. Se ofrecen las plantillas de requisito, escenario y regla.
3. **Lanzar la comprobación completa** — El equipo busca las tareas del proyecto. Encuentra las comprobaciones del flujo, con la completa bajo la tecla de compilación.
4. **La extensión arranca** — Se ejecuta la comprobación del editor sobre un proyecto del flujo. La extensión queda activa.

## 4. Las pantallas, una por una

_Este cambio no declara mockups, así que no hay contrato visual que recorrer._

## 5. Cómo se usa, tarea por tarea

### El editor enseña el ciclo la primera vez

Quien abre la herramienta por primera vez no sabe qué es un cambio, ni por qué hay que firmar, ni qué cuenta como evidencia. Hoy eso se explica en un tutorial que vive fuera del editor, así que quien empieza tiene que salir de su trabajo para entenderlo. El editor debe enseñar el ciclo desde dentro, y marcar cada paso conforme se cumple.

| Qué haces | Qué ocurre |
|---|---|
| Alguien abre el recorrido de primeros pasos | Ve las cinco etapas del ciclo, cada una con su explicación y su acción |
| Se inicializa el proyecto o se crea el primer cambio | La etapa correspondiente queda marcada como cumplida |

### Escribir un artefacto sin recordar su estructura

Cada artefacto del flujo tiene una gramática exacta: los requisitos llevan su identificador y sus escenarios, las tareas declaran archivos y lo que cubren, la evidencia declara método, comando y resultado. Escribir eso de memoria es lento y produce errores que solo aparecen al validar.

| Qué haces | Qué ocurre |
|---|---|
| Se escribe dentro de la especificación de un cambio | Se ofrecen las plantillas de requisito, escenario y regla |
| Se escribe dentro del artefacto de tareas | Se ofrecen las plantillas de bloque y de tarea, y no las de la especificación |
| Se escribe en un archivo que no pertenece al flujo | No se ofrece ninguna plantilla del flujo |

### Las comprobaciones se lanzan como cualquier otra del proyecto

El equipo ya lanza sus pruebas y su compilación desde el editor. Las comprobaciones del flujo deberían lanzarse igual, y sus hallazgos aparecer donde el equipo ya mira los errores, en vez de exigir una terminal aparte.

| Qué haces | Qué ocurre |
|---|---|
| El equipo busca las tareas del proyecto | Encuentra las comprobaciones del flujo, con la completa bajo la tecla de compilación |
| Una comprobación termina con hallazgos | Cada uno se recoge con su archivo, su línea y su gravedad |

### Lo que solo se ve en el editor también se prueba

La lógica del editor se prueba sin abrirlo, pero hay cosas que solo existen dentro: que la extensión arranque, que sus acciones estén registradas, que sus vistas se abran y que las plantillas y comprobaciones lleguen a ofrecerse. Hoy nada de eso se comprueba, así que una acción declarada y no registrada pasaría inadvertida.

| Qué haces | Qué ocurre |
|---|---|
| Se ejecuta la comprobación del editor sobre un proyecto del flujo | La extensión queda activa |
| La comprobación pide abrir cada sección del panel lateral | Todas responden |

## 6. Qué ves cuando todavía no hay nada

| Situación | Qué hace la herramienta |
|---|---|
| **Sin cambios en curso** — El proyecto no tiene ningún cambio | Las comprobaciones que operan sobre un cambio no se ofrecen |

Un estado vacío no es un error: la herramienta indica qué falta y qué acción lo produce.

## 7. Problemas frecuentes y qué hacer

| Situación | Qué hace la herramienta |
|---|---|
| **Una acción declarada y no registrada** — Una acción se declara pero no llega a registrarse | La comprobación falla nombrando esa acción |

En todos estos casos la herramienta explica el motivo y no deja el trabajo a medias: corrige lo que indica y vuelve a intentarlo.

## 8. Reglas que conviene conocer

- `BR-EDITOR-035` — el editor ofrece un recorrido de primeros pasos con las cinco etapas del ciclo: inicializar, crear un cambio, especificar, aprobar y cerrar con evidencia.
- `BR-EDITOR-036` — cada etapa explica para qué sirve y deja a mano la acción que la cumple.
- `BR-EDITOR-037` — una etapa se marca como cumplida cuando se cumple de verdad, no cuando se lee.
- `BR-EDITOR-038` — al escribir dentro de un artefacto del flujo se ofrecen las plantillas de lo que ese artefacto admite.
- `BR-EDITOR-039` — las plantillas no se ofrecen fuera de los artefactos del flujo.
- `BR-EDITOR-040` — cada plantilla produce contenido que la validación acepta.
- `BR-EDITOR-041` — las comprobaciones del flujo se ofrecen como tareas del editor, cada una con lo que hace.
- `BR-EDITOR-042` — la comprobación completa queda bajo la tecla de compilación y la de trazabilidad bajo la de pruebas.
- `BR-EDITOR-043` — los hallazgos de una comprobación se recogen con su archivo, su línea y su gravedad.
- `BR-EDITOR-044` — una comprobación que opera sobre un cambio no se ofrece mientras no haya ninguno.
- `BR-EDITOR-045` — existe una comprobación que arranca el editor de verdad y verifica que la extensión activa con un proyecto del flujo.
- `BR-EDITOR-046` — esa comprobación verifica que cada acción declarada está registrada, que las secciones del panel se abren y que las plantillas y comprobaciones se ofrecen.
- `BR-EDITOR-047` — la comprobación forma parte de la verificación continua del proyecto.

## 9. Glosario

- **Panel principal** _(Panel único)_: La única ventana de trabajo de la herramienta en el editor; reúne el resumen, el flujo, la trazabilidad, las métricas, los documentos y las acciones
- **Sección** _(Pestaña)_: Cada una de las partes internas del panel principal (Resumen, Flujo, Trazabilidad, Métricas y Documentos)
- **Artefacto del cambio** _(Documento)_: Documento del ciclo de un cambio (propuesta, especificación, aclaraciones, plan, tareas, verificación, documentación y presentación)
- **Mockup** _(Prototipo visual)_: Contrato visual de la propuesta de un cambio; ilustra la interfaz sin ser funcional

## 10. Cómo se comprobó

Se comprobaron 11 de 11 escenario(s) (11 ejecutable). El detalle, con comandos y resultados, está en la documentación técnica.

| Requisito | Escenarios | Con evidencia favorable |
|---|---|---|
| El editor enseña el ciclo la primera vez | 2 | 2 |
| Escribir un artefacto sin recordar su estructura | 3 | 3 |
| Las comprobaciones se lanzan como cualquier otra del proyecto | 3 | 3 |
| Lo que solo se ve en el editor también se prueba | 3 | 3 |
<!-- specatlas:generado:fin -->

## Notas

(Escribe aquí lo que quieras conservar entre regeneraciones.)
