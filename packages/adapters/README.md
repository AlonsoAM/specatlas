# @specatlas/adapters

Compilador de prompts de [SpecAtlas](https://github.com/AlonsoAM/specatlas): las fases del flujo se escriben una sola vez en `workflow/` y se compilan al formato nativo de cada asistente.

```bash
npm i @specatlas/adapters
```

| Target | Artefactos | Invocación |
|---|---|---|
| `opencode` | `.opencode/command/*` + skills | `/satlas-specify` |
| `claude-code` | `.claude/commands/satlas/*` + skills | `/satlas:specify` |
| `cursor`, `copilot`, `codex`, `generic` | sus carpetas propias | `/satlas-specify` |
| `gemini` | `.gemini/commands/satlas/*.toml` | `/satlas:specify` |

```ts
import { compileTargets, checkAdapters } from '@specatlas/adapters'

await compileTargets({ root, workflowDir, targets: ['opencode', 'claude-code'], language: 'es' })
```

Cada target recibe la invocación en su propia sintaxis, así que lo que la herramienta te dice que copies existe de verdad en tu agente.

MIT © SpecAtlas
