# Verificación — sarif-action

### REQ-CI-001-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-001-S1
result: pass
output_hash: sha256:7d40a38fc894ada6cf0467fac20ff970b1cbfc59411079e347d06c36f4ed09a3
date: 2026-09-20 13:02:04 -05:00
by: Alonso Anchante
notes: Informe con hallazgos anotados en archivo y línea y gate en fallo
```

### REQ-CI-001-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-001-S2
result: pass
output_hash: sha256:8db123a05458ab28de2b62bf91110561f5453b7bb4e8d92ba0c05854c97eedc7
date: 2026-09-20 13:02:06 -05:00
by: Alonso Anchante
notes: Informe válido y vacío sin hallazgos
```

### REQ-CI-001-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-001-S3
result: pass
output_hash: sha256:feb7da22d285797276a34f2d917c3f323bc2bc470eb19d5faa86206c5983bd54
date: 2026-09-20 13:02:08 -05:00
by: Alonso Anchante
notes: Publicar el informe no cambia el veredicto
```

### REQ-CI-001-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-001-S4
result: pass
output_hash: sha256:5da659c264d65d7e98a094cf24c27c3077c2bc88fb9dcbf8398b437817a9d2a8
date: 2026-09-20 13:02:10 -05:00
by: Alonso Anchante
notes: Ruta no escribible avisa sin cambiar el veredicto
```

### REQ-CI-002-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-002-S1
result: pass
output_hash: sha256:f82883853e9ee72c417648ef3c6c55bb35469c29b85e5d283b4924a4f8753511
date: 2026-09-20 13:02:12 -05:00
by: Alonso Anchante
notes: Reglas únicas por código con descripción y hallazgos que las referencian
```

### REQ-CI-002-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-002-S2
result: pass
output_hash: sha256:3fce15535cb33338c438417d1168745c6ed5d55eea9bdafd6787b838223e9a97
date: 2026-09-20 13:02:14 -05:00
by: Alonso Anchante
notes: Ubicaciones relativas en posix con línea
```

### REQ-CI-002-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-002-S3
result: pass
output_hash: sha256:442b957fe5300797bcca223760aeb1003b67235eed8b428423149b828cee7481
date: 2026-09-20 13:02:16 -05:00
by: Alonso Anchante
notes: Hallazgo sin archivo va en la sección general
```

### REQ-CI-003-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-003-S1
result: pass
output_hash: sha256:1169f04fd90fb7756bab8b7565ce2dc3400197d1e46398cb1602a100a9e05b31
date: 2026-09-20 13:02:18 -05:00
by: Alonso Anchante
notes: Hallazgos bloqueantes bloquean la propuesta
```

### REQ-CI-003-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-003-S2
result: pass
output_hash: sha256:ec95c4247a2d0f9944f801ca9e1cb546ed9b72648a61ca9cbb57077d90717d33
date: 2026-09-20 13:02:20 -05:00
by: Alonso Anchante
notes: Modo estricto bloquea por avisos
```

### REQ-CI-003-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-003-S3
result: pass
output_hash: sha256:430d493922fba56616535814d9890252a1161fd7b0750fea756abb285f4a989f
date: 2026-09-20 13:02:43 -05:00
by: Alonso Anchante
notes: Avisos sin modo estricto no bloquean
```

### REQ-CI-004-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-004-S1
result: pass
output_hash: sha256:987fc313689a64f103cfb78eac84970bb8085f7ae48dab0f99c55b64ddc2b56b
date: 2026-09-20 13:02:45 -05:00
by: Alonso Anchante
notes: Un solo paso sin preparar el proyecto
```

### REQ-CI-004-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-004-S2
result: pass
output_hash: sha256:c0d3f2b1101af84af9554037ad890c9b5c157e14939c2f818606ec385d47d2e0
date: 2026-09-20 13:02:47 -05:00
by: Alonso Anchante
notes: Versión fijable por entrada
```

### REQ-CI-004-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-004-S3
result: pass
output_hash: sha256:920c9d146fea338bca920ccba4ef396775622a283868fec1c539406708159b50
date: 2026-09-20 13:02:49 -05:00
by: Alonso Anchante
notes: Proyecto sin inicializar se informa sin romper el flujo
```

### REQ-CI-004-S4

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-004-S4
result: pass
output_hash: sha256:7bfa89d924bd9767c7f5c91e649a6f9b39821d23983d620a2f856f72bf99154d
date: 2026-09-20 13:02:51 -05:00
by: Alonso Anchante
notes: Herramienta no disponible se informa con claridad
```

### REQ-CI-005-S1

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-005-S1
result: pass
output_hash: sha256:3aec441a249f45b82572e8910e6cd30ac9963cc54af4eafca7089d861ef33f19
date: 2026-09-20 13:02:53 -05:00
by: Alonso Anchante
notes: El informe no lleva contenido de archivos ni credenciales
```

### REQ-CI-005-S2

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-005-S2
result: pass
output_hash: sha256:8862f4a9ef46dd942a3e379d9a47469855fc648aa337d530cb7c6dcd9b8787bc
date: 2026-09-20 13:02:55 -05:00
by: Alonso Anchante
notes: Permisos mínimos suficientes para el veredicto
```

### REQ-CI-005-S3

```evidence
method: executable
command: node node_modules/vitest/vitest.mjs run packages/core/test/sarif.test.ts packages/cli/test/ci-sarif.test.ts -t REQ-CI-005-S3
result: pass
output_hash: sha256:f92cdadd430daad86cc38de0c0eae35f1b8b3e099594567edb0c58881f11816e
date: 2026-09-20 13:02:57 -05:00
by: Alonso Anchante
notes: Veredicto sin red
```
