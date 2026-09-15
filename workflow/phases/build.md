---
id: build
title: Construir
description: >-
  Implementa las tareas del cambio por olas paralelas, con evidencia y sin tocar los artefactos aprobados.
  Usar cuando el usuario pide construir, implementar o codificar las tareas.
requires:
  - changes/<slug>/tasks.md
produces:
  - código y pruebas del cambio
arguments: true
agent:
  mode: primary
---

# Fase: Construir

## Precondición

- `satlas trace --change {{SLUG}}` sin errores y `satlas status` en "construyendo" (o "aprobado/planificado").
- Si hay tareas pendientes y la spec cambió sin re-aprobar, detente.

## Pasos

1. Lee `tasks.md`. Calcula olas:

```
satlas waves --change {{SLUG}}
```

2. Ejecuta **bloque por bloque** y **ola por ola**:
   - Confirma con el usuario el bloque y su mapa de olas antes de empezar.
   - Dentro de una ola, ejecuta las tareas en paralelo solo si no comparten archivos; si comparten, secuéncialas.
   - Cada tarea: implementa exactamente su `Archivos:`, respeta `Cubre:` y deja el código funcionando.
   - Al cerrar cada tarea, marca `- [x]` en `tasks.md` (una sola edición por bloque).
3. Tras cada bloque:
   - Ejecuta la validación del perfil (build/lint/test) y captura el resultado.
   - Commitea solo el código (nunca `.sdd/` en commits de build).
4. Si una tarea falla: reintenta (máx. 3), si sigue fallando detén el bloque y reporta con el log.
5. Al terminar todas las tareas, cierra con:

```
satlas trace --change {{SLUG}}
satlas status
```

## Prohibido

- Modificar `spec.md`, `plan.md` o `meta.yaml` (los artefactos aprobados son inmutables).
- Ejecutar `git` dentro de subagentes.
- Marcar tareas sin haber ejecutado la validación correspondiente.
- Dar por terminado sin evidencia (esa es la fase de verificación).
