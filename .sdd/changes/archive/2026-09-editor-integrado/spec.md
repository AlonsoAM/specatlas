# Delta — El editor, integrado con el trabajo

## Requisitos agregados

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

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: editor -->
