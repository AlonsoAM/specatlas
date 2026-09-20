# Fix — La matriz marca sin tarea escenarios ya cubiertos

## Síntoma
En la Matriz de trazabilidad, escenarios de specs vivas ya verificados (p. ej. `REQ-ESQUEMA-001-S1`, `REQ-ESQUEMA-002-S1…S4`, `REQ-ESQUEMA-003-S1…S4/S6`, `REQ-ESQUEMA-004-*`) aparecían como «sin tarea» aunque sus cambios archivados sí los cubrían. Solo se veían las tareas cuyos ids no colisionaban entre cambios (T1.4, T1.5).

## Causa raíz
El índice del editor fusiona las coberturas cuando dos cambios reutilizan el mismo id de tarea, pero **solo en el bucle de cambios activos** (`packages/lsp/src/index.ts:171`). El bucle de cambios **archivados** descartaba la tarea entera al encontrar el id repetido (`packages/lsp/src/index.ts:113`: `if (tasks.has(task.id)) continue`). Con varios cambios archivados que reutilizan ids (T1.1, T1.2, T2.1…), el último archivado procesado ganaba y la cobertura de los anteriores desaparecía de la matriz; la evidencia (que sí se agrega sin deduplicar) seguía apareciendo, de ahí «pass» junto a «sin tarea».

## Cambio
Fusionar `covers` y `dependsOn` (unión sin duplicados) también en el bucle de archivados, igual que ya se hacía en el de activos. Cambio mínimo en `packages/lsp/src/index.ts`; no toca gramáticas, datos ni el resto del índice.

## Rollback
Revertir el commit: restaurar `if (tasks.has(task.id)) continue` en el bucle de archivados de `packages/lsp/src/index.ts`.

## Evidencia

### REQ-MATRIZ-001-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/vscode/test/logic.test.ts -t dos cambios archivados
result: pass
output_hash: sha256:29958859f0e128d86832c4721d55aaf7ca3eec382147e4bddb0ced5caacba0d7
date: 2026-09-20 13:15:26 -05:00
by: Alonso Anchante
notes: Reproduce el bug antes del cambio y pasa con la fusion de coberturas
```

### REQ-MATRIZ-001-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run
result: pass
output_hash: sha256:a96d8be241d3dd681c94e7da37eaeab26384a64a6f3a5731bc6ef1a0309c334f
date: 2026-09-20 13:15:30 -05:00
by: Alonso Anchante
notes: Suite completa sin regresiones
```
