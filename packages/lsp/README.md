# @specatlas/lsp

Servidor de lenguaje de [SpecAtlas](https://github.com/AlonsoAM/specatlas) para los artefactos de `.sdd/`.

```bash
npm i @specatlas/lsp
```

Ofrece diagnósticos en vivo (lint de negocio y trazabilidad), hover con el detalle del requisito, escenario o tarea, CodeLens (`N tareas · evidencia M/N`, `ola N`), ir a definición y referencias entre spec, tareas, verificación y mockups, símbolos del documento y del workspace, y quick fixes (añadir `Cubre:` con el escenario pendiente, copiar el bloque completo para `MODIFIED`).

Lo consume la extensión de VS Code; cualquier editor con cliente LSP puede usarlo.

MIT © SpecAtlas
