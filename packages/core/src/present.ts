import path from 'node:path'
import { localStamp } from './time.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { copyFile, ensureDir, exists, readTextIfExists, writeText } from './fsx.js'
import { parseFrontmatter } from './frontmatter.js'
import { artifactHash } from './hash.js'
import { escapeHtml, inlineMarkdown, renderMarkdown as renderRich } from '@specatlas/render'

export { defaultTokens, renderDocument, renderStyles } from '@specatlas/render'
import { loadApprovals, loadWorkspace } from './workspace.js'
import { verifyApproval, type ApprovalStatus } from './lifecycle.js'
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
    return { slug: opts.slug, diagnostics: [diag('ATLAS-PRESENT-001', 'error', `El cambio "${opts.slug}" no tiene spec.md (delta)`)] }
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
  const requirements = change.delta ? [...change.delta.added.map((r) => ({ req: r, kind: 'added' as const })), ...change.delta.modified.map((r) => ({ req: r, kind: 'modified' as const }))] : []
  const html = page({
    language,
    labels,
    title: change.meta?.title ?? change.slug,
    slug: change.slug,
    domain: change.meta?.domain ?? '—',
    lane: change.meta?.lane ?? config.lanes.default,
    project: config.project.name,
    version: change.delta.sectionsFound.length,
    hash,
    generatedAt: localStamp(now),
    proposalHtml: proposalBody ? renderMarkdown(proposalBody) : '',
    requirements,
    evidence: new Map((change.verify?.evidence ?? []).map((e) => [e.scenario, e.result])),
    mockups: mockupInfo.screens,
    missingMockups: mockupInfo.missing,
    screenshots: mockupInfo.screenshots,
    approveHint: `satlas approve ${change.slug} --by "<nombre>" --channel presentation`,
    approvalStatus: approval.status,
    ...(approval.approvedBy && (approval.status === 'valid' || approval.status === 'stale')
      ? { approval: { by: approval.approvedBy, at: approval.approvedAt ?? '', stale: approval.status === 'stale' } }
      : {}),
  })

  const outFile = path.join(presentationDir, 'index.html')
  await writeText(outFile, html)
  return { slug: change.slug, path: outFile, hash, diagnostics: mockupInfo.diagnostics }
}

interface MockupCopy {
  screens: Array<{ id: string; title: string; file: string; platform: string; illustrates: string[] }>
  screenshots: string[]
  missing: string[]
  diagnostics: Diagnostic[]
}

async function copyMockups(root: string, change: Change, destDir: string): Promise<MockupCopy> {
  const diagnostics: Diagnostic[] = []
  const dir = mockupsDir(root, change.slug)
  const { manifest } = await readMockupManifest(root, change.slug)
  if (!manifest || !(await exists(dir))) return { screens: [], screenshots: [], missing: [], diagnostics }

  await ensureDir(destDir)
  const screens: MockupCopy['screens'] = []
  const missing: string[] = []
  for (const screen of manifest.screens) {
    const src = path.join(dir, screen.file)
    if (!(await exists(src))) {
      missing.push(screen.file)
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
  return { screens, screenshots, missing, diagnostics }
}

interface Labels {
  kicker: string
  contents: string
  identity: string
  summary: string
  criteria: string
  requirements: string
  mockups: string
  approve: string
  approveText: string
  approveDone: string
  approveStale: string
  approvePending: string
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
  missingMockups: string
  screenshots: string
  print: string
  signatureName: string
  signatureDate: string
  signatureNote: string
  openMockup: string
  mockupHint: string
  illustrates: string
}

function labelsFor(language: Language): Labels {
  if (language === 'en') {
    return {
      kicker: 'Change proposal',
      contents: 'Contents',
      identity: 'Change identity',
      summary: 'Business summary',
      criteria: 'Acceptance criteria',
      requirements: 'Specification',
      mockups: 'Mockups',
      approve: 'Approval',
      approveText: 'This proposal is approved by signing the spec (hash + author). Any later change invalidates the signature.',
      approveDone: 'Approved by {by} on {at}. Any later change invalidates the signature.',
      approveStale: 'The specification changed after being signed: the signature is stale and must be renewed.',
      approvePending: 'Pending approval.',
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
      missingMockups: 'Declared mockups missing',
      screenshots: 'Screenshots',
      print: 'Print / Save as PDF',
      signatureName: 'Approver name',
      signatureDate: 'Signature date',
      signatureNote: 'The signature is recorded with the specification hash and the date.',
      openMockup: 'Open mockup',
      mockupHint: 'Each screen opens full size in its own tab. In a browser they are also previewed inline.',
      illustrates: 'Illustrates',
    }
  }
  return {
    kicker: 'Propuesta de cambio',
    contents: 'Contenido',
    identity: 'Identidad del cambio',
    summary: 'Resumen de negocio',
    criteria: 'Criterios de aceptación',
    requirements: 'Especificación',
    mockups: 'Mockups',
    approve: 'Firma de aprobación',
    approveText: 'Esta propuesta se aprueba firmando la especificación (huella + autor). Cualquier cambio posterior invalida la firma.',
    approveDone: 'Aprobada por {by} el {at}. Cualquier cambio posterior invalida la firma.',
    approveStale: 'La especificación cambió después de firmarse: la firma quedó obsoleta y hay que volver a aprobar.',
    approvePending: 'Pendiente de aprobación.',
    command: 'Comando',
    hash: 'Huella',
    generated: 'Generado',
    noProposal: 'La propuesta está vacía.',
    added: 'agregado',
    modified: 'modificado',
    scenario: 'Escenario',
    evidence: 'Evidencia',
    pending: 'pendiente',
    noMockups: 'Este cambio no declara mockups.',
    missingMockups: 'Mockups declarados que faltan',
    screenshots: 'Capturas',
    print: 'Imprimir / Guardar PDF',
    signatureName: 'Nombre de quien aprueba',
    signatureDate: 'Fecha de la firma',
    signatureNote: 'La firma se registra con la huella de la especificación y la fecha.',
    openMockup: 'Abrir mockup',
    mockupHint: 'Cada pantalla se abre a tamaño completo en su propia pestaña. En un navegador, además, se previsualizan aquí mismo.',
    illustrates: 'Ilustra',
  }
}

const CSS = `
:root { color-scheme: light; --bg:#f4f6fa; --card:#ffffff; --elev:#f7f9fc; --line:#dde3ec; --line-soft:#e8ecf3; --ink:#161c2b; --muted:#5a6577; --faint:#8b94a6; --accent:#2f6fe0; --accent-soft:rgba(47,111,224,.10); --ok:#1e9e4b; --warn:#b57812; --bad:#cf3b45; }
@media (prefers-color-scheme: dark) { :root { color-scheme: dark; --bg:#0d1017; --card:#151a24; --elev:#1b2130; --line:#2a3243; --line-soft:#212938; --ink:#e8ebf1; --muted:#9aa5b5; --faint:#6d7789; --accent:#5b9bff; --accent-soft:rgba(91,155,255,.12); --ok:#46c46a; --warn:#e0a33a; --bad:#f0616a; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
h1,h2,h3,h4,p { margin:0; }
a { color:var(--accent); text-decoration:none; }
a:hover { text-decoration:underline; }
code { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size:.88em; background:var(--elev); border:1px solid var(--line-soft); border-radius:5px; padding:1px 5px; }
.page { max-width:1180px; margin:0 auto; padding:26px 20px 80px; display:grid; grid-template-columns:230px 1fr; gap:26px; }
.toc { position:sticky; top:20px; align-self:start; border:1px solid var(--line); border-radius:12px; background:var(--card); padding:14px; }
.toc h2 { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--faint); margin-bottom:10px; }
.toc ol { margin:0; padding-left:18px; color:var(--muted); font-size:13px; display:flex; flex-direction:column; gap:7px; }
.toc a { color:var(--muted); }
.toc a:hover { color:var(--ink); }
.toc .toc-actions { margin-top:14px; display:flex; flex-direction:column; gap:8px; }
.doc { min-width:0; display:flex; flex-direction:column; gap:22px; }
section.card { border:1px solid var(--line); border-radius:12px; background:var(--card); overflow:hidden; }
.card-head { display:flex; flex-wrap:wrap; gap:10px; align-items:baseline; padding:16px 20px; border-bottom:1px solid var(--line-soft); }
.card-head .num { font-family: ui-monospace, Consolas, monospace; font-size:12px; color:var(--faint); }
.card-head h2 { font-size:19px; letter-spacing:-.01em; }
.card-head .sub { color:var(--faint); font-size:12.5px; margin-left:auto; }
.card-body { padding:18px 20px; }
.cover { padding:26px 24px; }
.cover .brand { display:flex; align-items:center; gap:12px; color:var(--accent); }
.cover .kicker { font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--faint); }
.cover h1 { font-size:30px; line-height:1.15; letter-spacing:-.02em; margin:10px 0 6px; }
.cover .lead { color:var(--muted); max-width:64ch; }
.meta-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
.chip { display:inline-flex; align-items:center; gap:6px; padding:4px 11px; border-radius:999px; border:1px solid var(--line); background:var(--elev); color:var(--muted); font-size:12px; }
.chip b { color:var(--ink); font-weight:600; }
.cover-foot { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:20px; }
.sign-state { border:1px solid var(--warn); background:color-mix(in srgb, var(--warn) 10%, transparent); border-radius:8px; padding:12px 14px; }
.sign-state.ok { border-color:var(--ok); background:color-mix(in srgb, var(--ok) 10%, transparent); }
.sign-state.stale { border-color:var(--bad); background:color-mix(in srgb, var(--bad) 10%, transparent); }
.sign-state .ss-label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
.sign-state b { display:block; font-size:14.5px; margin:3px 0; }
.sign-state p { color:var(--muted); font-size:12.5px; }
.hash-box { border:1px solid var(--line); background:var(--elev); border-radius:8px; padding:12px 14px; }
.hash-box .hb-label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--faint); }
.hash-box code { display:block; border:0; background:transparent; padding:0; margin-top:6px; word-break:break-all; }
.callout { border:1px solid var(--line); border-left:4px solid var(--accent); background:var(--elev); border-radius:8px; padding:12px 14px; color:var(--muted); font-size:13px; }
.callout.warn { border-left-color:var(--warn); background:color-mix(in srgb, var(--warn) 9%, transparent); }
.callout.bad { border-left-color:var(--bad); background:color-mix(in srgb, var(--bad) 9%, transparent); }
.callout.ok { border-left-color:var(--ok); background:color-mix(in srgb, var(--ok) 9%, transparent); }
.req { border-top:1px solid var(--line-soft); padding-top:14px; margin-top:14px; }
.req:first-of-type { border-top:0; margin-top:0; padding-top:0; }
.req h3 { font-size:15px; }
.req .req-id { font-family: ui-monospace, Consolas, monospace; font-size:12.5px; color:var(--accent); }
.req p { color:var(--muted); font-size:13.5px; margin-top:6px; }
.req ul { margin:8px 0 0 18px; padding:0; color:var(--muted); font-size:13.5px; }
.scn { border-left:3px solid var(--accent); background:var(--elev); border-radius:6px; padding:9px 12px; margin-top:10px; }
.scn b { font-size:13px; }
.scn .steps { margin-top:5px; color:var(--muted); font-size:13px; }
.scn .steps span { display:block; }
.scn .steps b { color:var(--ink); }
table { width:100%; border-collapse:collapse; font-size:13px; }
th, td { border:1px solid var(--line-soft); padding:8px 10px; text-align:left; vertical-align:top; }
th { background:var(--elev); font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
.pill { display:inline-block; font-size:11.5px; padding:1px 8px; border-radius:999px; border:1px solid var(--line); color:var(--muted); }
.pill.pass { color:var(--ok); border-color:var(--ok); }
.pill.fail { color:var(--bad); border-color:var(--bad); }
.pill.pending, .pill.skipped { color:var(--warn); border-color:var(--warn); }
.mockups { display:grid; gap:18px; }
.mockup { border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--card); }
.mockup header { padding:10px 14px; border-bottom:1px solid var(--line-soft); font-weight:600; font-size:13.5px; display:flex; align-items:center; gap:12px; justify-content:space-between; }
.mockup header .btn { min-height:28px; padding:0 10px; font-size:12px; }
.mockup-body { padding:12px 14px; display:flex; flex-direction:column; gap:4px; color:var(--muted); font-size:12.5px; }
.mockup-file { font-family: ui-monospace, Consolas, monospace; }
.mockup iframe { width:100%; height:560px; border:0; background:white; display:block; }
.mockup.phone iframe { max-width:420px; margin:0 auto; display:block; }
.grid-shots { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px; margin-top:12px; }
.grid-shots img { width:100%; border:1px solid var(--line); border-radius:10px; }
.signature { display:grid; grid-template-columns:1.2fr .8fr; gap:18px; }
.sign-line { border:1px dashed var(--accent); border-radius:8px; padding:16px; background:var(--accent-soft); }
.sign-line .sl-row { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid var(--line); padding:0 0 6px; margin-bottom:18px; color:var(--muted); font-size:12.5px; }
.sign-line .sl-row:last-child { border-bottom:0; margin-bottom:0; padding-top:14px; }
.sign-help { color:var(--muted); font-size:12.5px; }
.btn { display:inline-flex; align-items:center; gap:7px; min-height:34px; padding:0 14px; border-radius:8px; border:1px solid var(--line); background:var(--elev); color:var(--ink); cursor:pointer; font:inherit; font-size:12.5px; text-decoration:none; }
.btn.primary { background:var(--accent); border-color:transparent; color:#fff; }
.footer { color:var(--faint); font-size:11.5px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:6px; }
@media (max-width: 1000px) { .page { grid-template-columns:1fr; padding:18px 14px 60px; } .toc { position:static; order:-1; } .cover-foot, .signature { grid-template-columns:1fr; } .cover h1 { font-size:24px; } }
@media print {
  @page { size:A4; margin:16mm; }
  :root { --bg:#fff; --card:#fff; --elev:#fafafa; --line:#ccc; --line-soft:#e2e2e2; --ink:#111; --muted:#444; --faint:#666; --accent:#111; --accent-soft:#f3f3f3; }
  body { background:#fff; font-size:12px; }
  .page { display:block; max-width:none; padding:0; }
  .toc, .btn { display:none !important; }
  section.card { break-inside:avoid; border-color:#ccc; }
  .cover { break-after:page; }
  #mockups { break-before:page; }
  #firma { break-before:page; }
  .sign-line { background:#fff; }
}
`.trim()

function page(input: {
  language: Language
  labels: Labels
  title: string
  slug: string
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
  missingMockups: string[]
  screenshots: string[]
  approveHint: string
  approvalStatus: ApprovalStatus['status']
  approval?: { by: string; at: string; stale: boolean }
}): string {
  const l = input.labels
  const scenarios = input.requirements.flatMap(({ req }) => req.scenarios)
  const passed = scenarios.filter((scenario) => input.evidence.get(scenario.id) === 'pass').length

  const reqHtml = input.requirements
    .map(({ req, kind }) => {
      const rules = req.rules.map((r) => `<li><code>${esc(r.id)}</code> — ${inline(r.text)}</li>`).join('')
      const scenarioHtml = req.scenarios
        .map((s) => {
          const when = s.when.map((w) => `<span><b>CUANDO</b> ${inline(w)}</span>`).join('')
          const then = s.then.map((t) => `<span><b>ENTONCES</b> ${inline(t)}</span>`).join('')
          return `<div class="scn"><b>${esc(s.id)} — ${esc(s.title)}</b><div class="steps">${when}${then}</div></div>`
        })
        .join('')
      return `<article class="req">
  <h3><span class="req-id">${esc(req.id)}</span> — ${esc(req.title)} <span class="pill">${kind === 'added' ? l.added : l.modified}</span></h3>
  <p>${inline(req.prose)}</p>
  ${rules ? `<ul>${rules}</ul>` : ''}
  ${scenarioHtml}
</article>`
    })
    .join('')

  const criteriaRows = scenarios
    .map((s) => {
      const status = input.evidence.get(s.id)
      const cls = status ?? 'pending'
      const label = status ?? l.pending
      return `<tr><td><code>${esc(s.id)}</code></td><td>${esc(s.title)}</td><td><span class="pill ${cls}">${esc(label)}</span></td></tr>`
    })
    .join('')

  const signatureState =
    input.approvalStatus === 'valid' && input.approval
      ? `<div class="sign-state ok"><span class="ss-label">${esc(l.approve)}</span><b>${esc(l.approveDone.replace('{by}', input.approval.by).replace('{at}', input.approval.at))}</b></div>`
      : input.approvalStatus === 'stale' && input.approval
        ? `<div class="sign-state stale"><span class="ss-label">${esc(l.approve)}</span><b>${esc(l.approveStale)}</b><p>${esc(l.approveDone.replace('{by}', input.approval.by).replace('{at}', input.approval.at))}</p></div>`
        : `<div class="sign-state"><span class="ss-label">${esc(l.approve)}</span><b>${esc(l.approvePending)}</b><p>${esc(l.approveText)}</p></div>`

  const mockupHtml =
    input.mockups.length === 0
      ? `<div class="callout">${esc(l.noMockups)}</div>`
      : `<p class="sign-help" style="margin:0 0 12px">${esc(l.mockupHint)}</p><div class="mockups">${input.mockups
          .map(
            (m) =>
              `<div class="mockup ${m.platform === 'mobile' ? 'phone' : ''}" data-mockup="${esc(m.file)}" data-title="${esc(m.title)}"><header><span>${esc(m.title)}</span><a class="btn" href="${esc(m.file)}" target="_blank" rel="noopener">${esc(l.openMockup)}</a></header><div class="mockup-body"><span class="mockup-file">${esc(m.file)}</span>${m.illustrates.length > 0 ? `<span class="mockup-scn">${esc(l.illustrates)}: ${m.illustrates.map((id) => esc(id)).join(', ')}</span>` : ''}</div></div>`,
          )
          .join('')}</div>`

  const shotsHtml = input.screenshots.length === 0 ? '' : `<h3 style="margin-top:14px">${esc(l.screenshots)}</h3><div class="grid-shots">${input.screenshots.map((s) => `<img src="${esc(s)}" alt="${esc(s)}" loading="lazy">`).join('')}</div>`

  const missingHtml =
    input.missingMockups.length === 0
      ? ''
      : `<div class="callout warn" style="margin-top:12px"><b>${esc(l.missingMockups)}:</b> ${input.missingMockups.map((file) => esc(file)).join(', ')}</div>`

  const hasProposal = input.proposalHtml.trim().length > 0

  return `<!doctype html>
<html lang="${input.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(l.kicker)} — ${esc(input.title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
  <aside class="toc" aria-label="${esc(l.contents)}">
    <h2>${esc(l.contents)}</h2>
    <ol>
      <li><a href="#identidad">${esc(l.identity)}</a></li>
      <li><a href="#resumen">${esc(l.summary)}</a></li>
      <li><a href="#especificacion">${esc(l.requirements)}</a></li>
      <li><a href="#criterios">${esc(l.criteria)}</a></li>
      <li><a href="#mockups">${esc(l.mockups)}</a></li>
      <li><a href="#firma">${esc(l.approve)}</a></li>
    </ol>
    <div class="toc-actions">
      <button type="button" class="btn primary" onclick="window.print()">⎙ ${esc(l.print)}</button>
      <span style="color:var(--faint);font-size:11.5px">Se imprime desde el propio navegador; sin servicios externos.</span>
    </div>
  </aside>

  <main class="doc">
    <section class="card cover" id="identidad">
      <div class="brand">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2.4 21.6 12 12 21.6 2.4 12z" opacity=".5"></path>
          <path d="M7.2 14.8 9.8 11l2.6 2.1 4.2-5.8"></path>
          <circle cx="7.2" cy="14.8" r="1.5" fill="currentColor" stroke="none"></circle>
          <circle cx="16.6" cy="7.3" r="1.5" fill="currentColor" stroke="none"></circle>
        </svg>
        <div>
          <p class="kicker">SpecAtlas · ${esc(l.kicker)}</p>
          <p style="color:var(--muted);font-size:12.5px">${esc(input.project)}</p>
        </div>
      </div>
      <h1>${esc(input.title)}</h1>
      <p class="lead">Esta presentación reúne la propuesta, la especificación y el contrato visual del cambio <b>${esc(input.slug)}</b> para su revisión y firma.</p>
      <div class="meta-chips">
        <span class="chip">cambio <b>${esc(input.slug)}</b></span>
        <span class="chip">carril <b>${esc(input.lane)}</b></span>
        <span class="chip">dominio <b>${esc(input.domain)}</b></span>
        <span class="chip">requisitos <b>${input.requirements.length}</b></span>
        <span class="chip">escenarios <b>${scenarios.length}</b></span>
        <span class="chip">evidencia <b>${passed}/${scenarios.length}</b></span>
        <span class="chip">mockups <b>${input.mockups.length}</b></span>
        <span class="chip">${esc(l.generated)} <b>${esc(input.generatedAt)}</b></span>
      </div>
      <div class="cover-foot">
        ${signatureState}
        <div class="hash-box">
          <span class="hb-label">${esc(l.hash)}</span>
          <code>${esc(input.hash)}</code>
          <p style="color:var(--muted);font-size:12px;margin-top:8px">${esc(l.signatureNote)}</p>
        </div>
      </div>
    </section>

    <section class="card" id="resumen">
      <div class="card-head"><span class="num">01</span><h2>${esc(l.summary)}</h2></div>
      <div class="card-body">${hasProposal ? input.proposalHtml : `<div class="callout warn">${esc(l.noProposal)}</div>`}</div>
    </section>

    <section class="card" id="especificacion">
      <div class="card-head"><span class="num">02</span><h2>${esc(l.requirements)}</h2><span class="sub">${input.requirements.length} requisito(s) · ${scenarios.length} escenario(s)</span></div>
      <div class="card-body">${reqHtml || `<div class="callout">Sin requisitos en el delta.</div>`}</div>
    </section>

    <section class="card" id="criterios">
      <div class="card-head"><span class="num">03</span><h2>${esc(l.criteria)}</h2><span class="sub">${passed}/${scenarios.length} con evidencia pass</span></div>
      <div class="card-body" style="padding:0">
        <table><thead><tr><th>ID</th><th>${esc(l.scenario)}</th><th>${esc(l.evidence)}</th></tr></thead><tbody>${criteriaRows || `<tr><td colspan="3"><div class="callout">Sin escenarios.</div></td></tr>`}</tbody></table>
      </div>
    </section>

    <section class="card" id="mockups">
      <div class="card-head"><span class="num">04</span><h2>${esc(l.mockups)}</h2><span class="sub">${input.mockups.length} pantalla(s)</span></div>
      <div class="card-body">${mockupHtml}${missingHtml}${shotsHtml}</div>
    </section>

    <section class="card" id="firma">
      <div class="card-head"><span class="num">05</span><h2>${esc(l.approve)}</h2><span class="sub">acto humano · queda auditado</span></div>
      <div class="card-body">
        <div class="signature">
          <div class="sign-line">
            <div class="sl-row"><span>${esc(l.signatureName)}</span><span style="font-family:ui-monospace,Consolas,monospace">____________________</span></div>
            <div class="sl-row"><span>${esc(l.signatureDate)}</span><span style="font-family:ui-monospace,Consolas,monospace">____ / ____ / ________</span></div>
          </div>
          <div>
            <p class="sign-help">${esc(l.signatureNote)}</p>
            <p class="sign-help" style="margin-top:8px"><code>${esc(input.approveHint)}</code></p>
            <p class="sign-help" style="margin-top:10px">${esc(l.approveStale)}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="footer"><span>SpecAtlas · ${esc(input.project)} · ${esc(input.generatedAt)}</span><span>${esc(input.hash)}</span></div>
  </main>
</div>
<script>
(function () {
  // Mejora progresiva: donde los scripts corren (navegador) el mockup se previsualiza en linea.
  // Donde no corren (webview con CSP) la tarjeta con el enlace ya es suficiente y nada queda en blanco.
  // Incrustada en otra pagina (el panel del editor la mete en un iframe) las rutas relativas
  // no resuelven: se queda la tarjeta con el enlace y no se monta ningun marco en blanco.
  try { if (window.top !== window.self) return; } catch (error) { return; }
  var cards = Array.prototype.slice.call(document.querySelectorAll('.mockup[data-mockup]'));
  cards.forEach(function (card) {
    var frame = document.createElement('iframe');
    frame.setAttribute('src', card.getAttribute('data-mockup'));
    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('title', card.getAttribute('data-title') || 'mockup');
    var body = card.querySelector('.mockup-body');
    if (body) body.style.display = 'none';
    card.appendChild(frame);
  });
})();
</script>
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
