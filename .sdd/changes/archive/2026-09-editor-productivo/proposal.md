# Propuesta — Primeros pasos, plantillas y comprobaciones del editor

## Por qué

Como equipo que adopta el flujo, queremos aprenderlo y usarlo sin salir del editor, para que la ceremonia no cueste más que el trabajo que ordena.

Hoy pasan tres cosas. Quien empieza tiene que leerse un tutorial que vive fuera del editor para entender qué es un cambio, por qué se firma y qué cuenta como evidencia. Quien ya lo conoce escribe los artefactos de memoria —el identificador del requisito, los archivos de una tarea, el bloque de evidencia con su método y su comando— y los errores solo aparecen al validar. Y las comprobaciones del flujo viven en una terminal aparte, mientras el equipo ya lanza sus pruebas y mira sus errores en el propio editor.

Hay además un riesgo que no se ve: todo lo que probamos del editor es lógica pura. Una acción declarada y nunca registrada, una vista que no abre o una plantilla que dejó de ofrecerse pasarían inadvertidas, porque nada arranca el editor para comprobarlo.

## Qué cambia

- Un **recorrido de primeros pasos** dentro del editor, con las cinco etapas del ciclo, la acción de cada una y marcado automático cuando se cumplen de verdad.
- **Plantillas de los artefactos** al escribir dentro del flujo: requisito, escenario, regla, bloque, tarea, evidencia, hallazgo de revisión, pregunta y contrato. Solo donde corresponde, y produciendo contenido que la validación acepta.
- Las **comprobaciones del flujo como tareas del editor**: la completa bajo la tecla de compilación, la trazabilidad bajo la de pruebas, y los hallazgos recogidos con su archivo, su línea y su gravedad.
- Una **comprobación que arranca el editor de verdad** y verifica lo que solo existe dentro: que la extensión active, que cada acción declarada esté registrada, que las secciones abran y que plantillas y comprobaciones se ofrezcan.

## Fuera de alcance

- La lógica del flujo y sus gates: no cambia ninguna regla.
- El panel principal y el panel lateral, ya rediseñados.
- La traducción de la interfaz.
- Atajos de teclado propios: se dejan a la configuración de cada equipo.

## Cómo se mide el éxito

- Alguien que nunca usó la herramienta completa su primer cambio sin salir del editor.
- Escribir un requisito, una tarea o una evidencia deja de exigir recordar su estructura.
- Las comprobaciones se lanzan con la misma tecla que el resto del proyecto y sus hallazgos aparecen donde el equipo ya mira.
- Una acción declarada y no registrada hace fallar la verificación continua, en vez de descubrirse en uso.
