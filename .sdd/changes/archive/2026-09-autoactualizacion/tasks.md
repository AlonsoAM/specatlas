# Tareas — Mantener la herramienta al día

## Bloque 1 — Saber que hay versión nueva

- [x] T1.1 Consulta al registro con límite de tiempo y caché de 24 horas
  - Archivos: packages/core/src/selfupdate.ts
  - Cubre: REQ-CLI-001-S1, REQ-CLI-001-S3, REQ-CLI-001-S4
  - Reversión: revertir el commit

- [x] T1.2 Aviso después del resultado, callado donde debe callarse
  - Archivos: packages/cli/src/cli.ts
  - Cubre: REQ-CLI-001-S2, REQ-CLI-001-S5
  - Reversión: revertir el commit

## Bloque 2 — Actualizar con una sola orden

- [x] T2.1 Reconocer con qué gestor se instaló y proponer su orden
  - Archivos: packages/core/test/selfupdate.test.ts
  - Cubre: REQ-CLI-002-S1, REQ-CLI-002-S5

  - Reversión: revertir el commit

- [x] T2.2 El comando: consultar, instalar y explicar el fallo
  - Archivos: packages/cli/src/commands/self-update.ts
  - Cubre: REQ-CLI-002-S2, REQ-CLI-002-S3, REQ-CLI-002-S4
  - Reversión: revertir el commit

## Bloque 3 — Desatendida para quien la quiera

- [x] T3.1 Preferencia personal: desactivada por defecto, consultable y reversible
  - Archivos: packages/cli/src/catalog.ts
  - Cubre: REQ-CLI-003-S1, REQ-CLI-003-S2, REQ-CLI-003-S3, REQ-CLI-003-S4
  - Reversión: revertir el commit
