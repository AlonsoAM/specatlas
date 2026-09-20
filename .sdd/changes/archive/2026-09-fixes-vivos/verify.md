# Verificación — fixes-vivos

### REQ-FIXES-001-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-001-S1
result: pass
output_hash: sha256:086d95bbcd3351b2d70d87e2e3e0457e924af1e9276cab2d50c3791481e408ed
date: 2026-09-20 14:07:35 -05:00
by: Alonso Anchante
notes: Fix vivo con identidad, contenido integro y listado en el registro
```

### REQ-FIXES-001-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-001-S2
result: pass
output_hash: sha256:7015274d1f0516c4679ab5a5e42f6d012caf4c5d4e42e5dc56d6057d4eacb18e
date: 2026-09-20 14:07:37 -05:00
by: Alonso Anchante
notes: El registro del proyecto incluye la seccion de fixes vivos
```

### REQ-FIXES-001-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-001-S3
result: pass
output_hash: sha256:8880f504dea78f71a991054a6a8be5356e0e7766c755a4432fdaf578614c52d5
date: 2026-09-20 14:07:38 -05:00
by: Alonso Anchante
notes: Re-archivar no duplica ni pisa el fix vivo
```

### REQ-FIXES-001-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-001-S4
result: pass
output_hash: sha256:177bc125bcc3b764159b1caa266575385cc8ff72c11cf44373d483cbf00e743a
date: 2026-09-20 14:07:40 -05:00
by: Alonso Anchante
notes: El carril express no pliega nada en las specs vivas
```

### REQ-FIXES-001-S5

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-001-S5
result: pass
output_hash: sha256:959fe1df39adfcb91ab2a69c58d2af16eb1f002c46da90863713ff90216e81ee
date: 2026-09-20 14:07:41 -05:00
by: Alonso Anchante
notes: Sin permiso no se archiva a medias y el cambio sigue activo
```

### REQ-FIXES-002-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-002-S1
result: pass
output_hash: sha256:f6c45845cf5aab4aa98518b3d6fe02f42c788092b79afedf77fb4db7f6778f0a
date: 2026-09-20 14:07:43 -05:00
by: Alonso Anchante
notes: El snapshot lista los fixes con fecha, dominio y resultado
```

### REQ-FIXES-002-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-002-S2
result: pass
output_hash: sha256:3a2b51f13d110920cb25bd2d0af49f102ea3cf2bb6e8a1bb6179fc90da9e23a4
date: 2026-09-20 14:07:44 -05:00
by: Alonso Anchante
notes: El fix vivo apunta a un archivo existente que se abre
```

### REQ-FIXES-002-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-002-S3
result: pass
output_hash: sha256:681d1aae1c141c3ad2d44fed7fefb98960939ea4b4641a203c40173a9d12e076
date: 2026-09-20 14:07:45 -05:00
by: Alonso Anchante
notes: El historico lista los cambios archivados que no son fixes
```

### REQ-FIXES-002-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-002-S4
result: pass
output_hash: sha256:35fe0f4e1d1af6d33100fe5568e53959a87c583851dd3db979297b2f7daeba1f
date: 2026-09-20 14:07:47 -05:00
by: Alonso Anchante
notes: Sin historial no hay fixes ni archivados
```

### REQ-FIXES-003-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/vscode/test/logic.test.ts -t REQ-FIXES-003-S1
result: pass
output_hash: sha256:f7d98db5720922e3c7f9ea8309faf0ba7e24ba30570d9c8fbac804d94e45e55e
date: 2026-09-20 14:07:49 -05:00
by: Alonso Anchante
notes: La matriz muestra cambios archivados y fixes como procedencia
```

### REQ-FIXES-003-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/vscode/test/logic.test.ts -t REQ-FIXES-003-S2
result: pass
output_hash: sha256:b6acb3c62c04fa6c2761f94c3adde911a68d5c697bd5d90d727544bc5f98af2f
date: 2026-09-20 14:08:06 -05:00
by: Alonso Anchante
notes: Un requisito sin procedencia lo dice expresamente
```

### REQ-FIXES-003-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/vscode/test/logic.test.ts -t REQ-FIXES-003-S3
result: pass
output_hash: sha256:26c485cc8fcf74f9233168bfe1921a57261b38ad76dd05a58de75c6832e2da12
date: 2026-09-20 14:08:08 -05:00
by: Alonso Anchante
notes: Filtro por procedencia presente con sus opciones y atributos de datos
```

### REQ-FIXES-004-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/vscode/test/logic.test.ts -t REQ-FIXES-004-S1
result: pass
output_hash: sha256:d0d4f70ae7697d5820cbc60d1b5d9c26d673561b7481628773ae737ec9c0ad88
date: 2026-09-20 14:08:10 -05:00
by: Alonso Anchante
notes: Un fix con Cubre aparece en la trazabilidad de esos requisitos
```

### REQ-FIXES-004-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-004-S2
result: pass
output_hash: sha256:cae39bc0956fb765c0f3d71ab6d01c8d40f7abccd3aa33d973cd85530b10c102
date: 2026-09-20 14:08:11 -05:00
by: Alonso Anchante
notes: Un requisito inexistente avisa y el fix sigue valido
```

### REQ-FIXES-004-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/fixes.test.ts -t REQ-FIXES-004-S3
result: pass
output_hash: sha256:c90400271347319a146d049cd674aefebe2e6b48e72c8e2fa27372aabc93baae
date: 2026-09-20 14:08:12 -05:00
by: Alonso Anchante
notes: Un fix sin cobertura es valido y no se asocia
```

### REQ-FIXES-005-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/cli/test/cli.test.ts -t REQ-FIXES-005-S1
result: pass
output_hash: sha256:263607d645b96e99d50db2a7ac8a44bda7b62f862e441a1174bb9223b38d3fd8
date: 2026-09-20 14:08:15 -05:00
by: Alonso Anchante
notes: El estado lista los fixes vivos tras archivar
```

### REQ-FIXES-005-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/cli/test/mcp.test.ts -t devuelve
result: pass
output_hash: sha256:a25210ad4e9293d6577e4c55e40e8d335988b94db55902c56e84875726c83400
date: 2026-09-20 14:08:17 -05:00
by: Alonso Anchante
notes: La consulta devuelve identidad, contenido y requisitos declarados
```

### REQ-FIXES-005-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/cli/test/mcp.test.ts -t sugiere
result: pass
output_hash: sha256:9196d5d19fa2e9314a3299a03716fe76036e961b35a0983c7ce1e9fa76c2bac9
date: 2026-09-20 14:08:19 -05:00
by: Alonso Anchante
notes: Sin fixes informa y sugiere archivar o crear
```

### REQ-FIXES-005-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/cli/test/mcp.test.ts -t el
result: pass
output_hash: sha256:e75e11a207d8164817683301427d77615f39f7c64c77da52d52d307191854fa1
date: 2026-09-20 14:08:22 -05:00
by: Alonso Anchante
notes: Tras consultar, los archivos del proyecto quedan intactos
```
