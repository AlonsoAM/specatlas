# Fix — Los paneles no se refrescan en vivo

## Síntoma
La Matriz de trazabilidad, el Tablero, el panel de Métricas y las previsualizaciones de artefactos (`.md` y `.html`) se construían una sola vez al abrirlos: lo que avanzaba el proyecto (tareas marcadas, evidencia registrada, archivado, ediciones de specs) no aparecía hasta cerrar y volver a abrir el panel. Solo el árbol lateral se refrescaba solo.

## Causa raíz
Cada panel asignaba su contenido una única vez al crearse, sin registro de paneles abiertos (`packages/vscode/src/extension.ts`: comandos `specatlas.matrix`, `specatlas.board` y `specatlas.metrics`, y las previsualizaciones de `specatlas.openPreview`). El vigilante de archivos del proyecto (`createFileSystemWatcher('**/.sdd/**')`, `extension.ts:501` con debounce de 300 ms) solo alimentaba al árbol y a los Problems; ningún webview se reconstruía.

## Cambio
Registro de paneles vivos (`LivePanelEntry` en `packages/vscode/src/live.ts`): cada panel declara cómo reconstruirse y el refresco del vigilante reconstruye todos los paneles **visibles**; los ocultos se reconstruyen al volver a mostrarse (`onDidChangeViewState`). Un fallo al reconstruir un panel se aísla y se anota en el canal de salida, sin afectar a los demás. Reabrir la Matriz, el Tablero o Métricas reutiliza el panel existente (`findLivePanel`), sin duplicados. Las previsualizaciones de `.md` y `.html` se rehacen leyendo el archivo de nuevo; si el archivo ya no existe, conservan el contenido anterior.

## Rollback
Revertir el commit: volver a `createWebviewPanel` con asignación única en los tres comandos y en `specatlas.openPreview`, y eliminar `live.ts` con su prueba.

## Evidencia

### REQ-PANELES-001-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/vscode/test/live.test.ts
result: pass
output_hash: sha256:5bda4757815055a890e7b4980255fde60b89e8989fc15a4f87dc171f69f37e1d
date: 2026-09-20 13:22:51 -05:00
by: Alonso Anchante
notes: Mecanismo de refresco con paneles visibles reconstruidos, ocultos intactos y fallo aislado
```

### REQ-PANELES-001-S2

```evidence
method: executable
command: node node_modules/typescript/bin/tsc --noEmit -p packages/vscode
result: pass
output_hash: sha256:01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b
date: 2026-09-20 13:21:57 -05:00
by: Alonso Anchante
notes: La extension compila sin errores de tipos con el registro de paneles vivos
```

### REQ-PANELES-001-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run
result: pass
output_hash: sha256:820026b62662af481d19ab40253215ea2da2a9efa05e5111991890f564a3c9ec
date: 2026-09-20 13:20:47 -05:00
by: Alonso Anchante
notes: Suite completa sin regresiones
```
