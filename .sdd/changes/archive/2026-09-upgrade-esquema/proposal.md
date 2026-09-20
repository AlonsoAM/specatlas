# Propuesta — Actualizar el estado del proyecto a la versión vigente

## Por qué
Cuando la herramienta evoluciona su forma de guardar el estado del proyecto, los proyectos creados con versiones anteriores quedan desactualizados y nadie se entera: no hay aviso, no hay forma de ver qué cambiaría y no hay forma de actualizar sin editar elementos a mano. Cada equipo descubre la desactualización cuando algo falla, y cada mejora del formato se convierte en un riesgo de pérdida de información.

## Qué cambia
- El proyecto avisa por sí solo cuando su estado guardado no corresponde a la versión vigente (al consultar el estado, al validar y en el diagnóstico), sin escribir nada y sin proponer volver atrás si fue producido por una versión más nueva.
- La actualización se puede previsualizar elemento por elemento antes de aplicarla; la vista previa deja el proyecto intacto.
- Aplicar la actualización conserva un respaldo recuperable del estado previo, es todo o nada, no hace nada si no hay cambios pendientes, es repetible sin efectos y avisa cuando falta permiso para escribir.
- Se puede volver atrás una actualización aplicada restaurando el respaldo (una vez por aplicación).
- Los proyectos nuevos nacen al día: iniciar un proyecto o registrar un cambio o una aprobación queda en la versión vigente.

## Fuera de alcance
- Reescribir al formato vigente los artefactos de trabajo antiguos (especificaciones vivas, planes, tareas y sus gramáticas).
- Actualizaciones automáticas o en segundo plano: aplicarla siempre es una decisión de una persona.
- Nuevos avisos en otras vías (editor o asistentes) más allá de consumir los avisos que ya expone el estado.

## Cómo se mide el éxito
- Un proyecto desactualizado lo reporta al consultar su estado, sin que nadie lo haya tocado.
- Actualizar un proyecto no pierde información: el respaldo devuelve el estado previo idéntico con una sola acción.
- Actualizar nunca deja el proyecto a medias, y no cambia nada cuando no hay nada pendiente ni cuando falta permiso.
- Un proyecto al día no recibe avisos ni cambios, tampoco al aplicar la actualización dos veces seguidas.
