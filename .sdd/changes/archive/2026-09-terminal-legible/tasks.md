# Tareas — La terminal se lee de un vistazo

## Bloque 1 — Lo importante se distingue

- [x] T1.1 Módulo de presentación: marcas, colores, barra y bloques repetidos
  - Archivos: packages/cli/src/ui.ts
  - Cubre: REQ-CLI-004-S1, REQ-CLI-004-S3
  - Reversión: revertir el commit

- [x] T1.2 Hallazgos y recuento en toda respuesta
  - Archivos: packages/cli/src/cli.ts
  - Cubre: REQ-CLI-004-S2, REQ-CLI-004-S4, REQ-CLI-004-S5
  - Reversión: revertir el commit

- [x] T1.3 Estado, siguiente acción, validación, comprobación y salud
  - Archivos: packages/cli/src/commands/status.ts, packages/cli/src/commands/next.ts, packages/cli/src/commands/validate.ts, packages/cli/src/commands/ci.ts, packages/cli/src/commands/doctor.ts
  - Cubre: REQ-CLI-004-S1
  - Reversión: revertir el commit

## Bloque 2 — Se adapta a su destino

- [x] T2.1 Detección de terminal, preferencias de color y ancho
  - Archivos: packages/cli/test/ui.test.ts
  - Cubre: REQ-CLI-005-S1, REQ-CLI-005-S2, REQ-CLI-005-S3, REQ-CLI-005-S5
  - Reversión: revertir el commit

- [x] T2.2 Símbolos con equivalente simple para consolas limitadas
  - Archivos: packages/cli/src/messages.ts
  - Cubre: REQ-CLI-005-S4
  - Reversión: revertir el commit
