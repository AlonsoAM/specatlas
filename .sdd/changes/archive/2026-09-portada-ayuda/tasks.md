# Tareas — La ayuda es la portada de la herramienta

## Bloque 1 — La portada

- [x] T1.1 Colores de marca en la terminal: degradado de 24 bits con caída a color plano
  - Archivos: packages/cli/src/ui.ts
  - Cubre: REQ-CLI-006-S1
  - Reversión: revertir el commit

- [x] T1.2 Letrero del nombre, con el nombre escrito normal donde no cabe o no se dibuja
  - Archivos: packages/cli/src/ui.ts, packages/cli/test/ui.test.ts
  - Cubre: REQ-CLI-006-S1, REQ-CLI-006-S8
  - Reversión: revertir el commit

- [x] T1.3 Comandos por momento del flujo, acción destacada, recorte al ancho y pie
  - Archivos: packages/cli/src/commands/help.ts, packages/cli/test/help.test.ts
  - Cubre: REQ-CLI-006-S2, REQ-CLI-006-S3, REQ-CLI-006-S4, REQ-CLI-006-S7
  - Reversión: revertir el commit

- [x] T1.4 La ayuda de un comando concreto llega a donde se decide
  - Archivos: packages/cli/src/cli.ts
  - Cubre: REQ-CLI-006-S5, REQ-CLI-006-S6
  - Reversión: revertir el commit
