<!-- Generado por SpecAtlas. No editar a mano: satlas adapters lo recompila. -->

# Documentar

# Fase: Documentar (técnica y manual del cambio)

## Objetivo

Dejar la documentación técnica y manual del cambio `<slug>` en `.sdd/changes/<slug>/docs/`, construida desde lo real (especificación, tareas y evidencia).
El contenido se escribe en **español**.

## Pasos

1. Ejecuta `satlas docs <slug>` para generar el esqueleto de los dos documentos desde las plantillas y la evidencia.
2. Revisa lo generado: si un dato falta o es incorrecto, corrige **la fuente** (spec, tareas o evidencia) y vuelve a ejecutar el comando; no retoques los datos generados.
3. Completa lo que no se puede generar — decisiones, límites, ejemplos de uso y notas — **fuera del bloque gestionado** (lo que está entre los marcadores se reemplaza al regenerar; lo de fuera se conserva).
4. Señala expresamente lo que quedó sin evidencia; nunca lo presentes como hecho.
5. Cierra con `satlas docs <slug>` (regenera el bloque gestionado) y `satlas next <slug>`.

## Prohibido

- Documentar como hecho algo sin evidencia.
- Escribir dentro del bloque gestionado (se reemplaza al regenerar).
- Tocar la especificación, el plan o las tareas desde esta fase.
