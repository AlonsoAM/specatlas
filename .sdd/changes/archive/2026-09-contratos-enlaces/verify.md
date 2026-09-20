# Verificación — contratos-enlaces

### REQ-INTEGRACIONES-001-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-001-S1
result: pass
output_hash: sha256:84833c18a6b7fe71d392e9efddce2f33bff5068d9f202492ad1cdbd7145074d3
date: 2026-09-20 17:16:40 -05:00
by: Alonso Anchante
notes: Extrae operaciones de OpenAPI, GraphQL y protobuf
```

### REQ-INTEGRACIONES-001-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-001-S2
result: pass
output_hash: sha256:eaab9dcff536a7a9fba6ee1d09d407621f47fa2b70c60bc3225cb6ea035d37e9
date: 2026-09-20 17:16:42 -05:00
by: Alonso Anchante
notes: Contrato mal formado se reporta sin inventar
```

### REQ-INTEGRACIONES-001-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-001-S3
result: pass
output_hash: sha256:fdb236b1dc5acefad5af92cc5cbf1f71a641fd74eb8837588687cfbe81dce08a
date: 2026-09-20 17:16:43 -05:00
by: Alonso Anchante
notes: Sin contratos no hay nada que comprobar
```

### REQ-INTEGRACIONES-001-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-001-S4
result: pass
output_hash: sha256:5e61d3d08d410512304ca84ad132b2fd9af65705fc79ca081f45d3a22d86d21c
date: 2026-09-20 17:16:45 -05:00
by: Alonso Anchante
notes: Formato no soportado avisa y no toca el archivo
```

### REQ-INTEGRACIONES-002-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-002-S1
result: pass
output_hash: sha256:61112b3fb4bd2511fec5b7a1d223ef931d33891bf8a8719c5ca03067cc78c8c5
date: 2026-09-20 17:16:46 -05:00
by: Alonso Anchante
notes: Operacion referenciada por escenario no genera hallazgo
```

### REQ-INTEGRACIONES-002-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-002-S2
result: pass
output_hash: sha256:2d7c4d11fd05513a820b976f5f1ac2f5c6c3f57bd3c71ae606fbe580b2dee3ea
date: 2026-09-20 17:16:48 -05:00
by: Alonso Anchante
notes: Operacion sin escenario se reporta con su identificador
```

### REQ-INTEGRACIONES-002-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-002-S3
result: pass
output_hash: sha256:833685bfe9dc02d680fdd1d9d8e0c34b993f4def5b185032e04728ddc61d03dc
date: 2026-09-20 17:16:49 -05:00
by: Alonso Anchante
notes: Referencia rota se reporta con el identificador declarado
```

### REQ-INTEGRACIONES-002-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-002-S4
result: pass
output_hash: sha256:b4dfdd4c61f707507db7349aaa98d32ff75eac3eb0576adff8f2542b015947b6
date: 2026-09-20 17:16:51 -05:00
by: Alonso Anchante
notes: Modo bloqueante detiene el archivado
```

### REQ-INTEGRACIONES-002-S5

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/contracts.test.ts -t REQ-INTEGRACIONES-002-S5
result: pass
output_hash: sha256:360c74c403dc2a0954b21dd5ca7831c003066109a86feebfd7e52fcad7fed3a8
date: 2026-09-20 17:16:52 -05:00
by: Alonso Anchante
notes: Modo apagado no emite cobertura
```

### REQ-INTEGRACIONES-003-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-003-S1
result: pass
output_hash: sha256:21eaa4a609bc59a1d632443a46515549f1df203ca44cd4d1a5086c03f3500d43
date: 2026-09-20 17:16:54 -05:00
by: Alonso Anchante
notes: Registra el enlace con ruta y specs que aporta
```

### REQ-INTEGRACIONES-003-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-003-S2
result: pass
output_hash: sha256:c1163860a305e11cc2f55b33fc3caab69104ba48e2192b6a284f37c888659448
date: 2026-09-20 17:16:55 -05:00
by: Alonso Anchante
notes: Lista enlaces con disponibilidad y requisitos
```

### REQ-INTEGRACIONES-003-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-003-S3
result: pass
output_hash: sha256:0a6ff1268b1a112be2e2c9e9060813fb2235d7d9a92eea109e2954914685ebc6
date: 2026-09-20 17:16:57 -05:00
by: Alonso Anchante
notes: Quitar un enlace deja el resto igual
```

### REQ-INTEGRACIONES-003-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-003-S4
result: pass
output_hash: sha256:ff7d011c1f8c58883a2c2f346aeab7189805b541dcb57c8662e07d8de659690c
date: 2026-09-20 17:17:18 -05:00
by: Alonso Anchante
notes: Enlace invalido o no disponible avisa sin romper nada
```

### REQ-INTEGRACIONES-003-S5

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-003-S5
result: pass
output_hash: sha256:11ace63ad13153eea6ad4546c567364934ddfbe055a4f2ee2cdc01954ea64cd9
date: 2026-09-20 17:17:20 -05:00
by: Alonso Anchante
notes: Consultar enlaces no modifica el proyecto enlazado
```

### REQ-INTEGRACIONES-004-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-004-S1
result: pass
output_hash: sha256:444c6b83271313eebe173b36faa605f77242812408b577b52b0b017162e0c594
date: 2026-09-20 17:17:21 -05:00
by: Alonso Anchante
notes: Tarea que cubre un requisito externo resuelve y el impacto lo marca con origen
```

### REQ-INTEGRACIONES-004-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-004-S2
result: pass
output_hash: sha256:c5829919d348aeabe317ed50b4101901ecdc439ada8722e6553b3c08616dcc92
date: 2026-09-20 17:17:23 -05:00
by: Alonso Anchante
notes: Referencia a un enlace no disponible se reporta no resuelta
```

### REQ-INTEGRACIONES-004-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-004-S3
result: pass
output_hash: sha256:bb41c41c89f991391fb5f36de6a13247a504962ffdd4ac4a5c656ef42f06960b
date: 2026-09-20 17:17:24 -05:00
by: Alonso Anchante
notes: Impacto local y externo distinguibles
```

### REQ-INTEGRACIONES-004-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-004-S4
result: pass
output_hash: sha256:69f0c9a7efb67831b0aaf21168d66486032f2a31bca6dea0b93f26d258fa8bd9
date: 2026-09-20 17:17:26 -05:00
by: Alonso Anchante
notes: Sin enlaces las consultas funcionan igual
```

### REQ-INTEGRACIONES-005-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/cli/test/cli.test.ts -t REQ-INTEGRACIONES-005-S1
result: pass
output_hash: sha256:06d2a6e5f1c76e060534004f07ef9bce041a58e66192863d4dadc02a2193bf22
date: 2026-09-20 17:17:28 -05:00
by: Alonso Anchante
notes: Comprobar contratos desde la terminal
```

### REQ-INTEGRACIONES-005-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/cli/test/cli.test.ts -t REQ-INTEGRACIONES-005-S2
result: pass
output_hash: sha256:66d167b871e28de4c34e16948636599d81459c878cbd6065a2e438ca4979e6f7
date: 2026-09-20 17:17:30 -05:00
by: Alonso Anchante
notes: Gestionar enlaces desde la terminal
```

### REQ-INTEGRACIONES-005-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/cli/test/mcp.test.ts -t REQ-INTEGRACIONES-005
result: pass
output_hash: sha256:30f2ba0b5406da8290c746714cf7336876ff0e69cf3988771628ceb0a1340dcf
date: 2026-09-20 17:17:33 -05:00
by: Alonso Anchante
notes: Consulta de asistentes de contratos y enlaces
```

### REQ-INTEGRACIONES-005-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/links.test.ts -t REQ-INTEGRACIONES-005-S4
result: pass
output_hash: sha256:ea40bf398794b11ec1e8d0bd91f70d07746d9746fefeaf44962bc2999c721584
date: 2026-09-20 17:17:34 -05:00
by: Alonso Anchante
notes: Cambio o enlace inexistente avisa sin efectos
```
