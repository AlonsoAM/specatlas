# Tareas — Rediseño del panel lateral y la extensión

## Bloque 1 — Panel lateral

- [x] T1.1 Vista «Ahora»: cambio en foco, acción con su actor, bloqueos y progreso
  - Archivos: packages/vscode/src/views/now.ts, packages/vscode/test/views.test.ts
  - Cubre: REQ-EDITOR-012-S1, REQ-EDITOR-012-S2, REQ-EDITOR-012-S3, REQ-EDITOR-012-S4, REQ-EDITOR-012-S5
  - Reversión: revertir el commit del rediseño

- [x] T1.2 Vista «Salud»: hallazgos agrupados por lo que bloquean y deriva de anclas
  - Archivos: packages/vscode/src/views/health.ts
  - Cubre: REQ-EDITOR-013-S1, REQ-EDITOR-013-S2, REQ-EDITOR-013-S3, REQ-EDITOR-013-S4
  - Reversión: revertir el commit del rediseño

- [x] T1.3 Explicar el código de un hallazgo desde la propia vista
  - Archivos: packages/vscode/src/extension.ts
  - Cubre: REQ-EDITOR-013-S5
  - Reversión: revertir el commit del rediseño

- [x] T1.4 Barra de estado con el paso que toca, bienvenida y alta de las vistas
  - Archivos: packages/vscode/package.json
  - Cubre: REQ-EDITOR-014-S1, REQ-EDITOR-014-S2, REQ-EDITOR-014-S3, REQ-EDITOR-014-S4
  - Reversión: revertir el commit del rediseño

## Bloque 2 — Panel principal y workspace

- [x] T2.1 Sección «Código»: anclas comprobadas, rotas y estado de la revisión
  - Archivos: packages/vscode/src/panel/sections/codigo.ts, packages/vscode/src/panel/panel.ts
  - Cubre: REQ-EDITOR-001-S6
  - Reversión: revertir el commit del rediseño

- [x] T2.2 El snapshot lleva la deriva de anclas y el estado de la revisión
  - Archivos: packages/vscode/src/logic.ts
  - Cubre: REQ-EDITOR-001-S3, REQ-EDITOR-001-S4
  - Reversión: revertir el commit del rediseño

- [x] T2.3 Raíz del árbol aplanada con los cambios primero
  - Archivos: packages/vscode/test/panel.test.ts, packages/vscode/test/panel-scenarios.test.ts
  - Cubre: REQ-EDITOR-001-S1, REQ-EDITOR-001-S2, REQ-EDITOR-001-S5
  - Reversión: revertir el commit del rediseño
