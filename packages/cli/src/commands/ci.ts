import { checkMockups, evaluatePacks, lintSpec, packFindings, planWaves, resolvePacks, runDoctor, type Diagnostic } from '@specatlas/core'
import { checkAdapters } from '@specatlas/adapters'
import { flagBool } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { evaluateChange } from '../evaluate.js'
import { resolveWorkflowDir } from '../paths.js'

const UI_DOMAINS = new Set(['frontend', 'mobile', 'fullstack'])

export async function runCi(ctx: CliContext): Promise<CommandResult> {
  const { root, workspace, config, approvals } = await requireWorkspace(ctx)
  const strict = flagBool(ctx.flags, 'strict')
  const diagnostics: Diagnostic[] = []
  const checks: Array<{ name: string; errors: number; warnings: number }> = []

  const specFindings = workspace.specs.flatMap((spec) => lintSpec(spec.spec, { language: config.spec.language, businessOnly: config.spec.business_only }))
  diagnostics.push(...specFindings)
  checks.push(count('specs vivas', specFindings))

  let changesErrors = 0
  let changesWarnings = 0
  for (const change of workspace.changes) {
    const evaluation = await evaluateChange(workspace, config, change, approvals)
    const changeDiags: Diagnostic[] = [...evaluation.lintFindings, ...evaluation.trace.findings]
    if (change.tasks && change.tasks.counts.total > 0) {
      const plan = planWaves(change.tasks, { maxParallel: config.waves.max_parallel })
      changeDiags.push(...plan.blocks.flatMap((b) => b.diagnostics))
    }
    if (UI_DOMAINS.has(change.meta?.domain ?? '')) {
      const mockups = await checkMockups(root, change.slug, change)
      changeDiags.push(...mockups.findings)
    }
    if (config.packs.length > 0) {
      const resolved = await resolvePacks(workspace.sddDir, config)
      const evaluations = evaluatePacks(resolved.packs, change, config)
      changeDiags.push(...packFindings(evaluations, change))
    }
    diagnostics.push(...changeDiags)
    const entry = count(change.slug, changeDiags)
    changesErrors += entry.errors
    changesWarnings += entry.warnings
  }
  checks.push({ name: 'cambios (lint + trace + waves + mockups)', errors: changesErrors, warnings: changesWarnings })

  const doctor = await runDoctor(root)
  const doctorErrors = doctor.findings.filter((d) => d.severity === 'error')
  diagnostics.push(...doctorErrors)
  checks.push({ name: 'doctor', errors: doctorErrors.length, warnings: 0 })

  const workflowDir = await resolveWorkflowDir()
  if (workflowDir) {
    const health = await checkAdapters({ root, workflowDir, targets: config.adapters.targets, language: config.project.language })
    if (health.manifest && !health.ok) {
      const finding: Diagnostic = {
        code: 'ATLAS-ADAPTERS-001',
        severity: 'warning',
        message: 'Los adaptadores de agente están desactualizados respecto a workflow/',
        suggestion: 'Ejecuta `satlas adapters` y commitea el resultado',
      }
      diagnostics.push(finding)
      checks.push({ name: 'adaptadores', errors: 0, warnings: 1 })
    } else {
      checks.push({ name: 'adaptadores', errors: 0, warnings: 0 })
    }
  }

  const errors = diagnostics.filter((d) => d.severity === 'error').length
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length
  const failed = errors > 0 || (strict && warnings > 0)

  const lines = ['CI de SpecAtlas', '']
  for (const check of checks) lines.push(`  ${check.errors === 0 && check.warnings === 0 ? 'OK  ' : 'FALLA'} ${check.name}: ${check.errors} errores, ${check.warnings} avisos`)
  lines.push('')
  lines.push(failed ? 'Resultado: BLOQUEADO' : 'Resultado: OK')
  if (strict) lines.push('(modo estricto: los avisos también bloquean)')

  return { exitCode: failed ? 1 : 0, diagnostics, data: { checks, errors, warnings, strict, failed }, text: lines }
}

function count(name: string, diags: Diagnostic[]): { name: string; errors: number; warnings: number } {
  return {
    name,
    errors: diags.filter((d) => d.severity === 'error').length,
    warnings: diags.filter((d) => d.severity === 'warning').length,
  }
}
