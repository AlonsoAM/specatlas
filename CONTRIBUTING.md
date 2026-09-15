# Contribuir a SpecAtlas

Gracias por querer aportar. Estas son las reglas mínimas del proyecto.

## Principios

1. **El kernel no sabe de IA.** Todo lo verificable es código determinista con tests.
2. **Español por defecto.** Todo artefacto generado y la documentación se escriben en español; el inglés es opcional y explícito.
3. **Sin dependencias innecesarias.** El kernel usa `zod` y `yaml`; el CLI, solo Node built-ins.
4. **Todo cambio llega con tests.** `pnpm test` y `pnpm -r typecheck` deben pasar.

## Flujo de trabajo

```bash
pnpm install
pnpm test          # tests del kernel y la CLI
pnpm -r typecheck  # tipos
pnpm satlas help   # ejecuta la CLI desde fuentes
```

- Ramas: `feat/<tema>`, `fix/<tema>`, `docs/<tema>`.
- Commits en español, estilo Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`).
- Sin firmas de IA en los commits.
- Un PR por tema, con descripción del qué y el porqué.

## Estructura

- `packages/core` — kernel determinista (parsers, lint, trace, waves, lifecycle, archive).
- `packages/cli` — CLI `specatlas`/`satlas`.
- `profiles/` — perfiles de stack (comunidad bienvenida).
- `fixtures/` — repos multi-stack para pruebas de integración.
- `PROPUESTA.md` y `ARQUITECTURA.md` — el diseño de referencia.

## Código de conducta

Trato respetuoso y profesional. No se toleran ataques personales ni discriminación.
