---
slug: resolutor-workflow
date: 2026-09-20
result: pass
domain: editor
title: El resolutor de workflow prefiere la copia empaquetada en dev
---

# Fix — El resolutor de workflow prefiere la copia empaquetada en dev

## Síntoma
Al añadir fases nuevas (`clarify`, `docs`) y ejecutar `satlas adapters`, las fases nuevas no se compilaban y los artefactos se regeneraban desde una copia vieja de las fuentes. Solo se resolvía recompilando con la variable `SPECATLAS_WORKFLOW_DIR` apuntando a la raíz. Lo mismo podía pasar con los perfiles (`profiles/`).

## Causa raíz
`resolveWorkflowDir`/`resolveProfilesDir` (`packages/cli/src/paths.ts`) suben directorios desde la ubicación del propio código (`packages/cli/dist`) y devuelven la **primera** coincidencia. La copia empaquetada (`packages/cli/workflow`, `packages/cli/profiles`) vive dentro del paquete —la genera `prepack` y está ignorada por git—, así que en un checkout del repo gana siempre a las fuentes de la raíz.

## Cambio
Antes de la búsqueda ascendente, si el proceso corre desde el **checkout fuente** (firma del monorepo: `pnpm-workspace.yaml` y `packages/cli/package.json` con nombre `specatlas` en algún ancestro), se resuelven `workflow/` y `profiles/` de la raíz. Si no es el checkout (paquete instalado desde npm), se conserva la búsqueda actual, que encuentra la copia empaquetada del paquete. La variable de entorno `SPECATLAS_WORKFLOW_DIR`/`SPECATLAS_PROFILES_DIR` sigue teniendo prioridad. Cambio mínimo en `packages/cli/src/paths.ts`.

## Rollback
Revertir el commit: eliminar la resolución desde la raíz fuente y volver a la búsqueda ascendente directa.

## Evidencia

### REQ-RESOLUTOR-001-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/cli/test/paths.test.ts
result: pass
output_hash: sha256:df862ac92f2391fda3a7b06d8ac1622919292f57ba767b6cf253c4fed6e8f321
date: 2026-09-20 17:30:35 -05:00
by: Alonso Anchante
notes: Reproduce el fallo antes del cambio y pasa despues, en workflow y perfiles
```

### REQ-RESOLUTOR-001-S2

```evidence
method: executable
command: node packages/cli/dist/bin.js adapters --check
result: pass
output_hash: sha256:d9c7e94ba600cb161d2c43a46874779c68dad5038cf6723af96e2e53ab6641c2
date: 2026-09-20 17:30:35 -05:00
by: Alonso Anchante
notes: Dogfooding en el repo, la fuente queda sin cambios usando las fuentes de la raiz
```

### REQ-RESOLUTOR-001-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run
result: pass
output_hash: sha256:cea1e6575b2f7d6d360f3c92346ac279cf531b07652f77a05e1902f2d2a004f5
date: 2026-09-20 17:30:40 -05:00
by: Alonso Anchante
notes: Suite completa sin regresiones
```
