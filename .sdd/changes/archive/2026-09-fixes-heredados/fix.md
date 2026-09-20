# Fix — Los fixes archivados no aparecen y el histórico no explica su propósito

## Síntoma
En un proyecto con fixes ya archivados (`matriz-cobertura` y `paneles-vivo`), el grupo **Fixes** del sidebar y la sección «Fixes vivos» de `satlas status` aparecían vacíos: solo se leía `.sdd/fixes/`, que no existía porque esos fixes se archivaron **antes** de que existiera la función. Además, el grupo «Histórico» no dejaba claro para qué servía frente a «Specs vivas».

## Causa raíz
`loadLivingFixes` (`packages/core/src/fixes.ts`) leía únicamente `.sdd/fixes/*.md`, artefactos que solo se escriben al archivar con la versión nueva. Los fixes archivados por versiones anteriores quedan solo en `.sdd/changes/archive/<mes>-<slug>/fix.md` y nadie los leía. El grupo «Histórico» era una lista sin contexto de su propósito (historia del cambio vs comportamiento vigente).

## Cambio
- `loadLivingFixes` incluye los fixes del carril fix que están archivados y no tienen fix vivo: los sintetiza desde `meta.yaml` + `fix.md` (dominio, título, mes de cierre, resultado de su evidencia, cobertura y contenido) con `source: 'archive'`; si ya existe un fix vivo con el mismo slug, no se duplica. Con eso aparecen en el sidebar, en `satlas status` (marcados «(histórico)»), en `atlas_fixes` y en el registro del proyecto.
- El grupo se renombra a **Histórico de cambios** y su tooltip (y el de cada cambio) explica que es la historia — qué se cerró, cuándo y con qué evidencia — mientras el comportamiento vigente vive en **Specs vivas**.

## Rollback
Revertir el commit: volver a leer solo `.sdd/fixes/` y restaurar el nombre y los tooltips anteriores del grupo.

## Evidencia

### REQ-FIXES-001-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t incluye
result: pass
output_hash: sha256:651f9ec728ea87f034f3d6d0f8022ec898a7359e2b8a2c42e9f96312df5954f2
date: 2026-09-20 14:32:11 -05:00
by: Alonso Anchante
notes: Reproduce el fallo antes del cambio y pasa con la lectura del historico
```

### REQ-FIXES-001-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t no
result: pass
output_hash: sha256:ce6cde223f54662dc44cf8d9bf7c0cfac5e18deff0e2f0d049e9f6fe1774b8cf
date: 2026-09-20 14:32:12 -05:00
by: Alonso Anchante
notes: Sin duplicados cuando ya existe fix vivo
```

### REQ-FIXES-002-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/vscode/test/logic.test.ts -t archivado
result: pass
output_hash: sha256:b3984279f7baea431251a34ed8edb8efb43b3f7e070eda844a8ea39a80e24c51
date: 2026-09-20 14:32:15 -05:00
by: Alonso Anchante
notes: El snapshot incluye el fix heredado con origen archive
```

### REQ-FIXES-005-S1

```evidence
method: executable
command: node packages/cli/dist/bin.js status
result: pass
output_hash: sha256:2b2dbc849fb17903b1766c6386b7135b21f89990b4fcff0f7033d9e238048f52
date: 2026-09-20 14:32:15 -05:00
by: Alonso Anchante
notes: Dogfooding real en este repo con los dos fixes del historico visibles
```
