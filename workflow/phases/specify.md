---
id: specify
title: Especificar
description: >-
  Escribe o refina la especificación funcional de un cambio (delta) en lenguaje de negocio.
  Usar cuando el usuario pide especificar, definir requisitos, redactar la spec o crear un cambio.
requires: []
produces:
  - changes/<slug>/spec.md
  - changes/<slug>/proposal.md
arguments: true
agent:
  mode: primary
---

# Fase: Especificar (spec funcional y de negocio)

{{>reglas-negocio}}

## Objetivo

Escribir el delta de especificación del cambio `{{SLUG}}` en `.sdd/changes/{{SLUG}}/spec.md`.
El contenido se escribe en **{{LANGUAGE_NAME}}**.

## Pasos

1. Lee `.sdd/constitution.md`, `.sdd/glossary.md` y las specs vivas de `.sdd/specs/**/spec.md` que toquen el dominio.
2. Si hay código existente relacionado, inspecciónalo solo para entender el comportamiento actual (AS-IS); no lo describas con tecnología en la spec.
3. Si falta información de negocio, **pregunta** (máximo 5 preguntas concretas) antes de escribir: incluye la **historia de usuario** («como <rol>, quiero <acción>, para <beneficio>») cuando no esté clara. No inventes reglas.
4. Redacta el delta con las secciones canónicas:
   - `## Requisitos agregados` (`ADDED`), `## Requisitos modificados` (`MODIFIED`), `## Requisitos eliminados` (`REMOVED`), `## Requisitos renombrados` (`RENAMED`).
   - Cada requisito: `### Requisito: REQ-<DOMINIO>-NNN — Título` (ids inmutables), prosa de negocio, reglas `- Regla BR-<DOMINIO>-NNN: ...` y escenarios `#### Escenario: REQ-<DOMINIO>-NNN-S1 — Título` con `- **CUANDO** ...` / `- **ENTONCES** ...`.
   - Incluye siempre escenarios de error, vacío, sin permiso y límites.
   - `MODIFIED` copia el bloque **completo** del requisito tal como está en la spec viva y lo edita.
   - `REMOVED` declara `- Motivo:` y `- Migración:`.
5. Completa `.sdd/changes/{{SLUG}}/proposal.md` en lenguaje de negocio (sin tecnología y sin dejar los textos entre paréntesis de la plantilla): **Por qué** (problema u oportunidad, con la historia de usuario), **Qué cambia** (alcance funcional), **Fuera de alcance** (lo que no se hará) y **Cómo se mide el éxito** (indicadores observables).
6. Verifica con el CLI y corrige hasta que no haya errores:

```
satlas validate --change {{SLUG}}
```

7. Reporta: número de requisitos y escenarios, supuestos, y las preguntas que quedaron abiertas.

## Prohibido

- Nombres de tablas, campos, endpoints, clases, archivos, frameworks o librerías.
- Adjetivos vagos ("rápido", "fácil", "varios", "robusto") sin un valor medible.
- Renumerar ids existentes o reescribir un requisito aprobado sin pasar por `MODIFIED`/`REMOVED`.
- Dejar `proposal.md` con la plantilla sin completar.

## Salida

`changes/{{SLUG}}/spec.md` validado y `changes/{{SLUG}}/proposal.md` completo, más un resumen para el usuario y la indicación de que la spec debe aprobarse (`satlas approve`) antes de planificar.
