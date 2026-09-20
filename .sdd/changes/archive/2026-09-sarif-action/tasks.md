# Tareas — Ver los hallazgos en GitHub y ejecutar el gate en cada PR

## Bloque 1 — Núcleo: informe SARIF

- [x] T1.1 Implementar la conversión de diagnósticos a informe SARIF 2.1.0 (reglas por código con descripción, niveles, ubicaciones relativas, resultados sin archivo y veredicto) · Archivos: packages/core/src/sarif.ts, packages/core/src/index.ts · Cubre: REQ-CI-001-S1, REQ-CI-001-S2, REQ-CI-002-S1, REQ-CI-002-S2, REQ-CI-002-S3, REQ-CI-005-S1 · Reversión: eliminar sarif.ts y su exportación de index.ts
- [x] T1.2 Añadir pruebas unitarias de la conversión (reglas deduplicadas, niveles por severidad, rutas relativas, hallazgo sin archivo, informe vacío válido) · Archivos: packages/core/test/sarif.test.ts · Cubre: REQ-CI-001-S2, REQ-CI-002-S1, REQ-CI-002-S2, REQ-CI-002-S3 · Depende de: T1.1 · Reversión: eliminar el archivo de pruebas

## Bloque 2 — CLI, Action y documentación

- [x] T2.1 Añadir la bandera --sarif al comando ci (escribe el informe, avisa si la ruta no es escribible y no altera el veredicto) · Archivos: packages/cli/src/commands/ci.ts, packages/cli/src/catalog.ts · Cubre: REQ-CI-001-S1, REQ-CI-001-S2, REQ-CI-001-S3, REQ-CI-001-S4, REQ-CI-003-S1, REQ-CI-003-S2, REQ-CI-003-S3 · Reversión: quitar la bandera del comando y del catálogo
- [x] T2.2 Crear la Action compuesta oficial (versión, ruta y modo estricto como entradas; instala de npm, corre el gate y publica el informe sin cambiar el veredicto) · Archivos: action.yml · Cubre: REQ-CI-004-S1, REQ-CI-004-S2, REQ-CI-004-S3, REQ-CI-004-S4, REQ-CI-001-S3, REQ-CI-005-S2 · Depende de: T2.1 · Reversión: eliminar action.yml
- [x] T2.3 Añadir pruebas de extremo a extremo de la bandera y de la Action (contrato de action.yml, ruta no escribible, informe sin secretos, veredicto sin conexión) · Archivos: packages/cli/test/ci-sarif.test.ts · Cubre: REQ-CI-002-S2, REQ-CI-003-S1, REQ-CI-003-S2, REQ-CI-003-S3, REQ-CI-004-S1, REQ-CI-004-S2, REQ-CI-004-S3, REQ-CI-004-S4, REQ-CI-005-S1, REQ-CI-005-S3 · Depende de: T2.1, T2.2 · Reversión: eliminar el archivo de pruebas
- [x] T2.4 Documentar el informe y la Action con ejemplo de workflow y permisos · Archivos: README.md, ARQUITECTURA.md · Infra · Depende de: T2.3 · Reversión: revertir las secciones
- [x] T2.5 Ejecutar la verificación completa y registrar la evidencia de los 17 escenarios · Archivos: .sdd/changes/sarif-action/verify.md · Cubre: REQ-CI-001-S1, REQ-CI-001-S2, REQ-CI-001-S3, REQ-CI-001-S4, REQ-CI-002-S1, REQ-CI-002-S2, REQ-CI-002-S3, REQ-CI-003-S1, REQ-CI-003-S2, REQ-CI-003-S3, REQ-CI-004-S1, REQ-CI-004-S2, REQ-CI-004-S3, REQ-CI-004-S4, REQ-CI-005-S1, REQ-CI-005-S2, REQ-CI-005-S3 · Depende de: T2.3, T2.4 · Reversión: eliminar los bloques de evidencia
