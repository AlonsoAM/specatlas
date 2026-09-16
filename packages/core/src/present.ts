import path from 'node:path'
import { localIso } from './time.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { copyFile, ensureDir, exists, readTextIfExists, writeText } from './fsx.js'
import { parseFrontmatter } from './frontmatter.js'
import { artifactHash, shortHash } from './hash.js'
import { escapeHtml, inlineMarkdown, renderMarkdown as renderRich } from '@specatlas/render'

export { defaultTokens, renderDocument, renderStyles } from '@specatlas/render'
import { loadApprovals, loadWorkspace } from './workspace.js'
import { verifyApproval } from './lifecycle.js'
import { readMockupManifest, mockupsDir } from './mockups.js'
import type { Change, Language, Requirement } from './model.js'

export interface PresentOptions {
  root: string
  slug: string
  now?: Date
}

export interface PresentResult {
  slug: string
  path?: string
  hash?: string
  diagnostics: Diagnostic[]
}

export async function generatePresentation(opts: PresentOptions): Promise<PresentResult> {
  const root = path.resolve(opts.root)
  const { workspace, config } = await loadWorkspace(root)
  const language = config.project.language
  const change = workspace.changes.find((c) => c.slug === opts.slug)
  if (!change) {
    return { slug: opts.slug, diagnostics: [diag('ATLAS-PRESENT-000', 'error', `No existe el cambio "${opts.slug}"`)] }
  }
  if (!change.delta) {
    return { slug: opts.slug, diagnostics: [diag('ATLAS-PRESENT-001', 'error', `El cambio "${opts.slug}" no tiene spec.md (delta)`) ] }
  }

  const deltaPath = path.join(change.dir, 'spec.md')
  const deltaContent = (await readTextIfExists(deltaPath)) ?? ''
  const hash = artifactHash(deltaContent)
  const now = opts.now ?? new Date()

  const presentationDir = path.join(change.dir, 'presentation')
  const mockupsCopyDir = path.join(presentationDir, 'mockups')
  await ensureDir(presentationDir)

  const mockupInfo = await copyMockups(root, change, mockupsCopyDir)
  const proposalRaw = await readTextIfExists(path.join(change.dir, 'proposal.md'))
  const proposalBody = proposalRaw ? parseFrontmatter(proposalRaw).body : ''

  const approvals = await loadApprovals(path.join(root, '.sdd'))
  const approval = verifyApproval(change, approvals.byArtifact, config, deltaContent)

  const labels = labelsFor(language)
  const html = page({
    language,
    labels,
    title: change.meta?.title ?? change.slug,
    domain: change.meta?.domain ?? '—',
    lane: change.meta?.lane ?? config.lanes.default,
    project: config.project.name,
    version: change.delta.sectionsFound.length,
    hash,
    generatedAt: localIso(now),
    proposalHtml: proposalBody ? renderMarkdown(proposalBody) : `<p><em>${labels.noProposal}</em></p>`,
    requirements: change.delta ? [...change.delta.added.map((r) => ({ req: r, kind: 'added' as const })), ...change.delta.modified.map((r) => ({ req: r, kind: 'modified' as const }))] : [],
    evidence: new Map((change.verify?.evidence ?? []).map((e) => [e.scenario, e.result])),
    mockups: mockupInfo.screens,
    screenshots: mockupInfo.screenshots,
    approveHint: `satlas approve ${change.slug} --by "<nombre>" --channel presentation`,
    ...(approval.status === 'valid' && approval.approvedBy
      ? { approval: { by: approval.approvedBy, at: approval.approvedAt ?? '' } }
      : {}),
  })

  const outFile = path.join(presentationDir, 'index.html')
  await writeText(outFile, html)
  return { slug: change.slug, path: outFile, hash, diagnostics: mockupInfo.diagnostics }
}

interface MockupCopy {
  screens: Array<{ id: string; title: string; file: string; platform: string; illustrates: string[] }>
  screenshots: string[]
  diagnostics: Diagnostic[]
}

async function copyMockups(root: string, change: Change, destDir: string): Promise<MockupCopy> {
  const diagnostics: Diagnostic[] = []
  const dir = mockupsDir(root, change.slug)
  const { manifest } = await readMockupManifest(root, change.slug)
  if (!manifest || !(await exists(dir))) return { screens: [], screenshots: [], diagnostics }

  await ensureDir(destDir)
  const screens: MockupCopy['screens'] = []
  for (const screen of manifest.screens) {
    const src = path.join(dir, screen.file)
    if (!(await exists(src))) {
      diagnostics.push(diag('ATLAS-PRESENT-002', 'warning', `El mockup ${screen.file} no existe y no se incluirá`, { path: src }))
      continue
    }
    await copyFile(src, path.join(destDir, screen.file))
    screens.push({
      id: screen.id,
      title: screen.title ?? screen.id,
      file: `mockups/${screen.file}`,
      platform: manifest.platform,
      illustrates: screen.illustrates ?? [],
    })
  }
  const screenshots: string[] = []
  const shotsDir = path.join(dir, 'screens')
  if (await exists(shotsDir)) {
    await ensureDir(path.join(destDir, 'screens'))
    const { listDir } = await import('./fsx.js')
    for (const file of await listDir(shotsDir)) {
      if (!/\.(png|jpe?g|webp)$/i.test(file)) continue
      await copyFile(path.join(shotsDir, file), path.join(destDir, 'screens', file))
      screenshots.push(`mockups/screens/${file}`)
    }
  }
  return { screens, screenshots, diagnostics }
}

interface Labels {
  kicker: string
  summary: string
  criteria: string
  requirements: string
  mockups: string
  approve: string
  approveText: string
  approveDone: string
  command: string
  hash: string
  generated: string
  noProposal: string
  added: string
  modified: string
  scenario: string
  evidence: string
  pending: string
  noMockups: string
  screenshots: string
}

function labelsFor(language: Language): Labels {
  if (language === 'en') {
    return {
      kicker: 'Proposal',
      summary: 'Business summary',
      criteria: 'Acceptance criteria',
      requirements: 'Requirements and scenarios',
      mockups: 'Mockups',
      approve: 'Approval',
      approveText: 'This proposal is approved by signing the spec (hash + author). Any later change invalidates the signature.',
      approveDone: 'Approved by {by} on {at}. Any later change invalidates the signature.',
      command: 'Command',
      hash: 'Hash',
      generated: 'Generated',
      noProposal: 'The proposal is empty.',
      added: 'added',
      modified: 'modified',
      scenario: 'Scenario',
      evidence: 'Evidence',
      pending: 'pending',
      noMockups: 'No mockups declared for this change.',
      screenshots: 'Screenshots',
    }
  }
  return {
    kicker: 'Propuesta',
    summary: 'Resumen de negocio',
    criteria: 'Criterios de aceptación',
    requirements: 'Requisitos y escenarios',
    mockups: 'Mockups',
    approve: 'Aprobación',
    approveText: 'Esta propuesta se aprueba firmando la spec (hash + autor). Cualquier cambio posterior invalida la firma.',
    approveDone: 'Aprobada por {by} el {at}. Cualquier cambio posterior invalida la firma.',
    command: 'Comando',
    hash: 'Hash',
    generated: 'Generado',
    noProposal: 'La propuesta está vacía.',
    added: 'agregado',
    modified: 'modificado',
    scenario: 'Escenario',
    evidence: 'Evidencia',
    pending: 'pendiente',
    noMockups: 'Este cambio no declara mockups.',
    screenshots: 'Capturas',
  }
}

const CSS = `
:root { --bg:#f8fafc; --card:#ffffff; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --accent:#0f766e; --accent-soft:#ccfbf1; --warn:#b45309; --ok:#15803d; }
@media (prefers-color-scheme: dark) { :root { --bg:#0b1220; --card:#111a2c; --ink:#e2e8f0; --muted:#94a3b8; --line:#1e293b; --accent:#2dd4bf; --accent-soft:#134e4a; --warn:#f59e0b; --ok:#4ade80; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.wrap { max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; }
.hero { background: linear-gradient(135deg, var(--accent), #0ea5e9); color: white; border-radius: 18px; padding: 28px; margin-bottom: 28px; }
.hero h1 { margin: 6px 0 10px; font-size: 30px; line-height: 1.2; }
.kicker { text-transform: uppercase; letter-spacing: .12em; font-size: 12px; opacity: .9; margin: 0; }
.meta { margin: 0; font-size: 13px; opacity: .95; }
section { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 22px; margin-bottom: 22px; }
section h2 { margin-top: 0; font-size: 20px; }
h3 { margin-bottom: 4px; }
h4 { margin: 14px 0 6px; color: var(--muted); font-weight: 600; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
th { background: color-mix(in srgb, var(--accent-soft) 50%, transparent); }
code { background: color-mix(in srgb, var(--line) 60%, transparent); padding: 1px 5px; border-radius: 6px; font-size: 13px; }
pre { background: #0b1220; color: #e2e8f0; padding: 14px; border-radius: 10px; overflow:auto; font-size: 13px; }
pre code { background: transparent; color: inherit; }
.badge { display:inline-block; font-size: 11px; text-transform: uppercase; letter-spacing:.08em; background: var(--accent-soft); color: var(--accent); border-radius: 999px; padding: 2px 10px; margin-left: 8px; }
.req { border-top: 1px solid var(--line); padding-top: 16px; margin-top: 16px; }
.req:first-of-type { border-top: 0; margin-top: 0; padding-top: 0; }
.rules { color: var(--muted); font-size: 14px; }
.scenario { margin: 8px 0 8px 0; }
.when { color: var(--muted); }
.then { font-weight: 600; }
.pill { font-size: 12px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line); }
.pill.pass { color: var(--ok); border-color: var(--ok); }
.pill.fail { color: #dc2626; border-color: #dc2626; }
.pill.skipped, .pill.pending { color: var(--warn); border-color: var(--warn); }
.mockups { display:grid; gap: 18px; }
.mockup { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.mockup header { padding: 10px 14px; border-bottom: 1px solid var(--line); font-weight: 600; font-size: 14px; }
.mockup iframe { width: 100%; height: 560px; border: 0; background: white; }
.mockup.phone iframe { max-width: 420px; margin: 0 auto; display:block; }
.grid-shots { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.grid-shots img { width: 100%; border: 1px solid var(--line); border-radius: 10px; }
footer { color: var(--muted); font-size: 13px; text-align:center; }
.callout { border-left: 4px solid var(--accent); background: color-mix(in srgb, var(--accent-soft) 35%, transparent); padding: 12px 14px; border-radius: 8px; }
@media print { body { background: white; } section { break-inside: avoid; } .hero { background: #0f766e; } }
`.trim()

function page(input: {
  language: Language
  labels: Labels
  title: string
  domain: string
  lane: string
  project: string
  version: number
  hash: string
  generatedAt: string
  proposalHtml: string
  requirements: Array<{ req: Requirement; kind: 'added' | 'modified' }>
  evidence: Map<string, string>
  mockups: MockupCopy['screens']
  screenshots: string[]
  approveHint: string
  approval?: { by: string; at: string }
}): string {
  const l = input.labels
  const reqHtml = input.requirements
    .map(({ req, kind }) => {
      const rules = req.rules.map((r) => `<li><code>${esc(r.id)}</code> — ${inline(r.text)}</li>`).join('')
      const scenarios = req.scenarios
        .map((s) => {
          const when = s.when.map((w) => `<div class="when">CUANDO ${inline(w)}</div>`).join('')
          const then = s.then.map((t) => `<div class="then">ENTONCES ${inline(t)}</div>`).join('')
          return `<div class="scenario"><h4>${esc(s.id)} — ${esc(s.title)}</h4>${when}${then}</div>`
        })
        .join('')
      return `<div class="req"><h3>${esc(req.id)} — ${esc(req.title)}<span class="badge">${kind === 'added' ? l.added : l.modified}</span></h3><p>${inline(req.prose)}</p>${rules ? `<ul class="rules">${rules}</ul>` : ''}${scenarios}</div>`
    })
    .join('')

  const criteriaRows = input.requirements
    .flatMap(({ req }) => req.scenarios)
    .map((s) => {
      const status = input.evidence.get(s.id)
      const cls = status ?? 'pending'
      const label = status ?? l.pending
      return `<tr><td><code>${esc(s.id)}</code></td><td>${esc(s.title)}</td><td><span class="pill ${cls}">${esc(label)}</span></td></tr>`
    })
    .join('')

  const mockupHtml =
    input.mockups.length === 0
      ? `<p><em>${l.noMockups}</em></p>`
      : `<div class="mockups">${input.mockups
          .map(
            (m) =>
              `<div class="mockup ${m.platform === 'mobile' ? 'phone' : ''}"><header>${esc(m.title)} — ${esc(m.file)}</header><iframe src="${esc(m.file)}" loading="lazy" title="${esc(m.title)}"></iframe></div>`,
          )
          .join('')}</div>`

  const shotsHtml =
    input.screenshots.length === 0
      ? ''
      : `<h3>${l.screenshots}</h3><div class="grid-shots">${input.screenshots.map((s) => `<img src="${esc(s)}" alt="${esc(s)}" loading="lazy">`).join('')}</div>`

  return `<!doctype html>
<html lang="${input.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(l.kicker)} — ${esc(input.title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <p class="kicker">${esc(l.kicker)} · ${esc(input.domain)} · ${esc(input.lane)}</p>
    <h1>${esc(input.title)}</h1>
    <p class="meta">${esc(input.project)} · ${esc(l.hash)} ${esc(shortHash(input.hash))} · ${esc(l.generated)} ${esc(input.generatedAt)}</p>
  </header>

  <section>
    <h2>${esc(l.summary)}</h2>
    ${input.proposalHtml}
  </section>

  <section>
    <h2>${esc(l.criteria)}</h2>
    <table><thead><tr><th>ID</th><th>${esc(l.scenario)}</th><th>${esc(l.evidence)}</th></tr></thead><tbody>${criteriaRows}</tbody></table>
  </section>

  <section>
    <h2>${esc(l.requirements)}</h2>
    ${reqHtml}
  </section>

  <section>
    <h2>${esc(l.mockups)}</h2>
    ${mockupHtml}
    ${shotsHtml}
  </section>

  <section>
    <h2>${esc(l.approve)}</h2>
    ${input.approval
      ? `<div class="callout" style="border-left-color:#15803d;background:rgba(21,128,61,.12)">✔ ${esc(l.approveDone.replace('{by}', input.approval.by).replace('{at}', input.approval.at))}</div>`
      : `<div class="callout">${esc(l.approveText)}</div>
    <p>${esc(l.command)}: <code>${esc(input.approveHint)}</code></p>`}
  </section>

  <footer>SpecAtlas · ${esc(input.project)} · ${esc(input.generatedAt)}</footer>
</div>
</body>
</html>
`
}


export function esc(text: string): string {
  return escapeHtml(text)
}

export function inline(text: string): string {
  return inlineMarkdown(text)
}

export function renderMarkdown(markdown: string): string {
  return renderRich(markdown, { highlight: true })
}
