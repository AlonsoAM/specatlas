import path from 'node:path'
import {
  captureMockups,
  checkMockups,
  computeInputsHash,
  planMockups,
  readMockupManifest,
  setMockupRequirement,
  updateMockupScreenshots,
  writeMockupManifest,
  writeMockupPlan,
} from '@specatlas/core'
import { flagBool } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'

export async function runMockup(ctx: CliContext): Promise<CommandResult> {
  const { root, workspace, config } = await requireWorkspace(ctx)
  const slug = ctx.positionals[0]
  if (!slug) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-MKP-000', severity: 'error', message: 'Falta el slug: satlas mockup <slug> [--plan|--check|--capture|--require]' }] }
  }
  const change = workspace.changes.find((c) => c.slug === slug)
  if (!change) {
    return { exitCode: 2, diagnostics: [{ code: 'ATLAS-MKP-000', severity: 'error', message: `No existe el cambio "${slug}"` }] }
  }

  if (flagBool(ctx.flags, 'require')) {
    await setMockupRequirement(root, slug, 'required')
  }

  if (flagBool(ctx.flags, 'check')) {
    const result = await checkMockups(root, slug, change)
    const errors = result.findings.filter((d) => d.severity === 'error').length
    const warnings = result.findings.filter((d) => d.severity === 'warning').length
    const lines = [`Mockups — ${slug}`, '', `  pantallas: ${result.manifest?.screens.length ?? 0}`, `  desactualizados: ${result.stale ? 'sí' : 'no'}`, `  hallazgos: ${errors} errores, ${warnings} avisos`]
    for (const finding of result.findings) lines.push(`  ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}`)
    return { exitCode: errors > 0 ? 1 : 0, diagnostics: result.findings, data: { screens: result.manifest?.screens.length ?? 0, stale: result.stale, findings: result.findings }, text: lines }
  }

  if (flagBool(ctx.flags, 'capture')) {
    const { manifest, diagnostics } = await readMockupManifest(root, slug)
    if (!manifest) {
      return { exitCode: 1, diagnostics, text: ['No existe mockups/manifest.yaml: genera el plan primero (satlas mockup <slug>).'] }
    }
    const capture = await captureMockups(root, slug, manifest)
    if (capture.screenshots.length > 0) await updateMockupScreenshots(root, slug, capture.screenshots)
    const lines = [`Captura — ${slug}`, '', `  capturas: ${capture.screenshots.length}`]
    for (const shot of capture.screenshots) lines.push(`  + mockups/${shot}`)
    for (const finding of capture.diagnostics) lines.push(`  ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}`)
    return { exitCode: capture.diagnostics.some((d) => d.severity === 'error') ? 1 : 0, diagnostics: capture.diagnostics, data: { screenshots: capture.screenshots }, text: lines }
  }

  // plan (por defecto)
  const platform = config.mockups.platform === 'auto' ? (change.meta?.domain === 'mobile' ? 'mobile' : 'web') : config.mockups.platform
  const plan = planMockups(change, platform)
  if (plan.screens.length === 0) {
    return { exitCode: 0, diagnostics: [], data: plan, text: ['El delta no declara requisitos: nada que planificar todavía.'] }
  }
  const planFile = await writeMockupPlan(root, slug, plan)
  const inputsHash = await computeInputsHash(root, change)
  const manifestFile = await writeMockupManifest(root, slug, plan, inputsHash)
  const lines = [
    `Plan de mockups — ${slug}`,
    '',
    `  plataforma: ${plan.platform}`,
    `  pantallas: ${plan.screens.length}`,
    ...plan.screens.map((s) => `    - ${s.id}: ${s.title} (${s.illustrates.length} escenario(s))`),
    '',
    `  plan: ${path.relative(ctx.cwd, planFile)}`,
    `  manifiesto: ${path.relative(ctx.cwd, manifestFile)}`,
    '',
    'Siguiente: genera el HTML de cada pantalla (fase /satlas-mockup) y valida con `satlas mockup ' + slug + ' --check`.',
  ]
  return { exitCode: 0, diagnostics: [], data: { plan, planFile: path.relative(ctx.cwd, planFile), manifestFile: path.relative(ctx.cwd, manifestFile) }, text: lines }
}
