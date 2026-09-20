# Tareas — Consultar el estado del proyecto desde el asistente

## Bloque 1 — Núcleo: impacto y glosario

- [x] T1.1 Implementar el análisis de impacto por requisito y por archivo · Archivos: packages/core/src/impact.ts, packages/core/src/index.ts · Cubre: REQ-MCP-004-S1, REQ-MCP-004-S2, REQ-MCP-004-S3 · Reversión: eliminar impact.ts y su exportación de index.ts
- [x] T1.2 Implementar el lector del glosario del proyecto · Archivos: packages/core/src/parse/glossary.ts, packages/core/src/index.ts · Cubre: REQ-MCP-005-S1, REQ-MCP-005-S2 · Reversión: eliminar glossary.ts y su exportación de index.ts
- [x] T1.3 Añadir pruebas unitarias de impacto y glosario · Archivos: packages/core/test/impact-glossary.test.ts · Cubre: REQ-MCP-004-S1, REQ-MCP-004-S2, REQ-MCP-004-S3, REQ-MCP-005-S1, REQ-MCP-005-S2 · Depende de: T1.1, T1.2 · Reversión: eliminar el archivo de pruebas

## Bloque 2 — Vía de consulta para asistentes

- [x] T2.1 Implementar el protocolo de mensajes y sus errores · Archivos: packages/cli/src/mcp/protocol.ts · Infra · Reversión: eliminar protocol.ts
- [x] T2.2 Implementar el bucle de entrada y salida estándar con registro por la salida de error · Archivos: packages/cli/src/mcp/server.ts · Depende de: T2.1 · Infra · Reversión: eliminar server.ts
- [x] T2.3 Registrar el comando de consulta en el catálogo y el despachador · Archivos: packages/cli/src/commands/mcp.ts, packages/cli/src/catalog.ts, packages/cli/src/cli.ts · Depende de: T2.2 · Infra · Reversión: quitar la entrada del catálogo y el handler
- [x] T2.4 Implementar la operación de estado general y por cambio · Archivos: packages/cli/src/mcp/tools/status.ts · Cubre: REQ-MCP-001-S1, REQ-MCP-001-S2, REQ-MCP-001-S3, REQ-MCP-001-S4, REQ-MCP-001-S5 · Depende de: T2.2 · Reversión: eliminar tools/status.ts
- [x] T2.5 Implementar la operación de siguiente acción · Archivos: packages/cli/src/mcp/tools/next.ts · Cubre: REQ-MCP-002-S1, REQ-MCP-002-S2, REQ-MCP-002-S3, REQ-MCP-002-S4 · Depende de: T2.2 · Reversión: eliminar tools/next.ts
- [x] T2.6 Implementar la operación de hallazgos · Archivos: packages/cli/src/mcp/tools/validate.ts · Cubre: REQ-MCP-003-S1, REQ-MCP-003-S2 · Depende de: T2.2 · Reversión: eliminar tools/validate.ts
- [x] T2.7 Implementar la operación de cobertura · Archivos: packages/cli/src/mcp/tools/trace.ts · Cubre: REQ-MCP-003-S3 · Depende de: T2.2 · Reversión: eliminar tools/trace.ts
- [x] T2.8 Implementar la operación de impacto con el módulo del núcleo del bloque 1 · Archivos: packages/cli/src/mcp/tools/impact.ts · Cubre: REQ-MCP-004-S1, REQ-MCP-004-S2, REQ-MCP-004-S3 · Depende de: T2.2 · Reversión: eliminar tools/impact.ts
- [x] T2.9 Implementar la operación de glosario con el módulo del núcleo del bloque 1 · Archivos: packages/cli/src/mcp/tools/glossary.ts · Cubre: REQ-MCP-005-S1, REQ-MCP-005-S2 · Depende de: T2.2 · Reversión: eliminar tools/glossary.ts
- [x] T2.10 Exponer solo operaciones de consulta y verificar que ninguna escribe · Archivos: packages/cli/src/mcp/tools/list.ts, packages/cli/src/mcp/tools/index.ts · Cubre: REQ-MCP-006-S1, REQ-MCP-006-S2 · Depende de: T2.2 · Reversión: eliminar el registro de herramientas
- [x] T2.11 Añadir pruebas del servidor de consulta sobre mensajes completos · Archivos: packages/cli/test/mcp.test.ts · Cubre: REQ-MCP-001-S1, REQ-MCP-001-S3, REQ-MCP-001-S4, REQ-MCP-001-S5, REQ-MCP-002-S1, REQ-MCP-002-S2, REQ-MCP-003-S1, REQ-MCP-003-S2, REQ-MCP-003-S3, REQ-MCP-006-S1, REQ-MCP-006-S2 · Depende de: T2.2, T2.4, T2.5, T2.6, T2.7, T2.10 · Reversión: eliminar el archivo de pruebas
- [x] T2.12 Documentar la vía de consulta en la guía y en la arquitectura · Archivos: README.md, ARQUITECTURA.md · Infra · Depende de: T2.11 · Reversión: revertir las dos secciones
- [x] T2.13 Ejecutar la validación completa y registrar la evidencia de los 19 escenarios · Archivos: .sdd/changes/mcp-server/verify.md · Cubre: REQ-MCP-001-S1, REQ-MCP-001-S2, REQ-MCP-001-S3, REQ-MCP-001-S4, REQ-MCP-001-S5, REQ-MCP-002-S1, REQ-MCP-002-S2, REQ-MCP-002-S3, REQ-MCP-002-S4, REQ-MCP-003-S1, REQ-MCP-003-S2, REQ-MCP-003-S3, REQ-MCP-004-S1, REQ-MCP-004-S2, REQ-MCP-004-S3, REQ-MCP-005-S1, REQ-MCP-005-S2, REQ-MCP-006-S1, REQ-MCP-006-S2 · Depende de: T2.11, T2.12 · Reversión: eliminar los bloques de evidencia
