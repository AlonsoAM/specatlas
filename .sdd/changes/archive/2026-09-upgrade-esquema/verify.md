# Verificación — upgrade-esquema

### REQ-ESQUEMA-001-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-001-S1
result: pass
output_hash: sha256:d2dca0be41669e26bb2b9ec83dc79e43baf2f0cc4e5f0ebbc9a8d0cc67a9d266
date: 2026-09-20 12:39:24 -05:00
by: Alonso Anchante
notes: Aviso en estado, validación y diagnóstico más núcleo; pruebas en verde
```

### REQ-ESQUEMA-001-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-001-S2
result: pass
output_hash: sha256:3ba47d47173ec67d42bfedfbde004e03a95e5cc92bc88a16e004c1a7e974d480
date: 2026-09-20 12:39:26 -05:00
by: Alonso Anchante
notes: Proyecto al día sin aviso en estado y núcleo
```

### REQ-ESQUEMA-001-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-001-S3
result: pass
output_hash: sha256:9d5f3ff01478a19eaeee2cda1b223edac2cefe8f488f3cdecaac4edcc5ae9fac
date: 2026-09-20 12:39:28 -05:00
by: Alonso Anchante
notes: Sin proyecto inicializado responde con la acción de inicializar
```

### REQ-ESQUEMA-001-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-001-S4
result: pass
output_hash: sha256:dc80fe79b146bc364e882cf53ec4a301280933258f3e1a2dcfe0b1e8ffb69151
date: 2026-09-20 12:39:30 -05:00
by: Alonso Anchante
notes: Versión más nueva solo se avisa y nunca se degrada
```

### REQ-ESQUEMA-001-S5

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-001-S5
result: pass
output_hash: sha256:1476310d6d680176a0cbfbb81f6382d9b78c6f37de631f86b134a078b158b352
date: 2026-09-20 12:39:32 -05:00
by: Alonso Anchante
notes: Consultar no modifica los archivos del proyecto
```

### REQ-ESQUEMA-002-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-002-S1
result: pass
output_hash: sha256:1407797640b65d139db1cea615c1074700014048c007a231ad1d351e1482c17b
date: 2026-09-20 12:39:34 -05:00
by: Alonso Anchante
notes: Vista previa lista qué cambiaría sin escribir
```

### REQ-ESQUEMA-002-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-002-S2
result: pass
output_hash: sha256:00c3f616df874968471543ae83510eed630e1381a9e5dbca5b20039b0349a501
date: 2026-09-20 12:39:36 -05:00
by: Alonso Anchante
notes: Sin pendientes informa que no hay nada que actualizar
```

### REQ-ESQUEMA-002-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-002-S3
result: pass
output_hash: sha256:df1168608ac0e829d72b6621b792b7554fbfb579bd00c123796b6e9950ce102b
date: 2026-09-20 12:39:38 -05:00
by: Alonso Anchante
notes: Elemento ilegible se reporta y no se toca
```

### REQ-ESQUEMA-002-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-002-S4
result: pass
output_hash: sha256:55707c733b57bda7316b73f2284b7a02ae223cf76d2459bb1283d6c7ae65778d
date: 2026-09-20 12:39:40 -05:00
by: Alonso Anchante
notes: La vista previa deja el proyecto idéntico
```

### REQ-ESQUEMA-003-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-003-S1
result: pass
output_hash: sha256:383aa37171cdec1ac3cf084908e54dcedd54f655bc877c2af8a56692ba88f666
date: 2026-09-20 12:39:42 -05:00
by: Alonso Anchante
notes: Aplicación con respaldo recuperable
```

### REQ-ESQUEMA-003-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-003-S2
result: pass
output_hash: sha256:e9dc64892f534629f23564aeb4fda0cf5dff080740338fe61bd616c75a658a07
date: 2026-09-20 12:39:44 -05:00
by: Alonso Anchante
notes: Sin pendientes no escribe ni crea respaldo
```

### REQ-ESQUEMA-003-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-003-S3
result: pass
output_hash: sha256:73635072e66840d5a1be6b107156771c6bd5cefd9cc75ac90a52089d55fa9c3c
date: 2026-09-20 12:40:05 -05:00
by: Alonso Anchante
notes: Fallo a mitad restaura lo escrito y deja el proyecto intacto
```

### REQ-ESQUEMA-003-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-003-S4
result: pass
output_hash: sha256:01114d7e0ef00538b77edacec944b89024581e62d12ff7ddbb79a97f58a98256
date: 2026-09-20 12:40:07 -05:00
by: Alonso Anchante
notes: Sin permiso de escritura no se modifica nada
```

### REQ-ESQUEMA-003-S5

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-003-S5
result: pass
output_hash: sha256:d7114e0620bb26ec548f2e278e4d43a67fecefc75fe36b89095d76c43ccfd5b4
date: 2026-09-20 12:40:09 -05:00
by: Alonso Anchante
notes: Aplicar dos veces no cambia nada
```

### REQ-ESQUEMA-003-S6

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-003-S6
result: pass
output_hash: sha256:6e8f977f13f662f4bb64fe1a5d4fe07add239658c6f90329ebd003ff6e6d2626
date: 2026-09-20 12:40:11 -05:00
by: Alonso Anchante
notes: El respaldo conserva el estado previo completo
```

### REQ-ESQUEMA-004-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-004-S1
result: pass
output_hash: sha256:cfa4324f5480f52bdd43be0570c5b2038927c05f122c9a80fcf89033be0df153
date: 2026-09-20 12:40:13 -05:00
by: Alonso Anchante
notes: La reversión restaura el estado previo y consume el respaldo
```

### REQ-ESQUEMA-004-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-004-S2
result: pass
output_hash: sha256:864610ff38b8fa33e8d58828849d9dce9ba8252eece97b32b09ca841dfacfea4
date: 2026-09-20 12:40:15 -05:00
by: Alonso Anchante
notes: Sin respaldo no se modifica nada
```

### REQ-ESQUEMA-004-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-004-S3
result: pass
output_hash: sha256:7b9d7765a9def0e5a07cedaa29cd7cc713622ad718332277e531b74f66c3cef3
date: 2026-09-20 12:40:17 -05:00
by: Alonso Anchante
notes: El trabajo en curso vuelve tal cual estaba
```

### REQ-ESQUEMA-004-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-004-S4
result: pass
output_hash: sha256:b15dca5e8632cebaf3e1a6bd890098097a52447522923b5bc554a5ae40e5baa3
date: 2026-09-20 12:40:19 -05:00
by: Alonso Anchante
notes: La segunda reversión no encuentra nada que restaurar
```

### REQ-ESQUEMA-005-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-005-S1
result: pass
output_hash: sha256:fded9a26fb35e0e245598f3c8cebe5047cba891df6c6475f7baa67feab891e09
date: 2026-09-20 12:40:21 -05:00
by: Alonso Anchante
notes: Proyecto recién iniciado sin actualización pendiente
```

### REQ-ESQUEMA-005-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/migrations.test.ts packages/cli/test/upgrade.test.ts -t REQ-ESQUEMA-005-S2
result: pass
output_hash: sha256:fd5349f3b220116e8f3818bfb7298314a3a7cf9189e8439a07fe2c895b414d95
date: 2026-09-20 12:40:23 -05:00
by: Alonso Anchante
notes: Cambio y aprobación nuevos quedan en la versión vigente
```
