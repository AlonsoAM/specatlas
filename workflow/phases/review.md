---
id: review
title: Revisar
description: >-
  Revisión de código con lentes por tamaño del diff y verificación adversarial de hallazgos.
  Usar cuando el usuario pide revisar el código antes del PR.
requires:
  - changes/<slug>/tasks.md
produces:
  - changes/<slug>/review.md
arguments: true
agent:
  mode: primary
---

# Fase: Revisar (código)

## Pasos

1. Obtén el diff completo del cambio (`git diff` contra la rama base).
2. Elige el nivel:
   - Diff pequeño: una pasada con dos lentes: **corrección** (¿hace lo que dice la spec?) y **estándares** (perfil + constitución).
   - Diff grande (> 400 líneas) o ruta sensible: tres lentes (corrección, seguridad, mantenibilidad) y un verificador adversarial.
3. **Verificación adversarial**: cada hallazgo se intenta refutar contra el código real. Etiquetas:
   - `CONFIRMADO` (evidencia `archivo:línea`), `RENUNCIADO` (no se pudo refutar: mantener severidad), `REFUTADO` (con evidencia).
   - Nunca marcar `REFUTADO` sin `archivo:línea`.
4. Escribe `.sdd/changes/{{SLUG}}/review.md`: hallazgos con severidad, evidencia, decisión y estado.
5. Crítico confirmado = bloquea el PR hasta corregirlo o registrar un override con motivo, autor y fecha.
