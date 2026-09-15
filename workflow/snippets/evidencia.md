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
