# Verificación — portada-ayuda

### REQ-CLI-006-S1

```evidence
method: executable
command: node packages/cli/dist/bin.js help
result: pass
output_hash: sha256:24e6351b9a793d0beb12732d4b59b6bf766fcbe5fd68f2349a9e2afbb561a76d
date: 2026-09-21 18:26:22 -05:00
by: Alonso Anchante
```

### REQ-CLI-006-S2

```evidence
method: executable
command: npx vitest run packages/cli/test/help.test.ts
result: pass
output_hash: sha256:6db37dd7d35d75a26bf351cae7f5ee3640ba36de13ea46f443b586c0c99f3396
date: 2026-09-21 18:26:25 -05:00
by: Alonso Anchante
```

### REQ-CLI-006-S3

```evidence
method: executable
command: node packages/cli/dist/bin.js help
result: pass
output_hash: sha256:24e6351b9a793d0beb12732d4b59b6bf766fcbe5fd68f2349a9e2afbb561a76d
date: 2026-09-21 18:26:26 -05:00
by: Alonso Anchante
```

### REQ-CLI-006-S4

```evidence
method: executable
command: npx vitest run packages/cli/test/help.test.ts
result: pass
output_hash: sha256:efdcee6c7d061e1ccb65057abce7dbf712794b4adbe2ed8af064b4efb852892c
date: 2026-09-21 18:26:28 -05:00
by: Alonso Anchante
```

### REQ-CLI-006-S5

```evidence
method: executable
command: node packages/cli/dist/bin.js help verify
result: pass
output_hash: sha256:93d570d29eade334cdd4da756d28255e640ad31ccb4e3e5927332be15baa0152
date: 2026-09-21 18:26:34 -05:00
by: Alonso Anchante
```

### REQ-CLI-006-S6

```evidence
method: executable
command: npx vitest run packages/cli/test/help.test.ts
result: pass
output_hash: sha256:8d24a1a0d75d16641050b430cbced19782f62b615d0a32697ab5e0aced2e2c64
date: 2026-09-21 18:26:37 -05:00
by: Alonso Anchante
```

### REQ-CLI-006-S7

```evidence
method: executable
command: npx vitest run packages/cli/test/ui.test.ts
result: pass
output_hash: sha256:8ea4441e1d16ea92312c35cdba19624796a2df2753dc1891474e6142a72d9699
date: 2026-09-21 18:26:39 -05:00
by: Alonso Anchante
```

### REQ-CLI-006-S8

```evidence
method: executable
command: npx vitest run packages/cli/test/ui.test.ts
result: pass
output_hash: sha256:6f1f83fe043f026690b32e986fbd2ace52f9fa8091867a373de5a5761dfec564
date: 2026-09-21 18:26:42 -05:00
by: Alonso Anchante
```
