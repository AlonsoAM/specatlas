---
description: Carril express para incidentes (bug, hotfix, configuración): un solo artefacto, con causa raíz, cambio mínimo y evidencia. Usar cuando el usuario pide arreglar un bug, un hotfix o un cambio pequeño sin ceremonia completa.
---

# Fase: Fix express (incidente)

Un solo artefacto: `.sdd/changes/$ARGUMENTS/fix.md`. El contenido se escribe en **español**.

## Pasos

1. Reproduce el problema o reúne la evidencia de que ocurre (log, pantalla, datos).
2. Investiga la causa raíz en el código real; cita `archivo:línea`.
3. Aplica el **cambio mínimo** que corrige la causa (no aproveches para refactorizar).
4. Escribe `fix.md` con: `## Síntoma`, `## Causa raíz`, `## Cambio`, `## Rollback` y un bloque `evidence`.
5. Verifica que el síntoma ya no ocurre y que no rompiste nada alrededor (validación del perfil).
6. Si el arreglo revela alcance de feature (no de incidente), **promuévelo**: crea un cambio normal con `satlas new` y pásalo a especificación.

## Prohibido

- Tocar la spec viva o los artefactos de otros cambios.
- Mezclar en el mismo fix varios problemas no relacionados.
