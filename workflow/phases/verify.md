---
id: verify
title: Verificar
description: >-
  Registra evidencia real por escenario (comando y resultado) en verify.md.
  Usar cuando el usuario pide verificar, probar o demostrar que el cambio funciona.
requires:
  - changes/<slug>/tasks.md
produces:
  - changes/<slug>/verify.md
arguments: true
agent:
  mode: primary
---

# Fase: Verificar (evidencia por escenario)

{{>evidencia}}

## Pasos

1. Lee el delta y lista **todos** los escenarios (`### Escenario: REQ-…-S1`).
2. Para cada escenario elige el método más fuerte posible:
   - `executable`: prueba automatizada, petición HTTP, script SQL, Playwright, emulador.
   - `automatic`: comprobación mecánica (grep/inspección) sobre el resultado.
   - `semi`: verificación asistida con revisión humana.
   - `manual`: último recurso, con justificación.
3. Ejecuta realmente el comando y captura la salida. Hash de la salida:

```
satlas hash "<salida o archivo>"   # (F1: satlas verify --record lo hará por ti)
```

4. Escribe en `.sdd/changes/{{SLUG}}/verify.md` un bloque `evidence` por escenario con el formato exacto.
5. Comprueba que no queden huecos:

```
satlas trace --change {{SLUG}} --require-evidence
```

6. Reporta la tabla escenario → método → resultado y cualquier fallo encontrado (un fallo se corrige y se vuelve a verificar; no se marca como pasado).
