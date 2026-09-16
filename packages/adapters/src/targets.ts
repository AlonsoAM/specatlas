import type { Language } from '@specatlas/core'
import { stringify as stringifyYaml } from 'yaml'
import type { PhaseSource, WorkflowSources } from './workflow.js'
import { renderPhase } from './workflow.js'

export type AgentTarget = 'opencode' | 'claude-code' | 'cursor' | 'copilot' | 'gemini' | 'codex' | 'generic'

export const AGENT_TARGETS: AgentTarget[] = ['opencode', 'claude-code', 'cursor', 'copilot', 'gemini', 'codex', 'generic']

export function isAgentTarget(value: string): value is AgentTarget {
  return (AGENT_TARGETS as string[]).includes(value)
}

export interface CompiledFile {
  target: AgentTarget
  path: string
  content: string
}

export interface TargetContext {
  sources: WorkflowSources
  language: Language
  slugToken: string
  commandPrefix: string
}

const LANGUAGE_NAMES: Record<Language, string> = { es: 'español', en: 'inglés' }
const NO_SUBSTITUTION_NOTE = '<!-- Si al invocar indicaste un slug, úsalo; si no, pídelo antes de continuar. -->'

function vars(language: Language, slugToken: string, commandPrefix: string): Parameters<typeof renderPhase>[2] {
  return { SLUG: slugToken, LANGUAGE: language, LANGUAGE_NAME: LANGUAGE_NAMES[language], SDD_DIR: '.sdd', COMMAND_PREFIX: commandPrefix }
}

function frontmatter(data: Record<string, unknown>, body: string): string {
  const yaml = stringifyYaml(data, { lineWidth: 0 }).trimEnd()
  return `---\n${yaml}\n---\n\n${body}\n`
}

export function renderFor(ctx: TargetContext, phase: PhaseSource, slugToken: string): string {
  return renderPhase(phase.body, ctx.sources.snippets, vars(ctx.language, slugToken, ctx.commandPrefix))
}

export function compileTarget(target: AgentTarget, ctx: TargetContext): CompiledFile[] {
  switch (target) {
    case 'opencode':
      return compileOpencode(ctx)
    case 'claude-code':
      return compileClaudeCode(ctx)
    case 'cursor':
      return compileCursor(ctx)
    case 'copilot':
      return compileCopilot(ctx)
    case 'gemini':
      return compileGemini(ctx)
    case 'codex':
    case 'generic':
      return compileAgentsMarkdown(ctx, target)
  }
}

function compileOpencode(ctx: TargetContext): CompiledFile[] {
  const files: CompiledFile[] = []
  for (const phase of ctx.sources.phases) {
    const commandBody = renderFor(ctx, phase, phase.acceptsArguments ? '$ARGUMENTS' : ctx.slugToken)
    const skillBody = renderFor(ctx, phase, ctx.slugToken)
    files.push({
      target: 'opencode',
      path: `.opencode/command/satlas-${phase.id}.md`,
      content: frontmatter({ description: phase.description }, commandBody),
    })
    files.push({
      target: 'opencode',
      path: `.opencode/skills/satlas-${phase.id}/SKILL.md`,
      content: frontmatter({ name: `satlas-${phase.id}`, description: phase.description }, skillBody),
    })
  }
  return files
}

function compileClaudeCode(ctx: TargetContext): CompiledFile[] {
  const files: CompiledFile[] = []
  for (const phase of ctx.sources.phases) {
    const commandBody = renderFor(ctx, phase, phase.acceptsArguments ? '$ARGUMENTS' : ctx.slugToken)
    const skillBody = renderFor(ctx, phase, ctx.slugToken)
    files.push({
      target: 'claude-code',
      path: `.claude/commands/satlas/${phase.id}.md`,
      content: frontmatter({ description: phase.description }, commandBody),
    })
    files.push({
      target: 'claude-code',
      path: `.claude/skills/satlas-${phase.id}/SKILL.md`,
      content: frontmatter({ name: `satlas-${phase.id}`, description: phase.description }, skillBody),
    })
  }
  return files
}

function compileCursor(ctx: TargetContext): CompiledFile[] {
  const files: CompiledFile[] = []
  for (const phase of ctx.sources.phases) {
    const body = renderFor(ctx, phase, ctx.slugToken)
    files.push({
      target: 'cursor',
      path: `.cursor/skills/satlas-${phase.id}/SKILL.md`,
      content: frontmatter({ name: `satlas-${phase.id}`, description: phase.description, 'disable-model-invocation': true }, body),
    })
    files.push({
      target: 'cursor',
      path: `.cursor/commands/satlas-${phase.id}.md`,
      content: `${NO_SUBSTITUTION_NOTE}\n\n${body}\n`,
    })
  }
  return files
}

function compileCopilot(ctx: TargetContext): CompiledFile[] {
  const files: CompiledFile[] = []
  for (const phase of ctx.sources.phases) {
    const body = renderFor(ctx, phase, ctx.slugToken)
    files.push({
      target: 'copilot',
      path: `.github/prompts/satlas-${phase.id}.prompt.md`,
      content: frontmatter({ description: phase.description, name: `satlas-${phase.id}`, agent: 'agent' }, `${NO_SUBSTITUTION_NOTE}\n\n${body}`),
    })
  }
  files.push({ target: 'copilot', path: '.github/copilot-instructions.md', content: agentsBlock(ctx, 'copilot') })
  return files
}

function compileGemini(ctx: TargetContext): CompiledFile[] {
  const files: CompiledFile[] = []
  for (const phase of ctx.sources.phases) {
    const body = renderFor(ctx, phase, phase.acceptsArguments ? '{{args}}' : ctx.slugToken)
    files.push({
      target: 'gemini',
      path: `.gemini/commands/satlas/${phase.id}.toml`,
      content: `# Generado por SpecAtlas (satlas adapters). Invocación: /satlas:${phase.id}\ndescription = ${tomlString(phase.description)}\nprompt = '''\n${body}\n'''\n`,
    })
  }
  files.push({ target: 'gemini', path: 'GEMINI.md', content: agentsBlock(ctx, 'gemini') })
  return files
}

function compileAgentsMarkdown(ctx: TargetContext, target: 'codex' | 'generic'): CompiledFile[] {
  const files: CompiledFile[] = []
  for (const phase of ctx.sources.phases) {
    const body = renderFor(ctx, phase, ctx.slugToken)
    files.push({
      target,
      path: `prompts/satlas-${phase.id}.md`,
      content: `<!-- Generado por SpecAtlas. No editar a mano: satlas adapters lo recompila. -->\n\n# ${phase.title}\n\n${body}\n`,
    })
  }
  files.push({ target, path: 'AGENTS.md', content: agentsBlock(ctx, target) })
  return files
}

function agentsBlock(ctx: TargetContext, flavor: 'codex' | 'generic' | 'copilot' | 'gemini'): string {
  const list = ctx.sources.phases.map((phase) => `- \`prompts/satlas-${phase.id}.md\` — ${phase.title}: ${phase.description}`).join('\n')
  const extra =
    flavor === 'codex'
      ? '\n> Codex: si quieres invocarlos como `/prompts:satlas-<fase>`, copia o enlaza `prompts/*.md` en `~/.codex/prompts/`.\n'
      : ''
  const fileName = flavor === 'gemini' ? 'GEMINI.md' : flavor === 'copilot' ? '.github/copilot-instructions.md' : 'AGENTS.md'
  return `<!-- BEGIN specatlas -->\n## SpecAtlas (SDD)\n\nEste proyecto usa SpecAtlas (${fileName}). Idioma de los artefactos: ${ctx.language === 'en' ? 'inglés' : 'español'}.\nEl estado vive en \`.sdd/\`: specs vivas en \`.sdd/specs/\`, cambios en \`.sdd/changes/\`.\n\nComandos (CLI): \`satlas status\`, \`satlas next\`, \`satlas validate\`, \`satlas trace\`, \`satlas waves\`, \`satlas approve\`, \`satlas archive\`.\n\nFases (prompts en \`prompts/\`):\n\n${list}\n${extra}\nReglas: la spec es funcional y de negocio (sin tecnología); la trazabilidad es obligatoria (requisito → escenario → tarea → evidencia); los artefactos aprobados no se editan.\n<!-- END specatlas -->\n`
}

export function tomlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}
