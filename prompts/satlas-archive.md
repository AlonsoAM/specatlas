<!-- Generado por SpecAtlas. No editar a mano: satlas adapters lo recompila. -->

# Archivar

# Fase: Archivar

## Precondición

- Sin tareas pendientes y con evidencia `pass` por escenario (`satlas trace --change <slug>`).
- Sin hallazgos críticos abiertos en `review.md` (si el carril lo exige).

## Pasos

1. Revisa el plan (seco) antes de tocar nada:

```
satlas archive <slug> --dry-run
```

2. Si el plegado es correcto (agregados/modificados/eliminados/renombrados esperados), archiva:

```
satlas archive <slug> --yes
```

3. Verifica el resultado: `specs/<dominio>/spec.md` versionado y `changes/archive/AAAA-MM-<slug>/` con la historia; `INDEX.md` regenerado.
4. Reporta: requisitos plegados, versión de la spec viva y ubicación del archivo.

## Prohibido

- Editar la spec viva a mano: el plegado lo hace el CLI de forma determinista.
- Archivar con evidencia fallida o tareas pendientes.
