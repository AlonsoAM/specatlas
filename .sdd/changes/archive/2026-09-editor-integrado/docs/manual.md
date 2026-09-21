<!-- specatlas:generado:inicio -->
# Manual de usuario — El editor, integrado con el trabajo

> **Cambio**: `editor-integrado` · **Dominio**: editor · **Actualizado**: 2026-09-21
>
> Este manual explica cómo se usa lo que el cambio entrega: qué verás, qué puedes hacer y qué ocurre en cada caso.

## 1. Qué es y qué resuelve

- El panel **sigue al archivo abierto**: entrar en un artefacto selecciona su cambio y las acciones pasan a ser las suyas; un archivo ajeno al flujo no altera nada.
- Los **archivos del flujo llevan su estado** junto al nombre: lo que bloquea el avance se distingue de lo que solo avisa, y tiene prioridad sobre la fase.
- Una **tarea se marca como hecha desde el panel**, y queda escrita en el artefacto sin tocar lo demás que declara.
- La ventana con **más de una carpeta** funciona de verdad: el trabajo en curso, la salud y el recuento abarcan todas; cada cambio dice de qué proyecto es y se ejecuta con el asistente de ese proyecto.
- El editor **solo ofrece lo que puede hacer**, y el ajuste sin efecto desaparece.

### Por qué se hizo

Como desarrollador que tiene el editor abierto todo el día, quiero que el panel del flujo esté donde estoy trabajando y me diga el estado de cada artefacto sin abrirlo, para dejar de saltar entre ventanas y de comprobar a mano en qué punto está cada cosa.

Tres cosas rompen hoy esa continuidad. La primera: abro la especificación de un cambio y el panel sigue mostrando otro, así que las acciones que ofrece no son las de lo que tengo delante. La segunda: cuando la ventana tiene dos carpetas de proyecto, el estado, la salud y el asistente que se abre corresponden solo a la primera, mientras el árbol lista los cambios de todas — veo una cosa y actúo sobre otra. La tercera: el editor ofrece acciones que no puede ejecutar (en un proyecto sin inicializar todas están disponibles y no hacen nada) y un ajuste de idioma que no cambia nada.

## 2. Antes de empezar

- `TreeItem.checkboxState`, `onDidChangeCheckboxState` y `registerFileDecorationProvider` existen en la API de VS Code desde 1.72; el `engines.vscode` del paquete ya lo cubre.
- La prueba sigue siendo sobre módulos puros con vitest; los proveedores de VS Code quedan como capa sin lógica.

## 3. Primeros pasos

Recorrido corto, en orden, para ver la funcionalidad completa por primera vez.

1. **Abrir el artefacto de otro cambio** — Se abre un artefacto perteneciente a un cambio distinto del seleccionado. El panel pasa a mostrar ese cambio y sus acciones.
2. **Dos proyectos con trabajo en curso** — La ventana tiene dos carpetas de proyecto con cambios en curso. El panel lista los cambios de ambas, y cada uno indica su proyecto.

## 4. Las pantallas, una por una

_Este cambio no declara mockups, así que no hay contrato visual que recorrer._

## 5. Cómo se usa, tarea por tarea

### El panel lateral acompaña al archivo abierto

Quien trabaja pasa el día en los archivos, no en el panel. Hoy abre la especificación de un cambio y el panel lateral sigue mostrando otro, así que las acciones que ofrece no son las del trabajo que tiene delante. El panel debe seguir al archivo abierto, y los propios archivos deben decir en qué estado están sin necesidad de abrirlos.

| Qué haces | Qué ocurre |
|---|---|
| Se abre un artefacto perteneciente a un cambio distinto del seleccionado | El panel pasa a mostrar ese cambio y sus acciones |
| Se abre un archivo que no pertenece a ningún cambio | La selección del panel se mantiene como estaba |
| Se marca una tarea desde el panel | Queda registrada como hecha en el artefacto de tareas, conservando lo demás que declara esa tarea |
| Se marca una tarea cuyo texto ya no corresponde a una tarea del artefacto | No se escribe nada y se avisa de que hay que revisarlo a mano |

### Más de una carpeta de proyecto en la misma ventana

Un equipo abre a la vez el servicio y su cliente, o dos productos que comparten specs. Hoy el editor solo atiende a la primera carpeta: el estado, la salud y el asistente que se abre corresponden a un proyecto mientras el árbol muestra los de todos, así que se ve una cosa y se actúa sobre otra.

| Qué haces | Qué ocurre |
|---|---|
| La ventana tiene dos carpetas de proyecto con cambios en curso | El panel lista los cambios de ambas, y cada uno indica su proyecto |
| Se ejecuta la siguiente acción de un cambio | Se ejecuta en la carpeta de ese cambio y con el asistente configurado en ese proyecto |
| La ventana tiene una única carpeta de proyecto | Los cambios no repiten el nombre del proyecto |

### El editor solo ofrece lo que puede hacer

Ofrecer una acción que no va a funcionar cuesta más que no ofrecerla: quien la elige espera un resultado y no recibe nada. Las acciones del editor deben estar disponibles solo cuando tienen sentido, y los ajustes que se ofrecen deben tener efecto.

_La especificación no describe pasos de uso._

## 6. Qué ves cuando todavía no hay nada

| Situación | Qué hace la herramienta |
|---|---|
| **Un archivo sin hallazgos** — Un artefacto no tiene hallazgos | Junto a su nombre aparece la fase en la que está su cambio |
| **Proyecto sin inicializar** — Se buscan las acciones del editor en un proyecto que no usa el flujo | Solo se ofrecen inicializar y adoptar |
| **Proyecto sin cambios** — El proyecto está inicializado y no tiene ningún cambio | Las acciones que operan sobre un cambio no se ofrecen |
| **Ajustes sin efecto** — Se revisan los ajustes que ofrece el editor | Cada uno tiene un efecto observable en su comportamiento |

Un estado vacío no es un error: la herramienta indica qué falta y qué acción lo produce.

## 7. Problemas frecuentes y qué hacer

| Situación | Qué hace la herramienta |
|---|---|
| **Un archivo con hallazgos que bloquean** — Un artefacto acumula hallazgos que bloquean el avance | Junto a su nombre aparece cuántos son, distinguidos de los avisos |
| **La salud es la del conjunto** — Una de las carpetas tiene hallazgos que bloquean | La sección de salud y el recuento anunciado los incluyen, sin importar en qué carpeta estén |

En todos estos casos la herramienta explica el motivo y no deja el trabajo a medias: corrige lo que indica y vuelve a intentarlo.

## 8. Reglas que conviene conocer

- `BR-EDITOR-025` — al abrir un artefacto de un cambio, ese cambio queda seleccionado y las acciones del panel pasan a ser las suyas.
- `BR-EDITOR-026` — un archivo que no pertenece a ningún cambio no altera la selección vigente.
- `BR-EDITOR-027` — los archivos del flujo muestran su estado junto a su nombre; lo que bloquea el avance se distingue de lo que solo avisa y tiene prioridad sobre la fase.
- `BR-EDITOR-028` — una tarea se marca como hecha desde el propio panel, y el cambio queda escrito en el artefacto de tareas sin alterar el resto de su contenido.
- `BR-EDITOR-029` — el trabajo en curso, la salud y el recuento de hallazgos abarcan todas las carpetas de proyecto abiertas.
- `BR-EDITOR-030` — con más de una carpeta, cada cambio indica a qué proyecto pertenece.
- `BR-EDITOR-031` — cada acción se ejecuta en el proyecto de su cambio, con el asistente que ese proyecto tiene configurado.
- `BR-EDITOR-032` — una acción que necesita un proyecto inicializado no se ofrece mientras no lo haya.
- `BR-EDITOR-033` — una acción que opera sobre un cambio no se ofrece mientras no haya ninguno.
- `BR-EDITOR-034` — los ajustes ofrecidos tienen efecto observable; los que no lo tienen se retiran.

## 9. Glosario

- **Panel principal** _(Panel único)_: La única ventana de trabajo de la herramienta en el editor; reúne el resumen, el flujo, la trazabilidad, las métricas, los documentos y las acciones
- **Sección** _(Pestaña)_: Cada una de las partes internas del panel principal (Resumen, Flujo, Trazabilidad, Métricas y Documentos)
- **Artefacto del cambio** _(Documento)_: Documento del ciclo de un cambio (propuesta, especificación, aclaraciones, plan, tareas, verificación, documentación y presentación)
- **Mockup** _(Prototipo visual)_: Contrato visual de la propuesta de un cambio; ilustra la interfaz sin ser funcional

## 10. Cómo se comprobó

Se comprobaron 13 de 13 escenario(s) (13 ejecutable). El detalle, con comandos y resultados, está en la documentación técnica.

| Requisito | Escenarios | Con evidencia favorable |
|---|---|---|
| El panel lateral acompaña al archivo abierto | 6 | 6 |
| Más de una carpeta de proyecto en la misma ventana | 4 | 4 |
| El editor solo ofrece lo que puede hacer | 3 | 3 |
<!-- specatlas:generado:fin -->

## Notas

(Escribe aquí lo que quieras conservar entre regeneraciones.)
