import path from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { z } from 'zod'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, listDir, readText, readTextIfExists, writeText } from './fsx.js'
import { artifactHash } from './hash.js'
import type { Change, MockupManifest } from './model.js'
import { SCENARIO_ID_RE } from './model.js'

export const mockupManifestSchema = z.object({
  schema_version: z.number().int().positive().default(1),
  version: z.number().int().positive().default(1),
  level: z.enum(['sketch', 'hifi']).default('hifi'),
  platform: z.enum(['web', 'mobile', 'desktop']).default('web'),
  inputs_hash: z.string().optional(),
  generated_at: z.string().optional(),
  tokens: z.string().optional(),
  screens: z
    .array(
      z.object({
        id: z.string(),
        file: z.string(),
        title: z.string().optional(),
        illustrates: z.array(z.string()).default([]),
        states: z.array(z.string()).default([]),
        breakpoints: z.array(z.number()).default([]),
        themes: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  screenshots: z.array(z.string()).default([]),
})

export interface MockupPlanScreen {
  id: string
  title: string
  file: string
  illustrates: string[]
  states: string[]
  breakpoints: number[]
}

export interface MockupPlan {
  platform: 'web' | 'mobile' | 'desktop'
  screens: MockupPlanScreen[]
}

export interface MockupCheckResult {
  findings: Diagnostic[]
  stale: boolean
  manifest?: MockupManifest
  manifestPath?: string
}

const TOKEN_CANDIDATES = ['design/tokens.json', 'DESIGN.md', 'design/DESIGN.md', '.sdd/design/tokens.json']

export function mockupsDir(root: string, slug: string): string {
  return path.join(path.resolve(root), '.sdd', 'changes', slug, 'mockups')
}

export async function tokensFile(root: string): Promise<string | undefined> {
  for (const candidate of TOKEN_CANDIDATES) {
    const abs = path.join(root, candidate)
    if (await exists(abs)) return candidate
  }
  return undefined
}

export async function computeInputsHash(root: string, change: Change): Promise<string> {
  const deltaPath = path.join(change.dir, 'spec.md')
  const delta = (await readTextIfExists(deltaPath)) ?? ''
  const tokens = await tokensFile(root)
  const tokensContent = tokens ? ((await readTextIfExists(path.join(root, tokens))) ?? '') : ''
  return artifactHash(`${delta}\n---tokens---\n${tokensContent}`)
}

export function planMockups(change: Change, platform: 'web' | 'mobile' | 'desktop' = 'web'): MockupPlan {
  const screens: MockupPlanScreen[] = []
  const seen = new Set<string>()
  for (const requirement of [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])]) {
    if (seen.has(requirement.id)) continue
    seen.add(requirement.id)
    const id = requirement.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const states = platform === 'mobile' ? ['default', 'loading', 'empty', 'error', 'offline'] : ['default', 'loading', 'empty', 'error']
    screens.push({
      id,
      title: requirement.title,
      file: `${id}.html`,
      illustrates: requirement.scenarios.map((s) => s.id),
      states,
      breakpoints: platform === 'mobile' ? [390, 768] : [390, 768, 1440],
    })
  }
  return { platform, screens }
}

export async function readMockupManifest(root: string, slug: string): Promise<{ manifest?: MockupManifest; path?: string; diagnostics: Diagnostic[] }> {
  const file = path.join(mockupsDir(root, slug), 'manifest.yaml')
  const raw = await readTextIfExists(file)
  if (raw === undefined) return { diagnostics: [] }
  let data: unknown
  try {
    data = parseYaml(raw)
  } catch (err) {
    return { path: file, diagnostics: [diag('ATLAS-MKP-002', 'error', `manifest.yaml inválido: ${(err as Error).message}`, { path: file })] }
  }
  const parsed = mockupManifestSchema.safeParse(data)
  if (!parsed.success) {
    return {
      path: file,
      diagnostics: parsed.error.issues.map((issue) => diag('ATLAS-MKP-003', 'error', `manifest.yaml (${issue.path.join('.') || 'raíz'}): ${issue.message}`, { path: file })),
    }
  }
  const v = parsed.data
  const manifest: MockupManifest = {
    schemaVersion: v.schema_version,
    version: v.version,
    level: v.level,
    platform: v.platform,
    screens: v.screens.map((s) => {
      const screen: MockupManifest['screens'][number] = { id: s.id, file: s.file }
      if (s.title !== undefined) screen.title = s.title
      if (s.illustrates.length > 0) screen.illustrates = s.illustrates
      if (s.states.length > 0) screen.states = s.states
      if (s.breakpoints.length > 0) screen.breakpoints = s.breakpoints
      if (s.themes.length > 0) screen.themes = s.themes
      return screen
    }),
  }
  if (v.inputs_hash !== undefined) manifest.inputsHash = v.inputs_hash
  if (v.generated_at !== undefined) manifest.generatedAt = v.generated_at
  if (v.tokens !== undefined) manifest.tokens = v.tokens
  return { manifest, path: file, diagnostics: [] }
}

export function lintMockupHtml(html: string, file: string): Diagnostic[] {
  const findings: Diagnostic[] = []
  if (!/mockup/i.test(html)) {
    findings.push(diag('LINT-MKP-008', 'error', 'El mockup no muestra el banner "MOCKUP · NO FUNCIONAL"', { path: file, suggestion: 'Añade el banner visible con versión y fecha' }))
  }
  if (/lorem ipsum/i.test(html)) {
    findings.push(diag('LINT-MKP-003', 'error', 'El mockup usa Lorem ipsum', { path: file, suggestion: 'Usa datos reales del glosario y del dominio' }))
  }
  if (/\bitem\s*\d+\b/i.test(html)) {
    findings.push(diag('LINT-MKP-003', 'warning', 'El mockup usa textos genéricos ("Item 1")', { path: file, suggestion: 'Usa datos realistas del dominio' }))
  }
  const external = /(src|href)\s*=\s*["']https?:/i.test(html) || /<script[^>]+src=/i.test(html) || /@import\s+url\(/i.test(html)
  if (external) {
    findings.push(diag('LINT-MKP-009', 'error', 'El mockup referencia recursos externos (red)', { path: file, suggestion: 'Embebe fuentes, imágenes y estilos en el propio HTML' }))
  }
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    findings.push(diag('LINT-MKP-010', 'warning', 'Falta la meta viewport', { path: file, suggestion: 'Añade <meta name="viewport" content="width=device-width, initial-scale=1">' }))
  }
  const states = new Set([...html.matchAll(/data-state=["']([^"']+)["']/gi)].map((m) => (m[1] ?? '').toLowerCase()))
  if (states.size > 0 && states.size < 3) {
    findings.push(diag('LINT-MKP-001', 'warning', `El mockup solo declara ${states.size} estado(s)`, { path: file, suggestion: 'Incluye default, loading, vacío y error' }))
  }
  return findings
}

export function lintMockupManifest(manifest: MockupManifest, knownScenarios: Set<string>, file: string): Diagnostic[] {
  const findings: Diagnostic[] = []
  if (manifest.screens.length === 0) {
    findings.push(diag('LINT-MKP-004', 'error', 'El manifiesto de mockups no declara pantallas', { path: file }))
  }
  for (const screen of manifest.screens) {
    if (!screen.illustrates || screen.illustrates.length === 0) {
      findings.push(diag('LINT-MKP-006', 'error', `La pantalla "${screen.id}" no declara qué escenarios ilustra`, { path: file, suggestion: 'Añade illustrates: [REQ-…-S1]' }))
    }
    for (const scenario of screen.illustrates ?? []) {
      if (!SCENARIO_ID_RE.test(scenario) || !knownScenarios.has(scenario)) {
        findings.push(diag('TRACE-011', 'error', `La pantalla "${screen.id}" ilustra ${scenario}, que no existe en el cambio`, { path: file }))
      }
    }
    if (!screen.states || screen.states.length === 0) {
      findings.push(diag('LINT-MKP-001', 'warning', `La pantalla "${screen.id}" no declara estados`, { path: file }))
    }
    if (!screen.breakpoints || screen.breakpoints.length === 0) {
      findings.push(diag('LINT-MKP-002', 'warning', `La pantalla "${screen.id}" no declara breakpoints`, { path: file }))
    }
  }
  return findings
}

export async function checkMockups(root: string, slug: string, change: Change): Promise<MockupCheckResult> {
  const dir = mockupsDir(root, slug)
  if (!(await exists(dir))) {
    return { findings: [diag('LINT-MKP-004', 'warning', 'El cambio no tiene carpeta de mockups', { path: dir, suggestion: 'Genera los mockups con la fase /satlas-mockup' })], stale: false }
  }
  const { manifest, path: manifestPath, diagnostics } = await readMockupManifest(root, slug)
  const findings = [...diagnostics]
  if (!manifest || !manifestPath) {
    return { findings: [...findings, diag('LINT-MKP-004', 'error', 'No existe mockups/manifest.yaml', { path: path.join(dir, 'manifest.yaml') })], stale: false }
  }
  const known = new Set<string>()
  for (const req of [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])]) {
    for (const scenario of req.scenarios) known.add(scenario.id)
  }
  findings.push(...lintMockupManifest(manifest, known, manifestPath))
  for (const screen of manifest.screens) {
    const html = await readTextIfExists(path.join(dir, screen.file))
    if (html === undefined) {
      findings.push(diag('ATLAS-MKP-004', 'error', `Falta el archivo del mockup: ${screen.file}`, { path: path.join(dir, screen.file) }))
      continue
    }
    findings.push(...lintMockupHtml(html, path.join(dir, screen.file)))
  }
  const inputsHash = await computeInputsHash(root, change)
  const stale = manifest.inputsHash !== undefined && manifest.inputsHash !== inputsHash
  if (stale) {
    findings.push(
      diag('MKP-STALE', 'warning', 'Los mockups están desactualizados respecto a la spec (inputs_hash cambió)', {
        path: manifestPath,
        suggestion: 'Regenera los mockups y vuelve a aprobarlos',
      }),
    )
  }
  return { findings, stale, manifest, manifestPath }
}

export async function writeMockupPlan(root: string, slug: string, plan: MockupPlan, now: Date = new Date()): Promise<string> {
  const file = path.join(mockupsDir(root, slug), 'plan.yaml')
  if (await exists(file)) return file
  const doc = {
    schema_version: 1,
    generated_at: now.toISOString(),
    platform: plan.platform,
    screens: plan.screens.map((s) => ({ id: s.id, title: s.title, file: s.file, illustrates: s.illustrates, states: s.states, breakpoints: s.breakpoints })),
  }
  await writeText(file, stringifyYaml(doc, { lineWidth: 120 }))
  return file
}

export async function writeMockupManifest(root: string, slug: string, plan: MockupPlan, inputsHash: string, now: Date = new Date()): Promise<string> {
  const file = path.join(mockupsDir(root, slug), 'manifest.yaml')
  if (await exists(file)) return file
  const doc = {
    schema_version: 1,
    version: 1,
    level: 'hifi',
    platform: plan.platform,
    inputs_hash: inputsHash,
    generated_at: now.toISOString(),
    screens: plan.screens.map((s) => ({ id: s.id, title: s.title, file: s.file, illustrates: s.illustrates, states: s.states, breakpoints: s.breakpoints })),
    screenshots: [],
  }
  await writeText(file, stringifyYaml(doc, { lineWidth: 120 }))
  return file
}

export async function updateMockupScreenshots(root: string, slug: string, screenshots: string[]): Promise<string | undefined> {
  const file = path.join(mockupsDir(root, slug), 'manifest.yaml')
  const raw = await readTextIfExists(file)
  if (raw === undefined) return undefined
  const data = (parseYaml(raw) ?? {}) as Record<string, unknown>
  data['screenshots'] = screenshots
  await writeText(file, stringifyYaml(data, { lineWidth: 120 }))
  return file
}

export interface CaptureResult {
  screenshots: string[]
  diagnostics: Diagnostic[]
}

interface PlaywrightPage {
  setViewportSize(size: { width: number; height: number }): Promise<void>
  goto(url: string): Promise<void>
  screenshot(opts: { path: string }): Promise<unknown>
  close(): Promise<void>
}
interface PlaywrightBrowser {
  newPage(): Promise<PlaywrightPage>
  close(): Promise<void>
}
interface PlaywrightModule {
  chromium: { launch(opts?: { channel?: string }): Promise<PlaywrightBrowser> }
}

export async function captureMockups(root: string, slug: string, manifest: MockupManifest, now: Date = new Date()): Promise<CaptureResult> {
  const diagnostics: Diagnostic[] = []
  const dir = mockupsDir(root, slug)
  let playwright: PlaywrightModule | undefined
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<unknown>
    playwright = (await dynamicImport('playwright')) as PlaywrightModule
  } catch {
    diagnostics.push(
      diag('ATLAS-MKP-001', 'warning', 'Playwright no está instalado: captura omitida', {
        suggestion: 'Instala playwright (npm i -D playwright) y reintenta, o valida los mockups manualmente',
      }),
    )
    return { screenshots: [], diagnostics }
  }

  const browser = await playwright.chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined })
  const screenshots: string[] = []
  try {
    for (const screen of manifest.screens) {
      const page = await browser.newPage()
      for (const bp of screen.breakpoints && screen.breakpoints.length > 0 ? screen.breakpoints : [1440]) {
        await page.setViewportSize({ width: bp, height: 900 })
        await page.goto(`file://${path.join(dir, screen.file).split(path.sep).join('/')}`)
        const rel = path.posix.join('screens', `${screen.id}-${bp}.png`)
        await page.screenshot({ path: path.join(dir, rel) })
        screenshots.push(rel)
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
  void now
  return { screenshots, diagnostics }
}
