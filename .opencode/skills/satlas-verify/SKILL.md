---
name: satlas-verify
description: Registra evidencia real por escenario (comando y resultado) en verify.md. Usar cuando el usuario pide verificar, probar o demostrar que el cambio funciona.
---

# Fase: Verificar (evidencia por escenario)

## Formato de evidencia (bloques `evidence`)

Un bloque por escenario en `verify.md`, con YAML válido:

````markdown
### REQ-DOMINIO-001-S1 — Título del escenario

```evidence
method: executable        # executable | automatic | semi | manual
command: npm test -- modulo
result: pass              # pass | fail | skipped
output_hash: sha256:…     # hash de la salida (satlas hash)
date: 2026-01-01T00:00:00Z
by: tu-nombre
notes: 12/12 casos
```
````

- `executable` exige `command` y que el comando se haya ejecutado de verdad.
- Un resultado `fail` bloquea el PR; se corrige y se registra de nuevo (nuevo bloque con la fecha nueva).
- No hay evidencia sin comando cuando el método es `executable`, ni "terminado" sin evidencia.

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

4. Escribe en `.sdd/changes/<slug>/verify.md` un bloque `evidence` por escenario con el formato exacto.
5. Comprueba que no queden huecos:

```
satlas trace --change <slug> --require-evidence
```

6. Reporta la tabla escenario → método → resultado y cualquier fallo encontrado (un fallo se corrige y se vuelve a verificar; no se marca como pasado).
