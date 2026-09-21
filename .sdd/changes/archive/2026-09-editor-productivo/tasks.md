# Tareas — Primeros pasos, plantillas y comprobaciones del editor

## Bloque 1 — Primeros pasos

- [x] T1.1 Recorrido de cinco etapas con su contenido y su marcado automático
  - Archivos: packages/vscode/media/walkthrough/inicializar.md, packages/vscode/media/walkthrough/cambio.md, packages/vscode/media/walkthrough/especificar.md, packages/vscode/media/walkthrough/aprobar.md, packages/vscode/media/walkthrough/evidencia.md
  - Cubre: REQ-EDITOR-018-S1, REQ-EDITOR-018-S2
  - Reversión: revertir el commit

## Bloque 2 — Plantillas de los artefactos

- [x] T2.1 Catálogo de plantillas por artefacto
  - Archivos: packages/vscode/src/views/plantillas.ts
  - Cubre: REQ-EDITOR-019-S1, REQ-EDITOR-019-S2
  - Reversión: revertir el commit

- [x] T2.2 Se ofrecen solo dentro del flujo
  - Archivos: packages/vscode/test/plantillas-tareas.test.ts
  - Cubre: REQ-EDITOR-019-S3
  - Reversión: revertir el commit

## Bloque 3 — Comprobaciones como tareas

- [x] T3.1 Catálogo de comprobaciones y su proveedor de tareas
  - Archivos: packages/vscode/src/views/tareas-vscode.ts
  - Cubre: REQ-EDITOR-020-S1, REQ-EDITOR-020-S3
  - Reversión: revertir el commit

- [x] T3.2 Recogida de hallazgos con archivo, línea y gravedad
  - Archivos: packages/vscode/package.json
  - Cubre: REQ-EDITOR-020-S2
  - Reversión: revertir el commit

## Bloque 4 — El editor de verdad

- [x] T4.1 Arnés que arranca el editor con un proyecto del flujo
  - Archivos: packages/vscode/.vscode-test.mjs, packages/vscode/test-integracion/tsconfig.json
  - Cubre: REQ-EDITOR-021-S1
  - Reversión: revertir el commit

- [x] T4.2 Comprobaciones de acciones registradas, secciones y contribuciones
  - Archivos: packages/vscode/test-integracion/src/extension.test.cts, .github/workflows/ci.yml
  - Cubre: REQ-EDITOR-021-S2, REQ-EDITOR-021-S3
  - Reversión: revertir el commit
