import type { AtlasConfig } from './config.js'

/** Fases que ejecuta un agente (una por prompt de `workflow/phases/`). */
export type PhaseId = 'adopt' | 'specify' | 'clarify' | 'mockup' | 'plan' | 'build' | 'verify' | 'review' | 'docs' | 'fix' | 'archive'

export type AgentTarget = AtlasConfig['adapters']['targets'][number]

/**
 * Cada agente invoca sus artefactos con su propia sintaxis. El compilador de
 * adaptadores escribe los archivos; esta tabla dice cómo se llaman desde el chat.
 */
const INVOCATION: Record<AgentTarget, (phase: PhaseId) => string> = {
  opencode: (phase) => `/satlas-${phase}`,
  'claude-code': (phase) => `/satlas:${phase}`,
  cursor: (phase) => `/satlas-${phase}`,
  copilot: (phase) => `/satlas-${phase}`,
  gemini: (phase) => `/satlas:${phase}`,
  codex: (phase) => `/satlas-${phase}`,
  generic: (phase) => `prompts/satlas-${phase}.md`,
}

/** El primer target configurado manda: es el agente con el que trabaja el equipo. */
export function primaryTarget(cfg?: Pick<AtlasConfig, 'adapters'>): AgentTarget {
  return cfg?.adapters.targets[0] ?? 'opencode'
}

/**
 * Invocación real de una fase para el agente del proyecto, lista para copiar.
 * Nunca se escribe a mano: `next`, `status`, el panel y el LSP usan esta función
 * para que lo que se copia exista de verdad en el agente configurado.
 */
export function agentCommand(phase: PhaseId, slug: string, cfg?: Pick<AtlasConfig, 'adapters'>): string {
  const target = primaryTarget(cfg)
  const invocation = (INVOCATION[target] ?? INVOCATION.opencode)(phase)
  return slug.length > 0 ? `${invocation} ${slug}` : invocation
}

/** Cómo se invoca la fase en cada agente soportado (para la ayuda y la documentación). */
export function agentCommandsByTarget(phase: PhaseId, slug: string): Array<{ target: AgentTarget; command: string }> {
  return (Object.keys(INVOCATION) as AgentTarget[]).map((target) => {
    const invocation = INVOCATION[target](phase)
    return { target, command: slug.length > 0 ? `${invocation} ${slug}` : invocation }
  })
}

/**
 * Ejecutable de terminal de cada agente. `generic` no tiene CLI propia: se
 * usa opencode como el asistente por defecto del proyecto.
 */
const CLI: Record<AgentTarget, string> = {
  opencode: 'opencode',
  'claude-code': 'claude',
  cursor: 'cursor-agent',
  copilot: 'copilot',
  gemini: 'gemini',
  codex: 'codex',
  generic: 'opencode',
}

export function agentCli(target?: AgentTarget): string {
  return CLI[target ?? 'opencode'] ?? 'opencode'
}
