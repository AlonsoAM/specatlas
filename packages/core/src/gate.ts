import path from 'node:path'
import type { Diagnostic } from './diagnostics.js'
import { lintDelta, lintPlan, lintSpec } from './lint.js'
import { checkMockups } from './mockups.js'
import { evaluatePacks, packFindings, resolvePacks } from './packs.js'
import { checkTrace } from './trace.js'
import { linkedTraceInput } from './links.js'
import { planWaves } from './waves.js'
import { runDoctor } from './doctor.js'
import { loadWorkspace } from './workspace.js'
import { readTextIfExists } from './fsx.js'
import type { Requirement } from './model.js'

const UI_DOMAINS = new Set(['frontend', 'mobile', 'fullstack'])

export interface CiCheck {
  name: string
  errors: number
  warnings: number
}

export interface CiExtraCheck {
  name: string
  diagnostics: Diagnostic[]
}

export interface CiResult {
  checks: CiCheck[]
  diagnostics: Diagnostic[]
  errors: number
  warnings: number
  failed: boolean
}

export interface CiOptions {
  root: string
  strict?: boolean
  extra?: CiExtraCheck[]
}

function count(name: string, diagnostics: Diagnostic[]): CiCheck {
  return {
    name,
    errors: diagnostics.filter((d) => d.severity === 'error').length,
    warnings: diagnostics.filter((d) => d.severity === 'warning').length,
  }
}

export function livingRequirementsMap(specs: Array<{ spec: { requirements: Requirement[] } }>): Map<string, Requirement> {
  const map = new Map<string, Requirement>()
  for (const spec of specs) {
    for (const requirement of spec.spec.requirements) map.set(requirement.id, requirement)
  }
  return map
}

export async function runCiGate(opts: CiOptions): Promise<CiResult> {
  const root = path.resolve(opts.root)
  const { workspace, config } = await loadWorkspace(root)
  const diagnostics: Diagnostic[] = []
  const checks: CiCheck[] = []

  const specFindings = workspace.specs.flatMap((spec) => lintSpec(spec.spec, { language: config.spec.language, businessOnly: config.spec.business_only }))
  diagnostics.push(...specFindings)
  checks.push(count('specs vivas', specFindings))

  const living = livingRequirementsMap(workspace.specs)
  let changesErrors = 0
  let changesWarnings = 0
  for (const change of workspace.changes) {
    const lintFindings = change.delta ? lintDelta(change.delta, living, path.join(change.dir, 'spec.md'), { language: config.spec.language }) : []
    const trace = checkTrace({
      specs: workspace.specs,
      change,
      requireEvidence: config.gates.verify.mode !== 'off' && config.gates.verify.require_evidence,
      linked: linkedTraceInput(workspace),
    })
    const changeDiags: Diagnostic[] = [...lintFindings, ...trace.findings]
    if (change.planPath) {
      const planText = (await readTextIfExists(change.planPath)) ?? ''
      changeDiags.push(...lintPlan(planText, change.planPath))
    }
    if (change.tasks && change.tasks.counts.total > 0) {
      const plan = planWaves(change.tasks, { maxParallel: config.waves.max_parallel })
      changeDiags.push(...plan.blocks.flatMap((block) => block.diagnostics))
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

  for (const extra of opts.extra ?? []) {
    diagnostics.push(...extra.diagnostics)
    checks.push(count(extra.name, extra.diagnostics))
  }

  const errors = diagnostics.filter((d) => d.severity === 'error').length
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length
  const failed = errors > 0 || ((opts.strict ?? false) && warnings > 0)
  return { checks, diagnostics, errors, warnings, failed }
}
