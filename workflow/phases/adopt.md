---
id: adopt
title: Adoptar (brownfield)
description: >-
  Recupera las specs de un proyecto existente: lee el inventario y las anclas, entrevista al usuario y redacta requisitos AS-IS.
  Usar cuando el usuario pide adoptar, documentar o recuperar las specs de un proyecto que ya existe.
requires: []
produces:
  - specs/<dominio>/spec.md
  - changes/adopt-<dominio>/spec.md
arguments: true
agent:
  mode: primary
---

# Fase: Adoptar (brownfield)

El contenido se escribe en **{{LANGUAGE_NAME}}**.

## Pasos

1. Genera el inventario y las specs baseline:

```
satlas adopt
```

2. Lee `.sdd/adopt-report.md`, las anclas de cada `specs/<dominio>/spec.md` y el código real que esas anclas señalan.
3. Por cada dominio, **entrevista al usuario** (máximo 5 preguntas) para confirmar el comportamiento actual antes de escribirlo. No inventes reglas: si el código no lo aclara, pregunta.
4. Crea el cambio de adopción y redacta el delta con el comportamiento **actual** (AS-IS):

```
satlas new adopt-<dominio> --domain <dominio>
```

   - Requisitos `REQ-<DOMINIO>-NNN` con actor, prosa de negocio y reglas `BR-*`.
   - Escenarios `CUANDO/ENTONCES` que describan lo que el sistema hace hoy, incluyendo errores y límites visibles.
   - `## Anclas de implementación` con los archivos/símbolos que respaldan cada requisito (permite detectar drift después).
5. Valida y pliega (la adopción documenta lo existente: no requiere tareas ni verificación):

```
satlas validate --change adopt-<dominio>
satlas archive adopt-<dominio> --yes
```

6. Repite por dominio y reporta la cobertura: dominios adoptados, requisitos recuperados y zonas del código sin requisito (deuda de documentación).

## Prohibido

- Escribir requisitos de comportamiento que no exista hoy (eso es un cambio: usa `satlas new`).
- Copiar nombres técnicos a la spec: la spec es de negocio aunque documente lo existente.
