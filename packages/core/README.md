# @specatlas/core

Núcleo determinista de [SpecAtlas](https://github.com/AlonsoAM/specatlas): el que lee los artefactos de `.sdd/` y decide, sin modelo de por medio, en qué estado está cada cambio.

```bash
npm i @specatlas/core
```

Contiene los parsers (spec viva, delta, tareas, evidencia, revisión, contratos), el linter de negocio, el motor de trazabilidad, el planificador de olas, el ciclo de vida y sus gates, las firmas con hash canónico, las anclas al código y su deriva, las migraciones de esquema y los informes (`analyze`, `ci`, SARIF).

```ts
import { loadWorkspace, deriveState, checkTrace, checkDrift } from '@specatlas/core'

const { workspace, config } = await loadWorkspace(process.cwd())
for (const change of workspace.changes) {
  const state = deriveState({ change, cfg: config, approval, blockingFindings: 0 })
  console.log(change.slug, state.state, '→', state.nextAction.command)
}
```

La forma habitual de usarlo es la CLI [`specatlas`](https://www.npmjs.com/package/specatlas); este paquete es para integrar el kernel en tus propias herramientas.

MIT © SpecAtlas
