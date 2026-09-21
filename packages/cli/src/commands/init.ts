import path from 'node:path'
import { initWorkspace, loadConfig, writeConfig, type Language } from '@specatlas/core'
import { AGENT_TARGETS, compileTargets, isAgentTarget, type AgentTarget } from '@specatlas/adapters'
import { flagBool, flagString } from '../args.js'
import type { CliContext, CommandResult } from '../cli.js'
import { msg } from '../messages.js'
import { resolveProfilesDir, resolveWorkflowDir } from '../paths.js'

export async function runInit(ctx: CliContext): Promise<CommandResult> {
  const languageFlag = flagString(ctx.flags, 'language')
  const language: Language | undefined = languageFlag === 'en' ? 'en' : languageFlag === 'es' ? 'es' : undefined
  const profilesDir = flagString(ctx.flags, 'profiles') ?? (await resolveProfilesDir())
  const result = await initWorkspace({
    root: ctx.cwd,
    name: flagString(ctx.flags, 'name'),
    language,
    local: flagBool(ctx.flags, 'local'),
    profilesDir,
  })

  const compiled: string[] = []
  const workflowDir = await resolveWorkflowDir()
  if (!workflowDir) {
    result.diagnostics.push({
      code: 'ATLAS-ADAPTERS-003',
      severity: 'error',
      message: 'No se encontró la carpeta workflow/phases con las fuentes de prompts: no se compilaron los adaptadores',
      suggestion: 'Verifica la instalación del CLI o define SPECATLAS_WORKFLOW_DIR apuntando a la carpeta workflow del paquete',
    })
  } else if (!result.diagnostics.some((d) => d.severity === 'error')) {
    const loaded = await loadConfig(result.sddDir)
    const agentsFlag = flagString(ctx.flags, 'agents')
    const requested = agentsFlag
      ? agentsFlag.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : loaded.config.adapters.targets
    const invalid = requested.filter((t) => !isAgentTarget(t))
    if (invalid.length > 0) {
      result.diagnostics.push({
        code: 'ATLAS-ADAPTERS-004',
        severity: 'error',
        message: `Targets inválidos: ${invalid.join(', ')}`,
        suggestion: `Targets disponibles: ${AGENT_TARGETS.join(', ')}`,
      })
    } else {
      // El agente elegido al inicializar manda: la configuración del proyecto lo refleja
      // para que las invocaciones que se copian sean las de ese agente.
      if (agentsFlag) {
        await writeConfig(result.sddDir, { ...loaded.config, adapters: { ...loaded.config.adapters, targets: requested as AgentTarget[] } })
      }
      const report = await compileTargets({
        root: ctx.cwd,
        workflowDir,
        targets: requested as AgentTarget[],
        language: loaded.config.project.language,
      })
      compiled.push(...report.written)
      result.diagnostics.push(...report.diagnostics)
    }
  }

  const lines: string[] = [msg('init.title', ctx.language), '']
  if (result.created.length > 0) {
    lines.push(msg('init.done', ctx.language))
    for (const file of result.created) lines.push(`  + ${path.relative(ctx.cwd, file)}`)
    if (compiled.length > 0) {
      lines.push('')
      lines.push('Adaptadores compilados:')
      for (const file of compiled) lines.push(`  + ${path.relative(ctx.cwd, path.join(ctx.cwd, file))}`)
    }
    lines.push('')
    lines.push('Siguiente: crea un cambio con `satlas new <slug>` y escribe la spec funcional.')
  }
  const hasErrors = result.diagnostics.some((d) => d.severity === 'error')
  return {
    exitCode: hasErrors ? 1 : 0,
    diagnostics: result.diagnostics,
    data: {
      sddDir: path.relative(ctx.cwd, result.sddDir),
      created: result.created.map((f) => path.relative(ctx.cwd, f)),
      detected: result.detected?.matches.map((m) => ({ name: m.name, score: m.score })),
      best: result.detected?.best?.name,
    },
    text: lines,
  }
}
