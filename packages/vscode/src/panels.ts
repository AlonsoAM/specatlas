import { renderStyles, type AttentionItem, type WorkspaceMetrics } from '@specatlas/core'
import { escapeHtml, type MatrixModel, type MatrixRequirement, type Snapshot } from './logic.js'

type Tone = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'yellow' | 'gray'

const TONES: Record<Tone, string> = {
  blue: 'var(--vscode-charts-blue, #3794ff)',
  green: 'var(--vscode-charts-green, #89d185)',
  orange: 'var(--vscode-charts-orange, #d18616)',
  red: 'var(--vscode-charts-red, #f14c4c)',
  purple: 'var(--vscode-charts-purple, #b180d7)',
  yellow: 'var(--vscode-charts-yellow, #cca700)',
  gray: 'var(--vscode-descriptionForeground, #8a8a8a)',
}

const STATE_TONES: Record<string, Tone> = {
  draft: 'gray',
  spec_draft: 'orange',
  awaiting_mockups: 'purple',
  awaiting_approval: 'purple',
  approved: 'blue',
  planned: 'blue',
  building: 'blue',
  built: 'yellow',
  verified: 'green',
  ready: 'green',
  archived: 'gray',
}

const PANEL_CSS = `
:root {
  --atlas-radius: 12px;
  --atlas-radius-sm: 8px;
  --atlas-shadow: 0 1px 2px rgba(0,0,0,.14), 0 6px 18px rgba(0,0,0,.10);
  --atlas-shadow-soft: 0 1px 2px rgba(0,0,0,.08);
  --atlas-gap: 14px;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--atlas-bg); color: var(--atlas-ink); font: 13px/1.55 var(--atlas-font-sans); }
.shell { max-width: 1280px; margin: 0 auto; padding: 22px 22px 70px; }

.hero {
  position: relative;
  border: 1px solid var(--atlas-line);
  border-radius: var(--atlas-radius);
  padding: 20px 22px;
  margin-bottom: 18px;
  overflow: hidden;
  background:
    radial-gradient(1100px 220px at 0% -40%, color-mix(in srgb, ${TONES.blue} 22%, transparent), transparent),
    radial-gradient(900px 200px at 100% -60%, color-mix(in srgb, ${TONES.purple} 20%, transparent), transparent),
    var(--atlas-card);
  box-shadow: var(--atlas-shadow);
  display: flex; gap: 18px; align-items: center; justify-content: space-between; flex-wrap: wrap;
}
.hero-left { display: flex; align-items: center; gap: 16px; }
.brand-mark { color: var(--atlas-accent); flex: 0 0 auto; filter: drop-shadow(0 3px 10px color-mix(in srgb, var(--atlas-accent) 30%, transparent)); }
.eyebrow { margin: 0 0 4px; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--atlas-muted); }
.eyebrow strong { color: var(--atlas-accent); font-weight: 600; letter-spacing: .12em; }
.hero h1 { margin: 0; font-size: 24px; letter-spacing: -.01em; }
.hero .subtitle { margin: 6px 0 0; color: var(--atlas-muted); max-width: 70ch; }
.hero-right { display: flex; align-items: center; gap: 16px; }

.status-banner { display: flex; gap: 12px; align-items: flex-start; border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent); background: color-mix(in srgb, var(--tone) 10%, transparent); border-radius: var(--atlas-radius); padding: 12px 16px; margin-bottom: 16px; box-shadow: var(--atlas-shadow-soft); }
.status-banner .sb-icon { font-size: 16px; color: var(--tone); line-height: 1.3; }
.status-banner strong { display: block; font-size: 13.5px; }
.status-banner .sb-text { color: var(--atlas-muted); font-size: 12.5px; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: var(--atlas-gap); margin: 0 0 18px; }
.kpi {
  border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius); background: var(--atlas-card);
  padding: 12px 14px; box-shadow: var(--atlas-shadow-soft); position: relative; overflow: hidden;
}
.kpi::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--tone, ${TONES.blue}); opacity: .85; }
.kpi .top { display: flex; align-items: center; gap: 8px; color: var(--atlas-muted); font-size: 12px; }
.kpi .ico { font-size: 13px; color: var(--tone, ${TONES.blue}); }
.kpi .val { font-size: 22px; font-weight: 700; letter-spacing: -.02em; margin-top: 2px; }
.kpi .lbl { color: var(--atlas-muted); font-size: 12px; }
.kpi .hint { color: var(--atlas-muted); font-size: 11px; margin-top: 4px; }

.section { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius); background: var(--atlas-card); box-shadow: var(--atlas-shadow-soft); margin-bottom: 18px; overflow: hidden; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--atlas-line); background: color-mix(in srgb, var(--atlas-line) 22%, transparent); }
.section-head h2 { margin: 0; font-size: 14px; letter-spacing: .02em; }
.section-head .sub { color: var(--atlas-muted); font-size: 12px; }
.section-body { padding: 14px 16px; }

.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--atlas-gap); }

.pill {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px; line-height: 1; padding: 4px 9px; border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tone, ${TONES.gray}) 55%, transparent);
  color: var(--tone, ${TONES.gray}); background: color-mix(in srgb, var(--tone, ${TONES.gray}) 12%, transparent);
  margin: 0 4px 4px 0; white-space: nowrap;
}
.pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pill.mono { font-family: var(--atlas-font-mono); }

table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; }
thead th {
  position: sticky; top: 0; z-index: 2; text-align: left; font-weight: 600; color: var(--atlas-muted);
  background: var(--atlas-card); padding: 8px 10px; border-bottom: 1px solid var(--atlas-line);
  text-transform: uppercase; font-size: 10.5px; letter-spacing: .08em;
}
tbody td { padding: 8px 10px; border-bottom: 1px solid color-mix(in srgb, var(--atlas-line) 60%, transparent); vertical-align: middle; }
tbody tr:hover td { background: color-mix(in srgb, var(--atlas-accent) 5%, transparent); }
tr.row-group td { background: color-mix(in srgb, var(--atlas-line) 30%, transparent); font-weight: 600; border-bottom: 1px solid var(--atlas-line); position: sticky; top: 33px; z-index: 1; }
tr.row-group:hover td { background: color-mix(in srgb, var(--atlas-line) 38%, transparent); }
tr.row-group.has-gap td { box-shadow: inset 3px 0 0 ${TONES.orange}; }
tr.row-gap td:first-child { box-shadow: inset 3px 0 0 ${TONES.red}; }
tr.row-gap td { background: color-mix(in srgb, ${TONES.red} 7%, transparent); }
.matrix tbody tr.scenario-row:nth-of-type(odd) td { background: color-mix(in srgb, var(--atlas-line) 12%, transparent); }
.group-line { display: flex; align-items: center; gap: 10px; }
.group-title { font-weight: 600; }
.group-spacer { flex: 1; }
.group-coverage { display: flex; align-items: center; gap: 8px; font-weight: 400; }
.gc-track { width: 110px; height: 6px; border-radius: 999px; background: color-mix(in srgb, var(--atlas-line) 80%, transparent); overflow: hidden; }
.gc-fill { display: block; height: 100%; border-radius: 999px; background: var(--tone); }
.gc-label { font-size: 11px; color: var(--atlas-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.evidence-cell { display: flex; align-items: center; gap: 6px; }

.mono { font-family: var(--atlas-font-mono); font-size: 12px; }
.muted { color: var(--atlas-muted); }
.empty { color: var(--atlas-muted); text-align: center; padding: 18px; border: 1px dashed var(--atlas-line); border-radius: var(--atlas-radius-sm); }

.board { display: flex; gap: var(--atlas-gap); overflow-x: auto; align-items: flex-start; padding: 4px 2px 10px; }
.col { min-width: 252px; max-width: 272px; border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius); background: color-mix(in srgb, var(--atlas-line) 16%, transparent); border-top: 3px solid var(--tone, ${TONES.gray}); }
.col-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; }
.col-head h3 { margin: 0; font-size: 11.5px; text-transform: uppercase; letter-spacing: .09em; color: var(--atlas-muted); }
.col-head .count { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 2px 8px; color: var(--tone); border: 1px solid color-mix(in srgb, var(--tone) 55%, transparent); background: color-mix(in srgb, var(--tone) 12%, transparent); }
.col-body { padding: 0 10px 10px; }
.ticket { background: var(--atlas-card); border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); padding: 10px 12px; margin-bottom: 8px; box-shadow: var(--atlas-shadow-soft); transition: transform .12s ease, box-shadow .12s ease; }
.ticket:hover { transform: translateY(-1px); box-shadow: var(--atlas-shadow); }
.ticket h4 { margin: 0 0 4px; font-size: 13px; }
.chips { margin: 6px 0 2px; }
.banner { display: flex; gap: 6px; align-items: center; font-size: 11.5px; border-radius: var(--atlas-radius-sm); padding: 6px 8px; margin: 6px 0; }
.banner.warn { color: var(--atlas-warn); background: color-mix(in srgb, ${TONES.orange} 14%, transparent); border: 1px solid color-mix(in srgb, ${TONES.orange} 40%, transparent); }
.progress { height: 7px; border-radius: 999px; background: color-mix(in srgb, var(--atlas-line) 70%, transparent); overflow: hidden; margin: 7px 0 4px; }
.progress > span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, color-mix(in srgb, var(--tone, ${TONES.blue}) 70%, transparent), var(--tone, ${TONES.blue})); }
.progress-label { display: flex; justify-content: space-between; color: var(--atlas-muted); font-size: 11px; }

.donut { display: flex; align-items: center; gap: 14px; }
.donut svg { flex: 0 0 auto; }
.donut-chart .center { font-size: 20px; font-weight: 700; fill: var(--atlas-ink); }
.donut-chart .center-sub { font-size: 9.5px; fill: var(--atlas-muted); letter-spacing: .06em; text-transform: uppercase; }
.donut .legend { display: flex; flex-direction: column; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--atlas-muted); }
.legend-item i { width: 9px; height: 9px; border-radius: 3px; background: var(--tone); display: inline-block; }
.legend-item b { color: var(--atlas-ink); font-weight: 600; }
.legend-bar { display: flex; flex-wrap: wrap; gap: 16px; padding: 12px 4px 0; }

.bars { display: flex; align-items: flex-end; gap: 10px; height: 130px; padding-top: 6px; }
.bar-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; min-width: 46px; height: 100%; }
.bar-col .bar { width: 26px; border-radius: 6px 6px 3px 3px; background: linear-gradient(180deg, color-mix(in srgb, var(--tone, ${TONES.blue}) 65%, transparent), var(--tone, ${TONES.blue})); box-shadow: var(--atlas-shadow-soft); }
.bar-col .v { font-size: 11px; font-weight: 700; }
.bar-col .k { font-size: 10.5px; color: var(--atlas-muted); white-space: nowrap; }
.bar-list { display: flex; flex-direction: column; gap: 8px; }
.bar-row { display: grid; grid-template-columns: 96px 1fr 34px; gap: 10px; align-items: center; font-size: 12px; }
.bar-row .track { height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--atlas-line) 70%, transparent); overflow: hidden; }
.bar-row .fill { height: 100%; border-radius: 999px; background: var(--tone, ${TONES.blue}); }
.bar-row .n { text-align: right; color: var(--atlas-muted); font-variant-numeric: tabular-nums; }

.mini-progress { margin-top: 12px; min-width: 190px; }
.mini-progress .mp-label { display: block; font-size: 11.5px; color: var(--atlas-muted); margin-bottom: 2px; }
.attention-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.attention-card { display: flex; gap: 10px; border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent); background: color-mix(in srgb, var(--tone) 9%, transparent); border-radius: var(--atlas-radius-sm); padding: 10px 12px; }
.attention-card .a-icon { color: var(--tone); font-size: 15px; }
.attention-card .a-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .07em; color: var(--tone); margin-left: 8px; }
.attention-card .a-detail { color: var(--atlas-muted); font-size: 12px; margin-top: 2px; }
.callout-line { margin-top: 10px; color: var(--atlas-muted); font-size: 12.5px; border-left: 3px solid var(--atlas-accent); padding-left: 10px; }
.blocked-card { border: 1px solid color-mix(in srgb, ${TONES.orange} 40%, transparent); background: color-mix(in srgb, ${TONES.orange} 10%, transparent); border-radius: var(--atlas-radius-sm); padding: 10px 12px; margin-bottom: 8px; }
.blocked-card b { color: var(--atlas-ink); }
.footer { margin-top: 18px; color: var(--atlas-muted); font-size: 11.5px; display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.footer .brand { letter-spacing: .14em; text-transform: uppercase; font-size: 10.5px; }

.filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 16px 0; }
.filters input[type="search"] { flex: 1 1 220px; min-width: 170px; background: var(--vscode-input-background, #3c3c3c); color: var(--vscode-input-foreground, #ccc); border: 1px solid var(--vscode-input-border, transparent); border-radius: 6px; padding: 5px 10px; font: inherit; }
.filters select { background: var(--vscode-dropdown-background, #3c3c3c); color: var(--vscode-dropdown-foreground, #ccc); border: 1px solid var(--vscode-dropdown-border, transparent); border-radius: 6px; padding: 5px 8px; font: inherit; }
.filters .fcount { margin-left: auto; color: var(--atlas-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.filters .fclear { background: transparent; color: var(--atlas-muted); border: 1px solid color-mix(in srgb, var(--atlas-line) 80%, transparent); border-radius: 6px; padding: 4px 10px; font: inherit; cursor: pointer; }
.filters .fclear:hover { color: var(--atlas-ink); border-color: var(--atlas-ink); }
mark.hit { background: color-mix(in srgb, var(--vscode-charts-yellow, #cca700) 45%, transparent); color: var(--atlas-ink); border-radius: 3px; padding: 0 1px; }
tbody tr[hidden], article.ticket[hidden] { display: none; }
a { color: var(--atlas-accent); text-decoration: none; border-bottom: 1px dotted color-mix(in srgb, var(--atlas-accent) 50%, transparent); }
a:hover { border-bottom-style: solid; }
`

function tone(t: Tone): string {
  return TONES[t]
}

let donutSeq = 0

function kpi(value: string | number, label: string, opts: { tone?: Tone; icon?: string; hint?: string } = {}): string {
  const style = ` style="--tone:${tone(opts.tone ?? 'blue')}"`
  return `<div class="kpi"${style}>
  <div class="top"><span class="ico">${opts.icon ?? '●'}</span><span>${escapeHtml(label)}</span></div>
  <div class="val">${escapeHtml(String(value))}</div>
  ${opts.hint ? `<div class="hint">${escapeHtml(opts.hint)}</div>` : ''}
</div>`
}

function pillHtml(label: string, t: Tone, icon?: string, mono = false): string {
  return `<span class="pill${mono ? ' mono' : ''}" style="--tone:${tone(t)}">${icon ? `${icon} ` : ''}${escapeHtml(label)}</span>`
}

function commandLink(command: string, args: unknown[], label: string): string {
  return `<a href="command:${command}?${encodeURIComponent(JSON.stringify(args))}">${escapeHtml(label)}</a>`
}

function donut(percent: number, center: string, subtitle: string, t: Tone): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  const radius = 46
  const innerRadius = radius - 5.5
  const circumference = 2 * Math.PI * radius
  const dash = (clamped / 100) * circumference
  const uid = `atlas-donut-${(donutSeq += 1)}`
  const color = tone(t)
  return `<svg class="donut-chart" width="132" height="132" viewBox="0 0 120 120" role="img" aria-label="${clamped}%">
  <defs>
    <radialGradient id="${uid}" cx="50%" cy="34%" r="78%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.5"></stop>
      <stop offset="62%" stop-color="${color}" stop-opacity="0.22"></stop>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.08"></stop>
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="${innerRadius}" fill="color-mix(in srgb, var(--atlas-ink) 6%, transparent)"></circle>
  <circle cx="60" cy="60" r="${innerRadius}" fill="url(#${uid})"></circle>
  <circle cx="60" cy="60" r="${radius}" fill="none" stroke="color-mix(in srgb, var(--atlas-ink) 16%, transparent)" stroke-width="11"></circle>
  <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round"
          stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" transform="rotate(-90 60 60)"></circle>
  <text x="60" y="58" text-anchor="middle" class="center" dominant-baseline="middle">${center}</text>
  <text x="60" y="78" text-anchor="middle" class="center-sub">${escapeHtml(subtitle)}</text>
</svg>`
}

function barList(items: Array<{ label: string; value: number; tone?: Tone }>): string {
  const max = Math.max(1, ...items.map((item) => item.value))
  return `<div class="bar-list">${items
    .map(
      (item) => `<div class="bar-row" style="--tone:${tone(item.tone ?? 'blue')}">
  <span class="muted">${escapeHtml(item.label)}</span>
  <span class="track"><span class="fill" style="width:${Math.round((item.value / max) * 100)}%"></span></span>
  <span class="n">${item.value}</span>
</div>`,
    )
    .join('')}</div>`
}

function bars(items: Array<{ label: string; value: number; tone?: Tone }>): string {
  const max = Math.max(1, ...items.map((item) => item.value))
  return `<div class="bars">${items
    .map(
      (item) => `<div class="bar-col" style="--tone:${tone(item.tone ?? 'blue')}">
  <span class="v">${item.value}</span>
  <span class="bar" style="height:${Math.max(6, Math.round((item.value / max) * 78))}px"></span>
  <span class="k">${escapeHtml(item.label)}</span>
</div>`,
    )
    .join('')}</div>`
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

function progressBar(percent: number, t: Tone): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  return `<div class="progress" style="--tone:${tone(t)}"><span style="width:${clamped}%"></span></div>`
}

function panelPage(input: {
  kind: string
  title: string
  subtitle: string
  heroRight?: string
  body: string
  footer?: string
  script?: string
  nonce?: string
}): string {
  const csp = input.nonce
    ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${input.nonce}'; img-src data:;">\n`
    : ''
  const script = input.script && input.nonce ? `<script nonce="${input.nonce}">${input.script}</script>\n` : ''
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}<style>${renderStyles({ theme: 'vscode' })}${PANEL_CSS}</style>
</head>
<body>
<div class="shell">
  <header class="hero">
    <div class="hero-left">
      ${brandMark(36)}
      <div>
        <p class="eyebrow">SpecAtlas · <strong>${escapeHtml(input.kind)}</strong></p>
        <h1>${escapeHtml(input.title)}</h1>
        <p class="subtitle">${escapeHtml(input.subtitle)}</p>
      </div>
    </div>
    ${input.heroRight ? `<div class="hero-right">${input.heroRight}</div>` : ''}
  </header>
  ${input.body}
  <div class="footer"><span>${escapeHtml(input.footer ?? '')}</span><span class="brand">SpecAtlas</span></div>
</div>
${script}</body>
</html>
`
}

function brandMark(size = 32): string {
  return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 2.4 21.6 12 12 21.6 2.4 12z" opacity=".5"></path>
  <path d="M7.2 14.8 9.8 11l2.6 2.1 4.2-5.8"></path>
  <circle cx="7.2" cy="14.8" r="1.5" fill="currentColor" stroke="none"></circle>
  <circle cx="16.6" cy="7.3" r="1.5" fill="currentColor" stroke="none"></circle>
  <circle cx="12.4" cy="13.1" r="1.2" fill="currentColor" stroke="none" opacity=".75"></circle>
</svg>`
}

function banner(t: Tone, icon: string, title: string, text: string): string {
  return `<div class="status-banner" style="--tone:${tone(t)}">
  <span class="sb-icon">${icon}</span>
  <div><strong>${escapeHtml(title)}</strong><span class="sb-text">${escapeHtml(text)}</span></div>
</div>`
}

function laneTone(lane: string): Tone {
  if (lane === 'fix') return 'orange'
  if (lane === 'full') return 'purple'
  return 'blue'
}

function requirementTone(requirement: MatrixRequirement): Tone {
  if (requirement.total === 0) return 'gray'
  const percent = (requirement.passed / requirement.total) * 100
  if (percent >= 100) return 'green'
  if (percent > 0) return 'yellow'
  return 'red'
}

const MATRIX_FILTERS_SCRIPT = `
(function () {
  var rows = Array.prototype.slice.call(document.querySelectorAll('tbody tr[data-group]'));
  var heads = new Map();
  rows.forEach(function (row) { if (row.classList.contains('row-group')) heads.set(row.getAttribute('data-group'), row); });
  var q = document.getElementById('mq');
  var st = document.getElementById('mstatus');
  var dom = document.getElementById('mdomain');
  var ch = document.getElementById('mchange');
  var out = document.getElementById('mcount');
  var clear = document.getElementById('mclear');
  function norm(value) { return (value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase(); }
  function escapeHtml(value) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlight(cell, text) {
    var original = cell.getAttribute('data-title') || '';
    if (!text) { cell.textContent = original; return; }
    var index = norm(original).indexOf(text);
    if (index < 0) { cell.textContent = original; return; }
    var hit = original.slice(index, index + text.length);
    cell.innerHTML = escapeHtml(original.slice(0, index)) + '<mark class="hit">' + escapeHtml(hit) + '</mark>' + escapeHtml(original.slice(index + hit.length));
  }
  function apply() {
    var text = norm(q && q.value ? q.value : '').trim();
    var status = st ? st.value : 'all';
    var domain = dom ? dom.value : '';
    var change = ch ? ch.value : '';
    var visible = 0;
    heads.forEach(function (head, key) {
      var list = (head.getAttribute('data-changes') || '').split(' ').filter(Boolean);
      var show = (!text || norm(head.getAttribute('data-text')).indexOf(text) >= 0)
        && (status === 'all' || (status === 'gap' ? head.getAttribute('data-gap') === '1' : head.getAttribute('data-gap') !== '1'))
        && (!domain || head.getAttribute('data-domain') === domain)
        && (!change || (change === '__none' ? list.length === 0 : list.indexOf(change) >= 0));
      if (show) visible += 1;
      rows.forEach(function (row) { if (row.getAttribute('data-group') === key) row.hidden = !show; });
    });
    Array.prototype.slice.call(document.querySelectorAll('td.scenario-title')).forEach(function (cell) {
      var row = cell.closest('tr');
      highlight(cell, row && !row.hidden ? text : '');
    });
    if (out) out.textContent = visible + ' de ' + heads.size + ' requisito(s)';
  }
  [q, st, dom, ch].forEach(function (el) { if (el) el.addEventListener('input', apply); });
  if (clear) clear.addEventListener('click', function () {
    if (q) q.value = '';
    if (st) st.value = 'all';
    if (dom) dom.value = '';
    if (ch) ch.value = '';
    apply();
  });
  apply();
})()
`

const BOARD_FILTERS_SCRIPT = `
(function () {
  var tickets = Array.prototype.slice.call(document.querySelectorAll('article.ticket'));
  var q = document.getElementById('bq');
  var lane = document.getElementById('blane');
  var dom = document.getElementById('bdomain');
  var out = document.getElementById('bcount');
  function norm(value) { return (value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase(); }
  function apply() {
    var text = norm(q && q.value ? q.value : '').trim();
    var laneValue = lane ? lane.value : '';
    var domain = dom ? dom.value : '';
    var counters = {};
    var visible = 0;
    tickets.forEach(function (ticket) {
      var show = (!text || norm(ticket.getAttribute('data-text')).indexOf(text) >= 0)
        && (!laneValue || ticket.getAttribute('data-lane') === laneValue)
        && (!domain || ticket.getAttribute('data-domain') === domain);
      ticket.hidden = !show;
      if (show) {
        visible += 1;
        var col = ticket.closest('[data-col]');
        if (col) { var key = col.getAttribute('data-col'); counters[key] = (counters[key] || 0) + 1; }
      }
    });
    Array.prototype.slice.call(document.querySelectorAll('[data-count]')).forEach(function (el) {
      el.textContent = String(counters[el.getAttribute('data-count')] || 0);
    });
    if (out) out.textContent = visible + ' de ' + tickets.length + ' cambio(s)';
  }
  [q, lane, dom].forEach(function (el) { if (el) el.addEventListener('input', apply); });
  apply();
})()
`

export function matrixHtml(model: MatrixModel, nonce?: string): string {
  const scenarios = model.requirements.flatMap((requirement) => requirement.scenarios)
  const passed = scenarios.filter((scenario) => scenario.evidence === 'pass').length
  const coverage = scenarios.length > 0 ? (passed / scenarios.length) * 100 : 0
  const gaps = scenarios.length - passed
  const coverageTone: Tone = coverage >= 100 ? 'green' : coverage >= 60 ? 'yellow' : 'red'

  const rows = model.requirements
    .map((requirement) => {
      const requirementPercent = requirement.total > 0 ? (requirement.passed / requirement.total) * 100 : 0
      const requirementGap = requirement.scenarios.some((scenario) => scenario.tasks.length === 0 || scenario.evidence !== 'pass')
      const groupRow = `<tr class="row-group${requirementGap ? ' has-gap' : ''}" data-group="${escapeHtml(requirement.id)}" data-gap="${requirementGap ? '1' : '0'}" data-domain="${escapeHtml(requirement.domain ?? '')}" data-changes="${escapeHtml((requirement.changes ?? []).join(' '))}" data-text="${escapeHtml([requirement.id, requirement.title, ...requirement.scenarios.flatMap((s) => [s.id, s.title])].join(' ').toLowerCase())}">
  <td colspan="4">
    <div class="group-line">
      <span class="group-title">${commandLink('specatlas.openAt', [requirement.file, requirement.line], `${requirement.id} — ${requirement.title}`)}</span>
      ${pillHtml(requirement.living ? 'viva' : 'delta', 'blue', '◈')}
      ${requirement.living && (requirement.changes ?? []).length > 0 ? pillHtml(`modificado por ${(requirement.changes ?? []).join(', ')}`, 'purple', '⌥') : ''}
      <span class="group-spacer"></span>
      <span class="group-coverage" style="--tone:${tone(requirementTone(requirement))}">
        <span class="gc-track"><span class="gc-fill" style="width:${Math.round(requirementPercent)}%"></span></span>
        <span class="gc-label">${requirement.passed}/${requirement.total} con evidencia</span>
      </span>
    </div>
  </td>
</tr>`
      const scenarioRows = requirement.scenarios
        .map((scenario) => {
          const gap = scenario.tasks.length === 0 || scenario.evidence !== 'pass'
          const taskChips =
            scenario.tasks.length > 0
              ? scenario.tasks.map((id) => pillHtml(id, 'blue', '▸', true)).join('')
              : pillHtml('sin tarea', 'red', '✕')
          const method = scenario.method ? `<span class="mono muted">${escapeHtml(scenario.method)}</span>` : ''
          const evidence =
            scenario.evidence === 'pass'
              ? `${pillHtml('pass', 'green', '✓')}${method}`
              : scenario.evidence === 'fail'
                ? `${pillHtml('fail', 'red', '✕')}${method}`
                : pillHtml('pendiente', 'orange', '⋯')
          return `<tr class="scenario-row${gap ? ' row-gap' : ''}" data-group="${escapeHtml(requirement.id)}">
  <td class="mono">${commandLink('specatlas.openAt', [scenario.file, scenario.line], scenario.id)}</td>
  <td class="scenario-title" data-title="${escapeHtml(scenario.title)}">${escapeHtml(scenario.title)}</td>
  <td>${taskChips}</td>
  <td class="evidence-cell">${evidence}</td>
</tr>`
        })
        .join('')
      return `${groupRow}${scenarioRows}`
    })
    .join('\n')

  const status =
    scenarios.length > 0 && gaps === 0
      ? banner('green', '✓', 'Trazabilidad completa', `Los ${scenarios.length} escenarios tienen tarea y evidencia pass.`)
      : banner(
          scenarios.length === 0 ? 'gray' : coverage >= 60 ? 'orange' : 'red',
          scenarios.length === 0 ? '◍' : '△',
          scenarios.length === 0 ? 'Sin escenarios todavía' : `${gaps} escenario(s) sin cerrar`,
          `${model.uncoveredScenarios.length} sin tarea · ${model.pendingEvidence.length} sin evidencia pass · ${model.requirementsWithoutTasks.length} requisito(s) sin tareas`,
        )

  const donutBlock = `<div class="donut">
  ${donut(coverage, `${Math.round(coverage)}%`, 'evidencia', coverageTone)}
  <div class="legend">
    <span class="legend-item" style="--tone:${tone('green')}"><i></i><b>${passed}</b> con evidencia pass</span>
    <span class="legend-item" style="--tone:${tone('orange')}"><i></i><b>${scenarios.length - passed}</b> pendientes o fallidas</span>
    <span class="legend-item" style="--tone:${tone('red')}"><i></i><b>${model.uncoveredScenarios.length}</b> escenarios sin tarea</span>
    <span class="legend-item" style="--tone:${tone('gray')}"><i></i><b>${model.requirementsWithoutTasks.length}</b> requisitos sin tareas</span>
  </div>
</div>`

  const domains = [...new Set(model.requirements.map((requirement) => requirement.domain).filter((domain): domain is string => Boolean(domain)))].sort()
  const changeSlugs = [...new Set(model.requirements.flatMap((requirement) => requirement.changes ?? []))].sort()
  const filters = `<div class="filters">
  <input type="search" id="mq" placeholder="Buscar requisito o escenario…" aria-label="Buscar requisito o escenario">
  <select id="mstatus" aria-label="Estado">
    <option value="all">Todos</option>
    <option value="gap">Con huecos</option>
    <option value="pass">Verificados</option>
  </select>
  ${domains.length > 1 ? `<select id="mdomain" aria-label="Dominio"><option value="">Todos los dominios</option>${domains.map((domain) => `<option value="${escapeHtml(domain)}">${escapeHtml(domain)}</option>`).join('')}</select>` : ''}
  ${changeSlugs.length > 0 ? `<select id="mchange" aria-label="Cambio"><option value="">Todos los cambios</option><option value="__none">Sin cambio activo</option>${changeSlugs.map((slug) => `<option value="${escapeHtml(slug)}">${escapeHtml(slug)}</option>`).join('')}</select>` : ''}
  <span class="fcount" id="mcount"></span>
  <button type="button" class="fclear" id="mclear" aria-label="Limpiar filtros">Limpiar</button>
</div>`

  const body = `
${status}
<div class="kpis">
  ${kpi(model.requirements.length, 'Requisitos', { tone: 'blue', icon: '▤', hint: 'vivos y del delta' })}
  ${kpi(scenarios.length, 'Escenarios', { tone: 'purple', icon: '◇', hint: 'criterios de aceptación' })}
  ${kpi(`${Math.round(coverage)}%`, 'Cobertura', { tone: coverageTone, icon: '◍', hint: `${passed}/${scenarios.length} con evidencia` })}
  ${kpi(model.uncoveredScenarios.length, 'Sin tarea', { tone: model.uncoveredScenarios.length > 0 ? 'red' : 'green', icon: '✕', hint: 'huecos de trazabilidad' })}
  ${kpi(model.pendingEvidence.length, 'Sin evidencia', { tone: model.pendingEvidence.length > 0 ? 'orange' : 'green', icon: '⋯', hint: 'esperando resultado pass' })}
</div>
<section class="section">
  <div class="section-head"><h2>Cobertura de escenarios</h2><span class="sub">requisito → escenario → tarea → evidencia</span></div>
  <div class="section-body">${donutBlock}</div>
</section>
<section class="section">
  <div class="section-head"><h2>Matriz</h2><span class="sub">lo accionable primero · los huecos se resaltan · clic en un id para abrir en la línea</span></div>
  ${filters}
  <div class="section-body" style="padding:6px 0 0">
    <table class="matrix">
      <thead><tr><th style="width:190px">Escenario</th><th>Título</th><th style="width:290px">Tareas</th><th style="width:170px">Evidencia</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4"><div class="empty">Sin requisitos todavía. Especifica un cambio con <span class="mono">/satlas-specify</span>.</div></td></tr>'}</tbody>
    </table>
  </div>
</section>
<div class="legend-bar">
  <span class="legend-item" style="--tone:${tone('green')}"><i></i>evidencia pass</span>
  <span class="legend-item" style="--tone:${tone('orange')}"><i></i>pendiente</span>
  <span class="legend-item" style="--tone:${tone('red')}"><i></i>hueco (sin tarea o sin evidencia)</span>
  <span class="legend-item" style="--tone:${tone('blue')}"><i></i>tarea que cubre</span>
</div>`

  return panelPage({
    kind: 'matriz de trazabilidad',
    title: 'Cobertura requisito → evidencia',
    subtitle: `${plural(model.requirements.length, 'requisito', 'requisitos')} · ${plural(scenarios.length, 'escenario', 'escenarios')} · ${passed} con evidencia pass`,
    heroRight: donut(coverage, `${Math.round(coverage)}%`, 'cobertura', coverageTone),
    body,
    footer: 'los ids abren el artefacto en la línea exacta · los filtros no recargan el panel',
    ...(nonce ? { script: MATRIX_FILTERS_SCRIPT, nonce } : {}),
  })
}

const BOARD_ORDER: Array<{ state: string; label: string }> = [
  { state: 'draft', label: 'Borrador' },
  { state: 'spec_draft', label: 'Spec en borrador' },
  { state: 'awaiting_approval', label: 'Esperando aprobación' },
  { state: 'approved', label: 'Aprobado' },
  { state: 'building', label: 'Construyendo' },
  { state: 'built', label: 'Construido' },
  { state: 'verified', label: 'Verificado' },
  { state: 'ready', label: 'Listo para archivar' },
]

export function boardHtml(snapshot: Snapshot, nonce?: string): string {
  const columns = BOARD_ORDER.map((column) => {
    const items = snapshot.changes.filter((change) => change.state === column.state)
    const t = STATE_TONES[column.state] ?? 'gray'
    const tickets = items
      .map((change) => {
        const total = change.progress.tasksTotal
        const percent = total > 0 ? Math.round((change.progress.tasksDone / total) * 100) : 0
        const blocked = change.blockedBy.length > 0 ? `<div class="banner warn">▲ ${escapeHtml(change.blockedBy[0] ?? '')}</div>` : ''
        const searchText = `${change.slug} ${change.title ?? ''}`.toLowerCase()
        return `<article class="ticket" data-lane="${escapeHtml(change.lane)}" data-domain="${escapeHtml(change.domain ?? '')}" data-text="${escapeHtml(searchText)}">
  <h4>${escapeHtml(change.title ?? change.slug)}</h4>
  <div class="chips">
    ${pillHtml(change.lane, laneTone(change.lane), '◆')}
    ${change.domain ? pillHtml(change.domain, 'gray', '⌂') : ''}
  </div>
  <div class="mono muted">${escapeHtml(change.next)}</div>
  ${blocked}
  ${progressBar(percent, t)}
  <div class="progress-label"><span>${change.progress.tasksDone}/${total} tareas</span><span>evidencia ${change.progress.scenariosDone}/${change.progress.scenariosTotal}</span></div>
</article>`
      })
      .join('')
    return `<div class="col" style="--tone:${tone(t)}" data-col="${escapeHtml(column.state)}">
  <div class="col-head"><h3>${escapeHtml(column.label)}</h3><span class="count" data-count="${escapeHtml(column.state)}">${items.length}</span></div>
  <div class="col-body">${tickets || '<div class="empty">Sin cambios</div>'}</div>
</div>`
  }).join('')

  const lanes = [...new Set(snapshot.changes.map((change) => change.lane))].sort()
  const domains = [...new Set(snapshot.changes.map((change) => change.domain).filter((domain): domain is string => Boolean(domain)))].sort()
  const filters = `<div class="filters">
  <input type="search" id="bq" placeholder="Buscar cambio…" aria-label="Buscar cambio">
  ${lanes.length > 1 ? `<select id="blane" aria-label="Carril"><option value="">Todos los carriles</option>${lanes.map((lane) => `<option value="${escapeHtml(lane)}">${escapeHtml(lane)}</option>`).join('')}</select>` : ''}
  ${domains.length > 1 ? `<select id="bdomain" aria-label="Dominio"><option value="">Todos los dominios</option>${domains.map((domain) => `<option value="${escapeHtml(domain)}">${escapeHtml(domain)}</option>`).join('')}</select>` : ''}
  <span class="fcount" id="bcount"></span>
</div>`

  const body = `
<div class="kpis">
  ${kpi(snapshot.summary.changes, 'Cambios activos', { tone: 'blue', icon: '◫', hint: 'en el workspace' })}
  ${kpi(snapshot.summary.specs, 'Specs vivas', { tone: 'purple', icon: '▤', hint: 'fuente de verdad' })}
  ${kpi(snapshot.summary.errors, 'Errores', { tone: snapshot.summary.errors > 0 ? 'red' : 'green', icon: '✕', hint: 'lint y trazabilidad' })}
  ${kpi(snapshot.summary.warnings, 'Avisos', { tone: snapshot.summary.warnings > 0 ? 'orange' : 'green', icon: '△', hint: 'revisables' })}
</div>
<section class="section">
  <div class="section-head"><h2>Flujo de cambios</h2><span class="sub">de la especificación al archivo · una columna por fase</span></div>
  ${snapshot.changes.length > 0 ? filters : ''}
  <div class="section-body"><div class="board">${columns}</div></div>
</section>`

  const readyCount = snapshot.changes.filter((change) => change.state === 'ready').length
  return panelPage({
    kind: 'tablero',
    title: `Flujo de ${snapshot.projectName}`,
    subtitle: `${plural(snapshot.summary.changes, 'cambio activo', 'cambios activos')} · ${plural(snapshot.summary.specs, 'spec viva', 'specs vivas')}`,
    heroRight: donut(snapshot.summary.changes > 0 ? (readyCount / snapshot.summary.changes) * 100 : 0, `${readyCount}`, 'listos', 'green'),
    body,
    footer: 'arrastra el scroll horizontal para ver todas las fases',
    ...(nonce ? { script: BOARD_FILTERS_SCRIPT, nonce } : {}),
  })
}

export function metricsHtml(metrics: WorkspaceMetrics): string {
  const rows = metrics.changes
    .map((change) => {
      const t = STATE_TONES[change.state] ?? 'gray'
      const taskPercent = change.tasksTotal > 0 ? Math.round((change.tasksDone / change.tasksTotal) * 100) : 0
      return `<tr>
  <td class="mono">${escapeHtml(change.slug)}</td>
  <td>${pillHtml(change.lane, laneTone(change.lane), '◆')}</td>
  <td>${pillHtml(change.stateLabel, t, '●')}</td>
  <td style="min-width:130px">${progressBar(taskPercent, 'blue')}<span class="muted mono">${change.tasksDone}/${change.tasksTotal}</span></td>
  <td class="mono">${change.scenariosPassed}/${change.scenariosTotal}</td>
  <td class="mono">${change.findingsErrors} / ${change.findingsWarnings}</td>
  <td class="mono">${change.ageDays !== undefined ? `${change.ageDays}d` : '—'}</td>
</tr>`
    })
    .join('')

  const evidencePercent = metrics.totals.scenarios > 0 ? (metrics.totals.scenariosPassed / metrics.totals.scenarios) * 100 : 0
  const tasksPercent = metrics.totals.tasks > 0 ? (metrics.totals.tasksDone / metrics.totals.tasks) * 100 : 0
  const throughput = Object.entries(metrics.throughputByMonth).sort(([a], [b]) => a.localeCompare(b))
  const methodItems = [
    { label: 'executable', value: metrics.evidenceByMethod['executable'] ?? 0, tone: 'green' as Tone },
    { label: 'automatic', value: metrics.evidenceByMethod['automatic'] ?? 0, tone: 'blue' as Tone },
    { label: 'semi', value: metrics.evidenceByMethod['semi'] ?? 0, tone: 'yellow' as Tone },
    { label: 'manual', value: metrics.evidenceByMethod['manual'] ?? 0, tone: 'orange' as Tone },
  ]
  const wipItems = Object.values(metrics.wipByState).map((value) => ({ label: value.label, value: value.count, tone: 'purple' as Tone }))
  const laneItems = metrics.byLane.map((item) => ({ ...item, tone: laneTone(item.label) }))
  const bucketTones: Tone[] = ['green', 'blue', 'yellow', 'red']
  const agingItems = metrics.aging.buckets.map((bucket, index) => ({ ...bucket, tone: bucketTones[index] ?? 'red' }))
  const highAging = metrics.attention.filter((item) => item.kind === 'aging').length

  const attentionLabels: Record<AttentionItem['kind'], { label: string; tone: Tone; icon: string }> = {
    blocked: { label: 'Bloqueado', tone: 'red', icon: '⛔' },
    aging: { label: 'Antigüedad', tone: 'orange', icon: '◷' },
    'missing-evidence': { label: 'Sin evidencia', tone: 'yellow', icon: '⋯' },
  }

  const status =
    metrics.totals.changes === 0
      ? banner('gray', '◍', 'Sin cambios activos', metrics.totals.archived > 0 ? `Todo el trabajo está archivado (${metrics.totals.archived}).` : 'Aún no hay trabajo en curso.')
      : metrics.totals.errors === 0 && metrics.attention.length === 0
        ? banner('green', '✓', 'Proceso al día', 'Sin bloqueos, sin evidencia pendiente y sin hallazgos bloqueantes.')
        : banner(
            metrics.totals.errors > 0 ? 'red' : 'orange',
            '△',
            `${metrics.attention.length + metrics.totals.errors} punto(s) a revisar`,
            `${metrics.totals.errors} errores · ${metrics.blocked.length} bloqueados · ${highAging} con antigüedad alta`,
          )

  const body = `
${status}
<div class="kpis">
  ${kpi(metrics.totals.changes, 'Cambios activos', { tone: 'blue', icon: '◫', hint: `${metrics.totals.archived} archivados` })}
  ${kpi(`${metrics.totals.tasksDone}/${metrics.totals.tasks}`, 'Tareas', { tone: 'purple', icon: '☑', hint: `${Math.round(tasksPercent)}% completado` })}
  ${kpi(`${metrics.totals.scenariosPassed}/${metrics.totals.scenarios}`, 'Evidencia', { tone: evidencePercent >= 100 ? 'green' : 'yellow', icon: '✓', hint: 'escenarios pass' })}
  ${kpi(metrics.totals.errors, 'Errores', { tone: metrics.totals.errors > 0 ? 'red' : 'green', icon: '✕', hint: 'bloqueantes' })}
  ${kpi(metrics.totals.warnings, 'Avisos', { tone: metrics.totals.warnings > 0 ? 'orange' : 'green', icon: '△', hint: 'revisables' })}
  ${kpi(metrics.aging.averageDays !== undefined ? `${metrics.aging.averageDays}d` : '—', 'Edad media', { tone: metrics.aging.averageDays !== undefined && metrics.aging.averageDays > 14 ? 'orange' : 'blue', icon: '◷', hint: metrics.aging.oldest ? `más antiguo: ${metrics.aging.oldest.slug} (${metrics.aging.oldest.ageDays}d)` : 'sin datos' })}
</div>
<div class="grid-2">
  <section class="section">
    <div class="section-head"><h2>Evidencia</h2><span class="sub">escenarios verificados</span></div>
    <div class="section-body">
      <div class="donut">
        ${donut(evidencePercent, `${Math.round(evidencePercent)}%`, 'evidencia', evidencePercent >= 100 ? 'green' : evidencePercent > 0 ? 'yellow' : 'red')}
        <div class="legend">
          <span class="legend-item" style="--tone:${tone('green')}"><i></i><b>${metrics.totals.scenariosPassed}</b> verificados</span>
          <span class="legend-item" style="--tone:${tone('orange')}"><i></i><b>${Math.max(0, metrics.totals.scenarios - metrics.totals.scenariosPassed)}</b> pendientes</span>
          <div class="mini-progress">
            <span class="mp-label">Tareas del workspace</span>
            ${progressBar(tasksPercent, 'purple')}
            <span class="mono muted">${metrics.totals.tasksDone}/${metrics.totals.tasks}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Archivados por mes</h2><span class="sub">throughput del proceso</span></div>
    <div class="section-body">${throughput.length > 0 ? bars(throughput.map(([month, count]) => ({ label: month, value: count, tone: 'green' as Tone }))) : '<div class="empty">Todavía no hay cambios archivados.</div>'}</div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Antigüedad del trabajo en curso</h2><span class="sub">cambios activos por días desde su creación</span></div>
    <div class="section-body">
      ${barList(agingItems)}
      ${metrics.aging.oldest ? `<div class="callout-line">◷ El más antiguo: <b>${escapeHtml(metrics.aging.oldest.slug)}</b> con ${metrics.aging.oldest.ageDays} días.</div>` : ''}
    </div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Distribución por carril</h2><span class="sub">fix · standard · full</span></div>
    <div class="section-body">${laneItems.length > 0 ? barList(laneItems) : '<div class="empty">Sin cambios activos.</div>'}</div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Evidencia por método</h2><span class="sub">preferencia: ejecutable &gt; automático &gt; semi &gt; manual</span></div>
    <div class="section-body">${barList(methodItems)}</div>
  </section>
  <section class="section">
    <div class="section-head"><h2>WIP por estado</h2><span class="sub">¿dónde está el trabajo?</span></div>
    <div class="section-body">${wipItems.length > 0 ? barList(wipItems) : '<div class="empty">Sin cambios activos.</div>'}</div>
  </section>
</div>
${
  metrics.attention.length > 0
    ? `<section class="section"><div class="section-head"><h2>Necesita atención</h2><span class="sub">ordenado por prioridad</span></div><div class="section-body"><div class="attention-grid">${metrics.attention
        .map(
          (item) =>
            `<div class="attention-card" style="--tone:${tone(attentionLabels[item.kind].tone)}"><span class="a-icon">${attentionLabels[item.kind].icon}</span><div><b>${escapeHtml(item.slug)}</b><span class="a-label">${escapeHtml(attentionLabels[item.kind].label)}</span><div class="a-detail">${escapeHtml(item.detail)}</div></div></div>`,
        )
        .join('')}</div></div></section>`
    : ''
}
<section class="section">
  <div class="section-head"><h2>Cambios</h2><span class="sub">progreso, evidencia y antigüedad</span></div>
  <div class="section-body" style="padding:0">
    <table>
      <thead><tr><th>Cambio</th><th>Carril</th><th>Estado</th><th>Tareas</th><th>Evidencia</th><th>Err / Avisos</th><th>Edad</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7"><div class="empty">Sin cambios activos.</div></td></tr>'}</tbody>
    </table>
  </div>
</section>
<div class="legend-bar">
  <span class="legend-item" style="--tone:${tone('gray')}"><i></i>WIP = cambios activos por estado</span>
  <span class="legend-item" style="--tone:${tone('gray')}"><i></i>Throughput = cambios archivados por mes</span>
  <span class="legend-item" style="--tone:${tone('gray')}"><i></i>Edad = días desde la creación del cambio</span>
</div>`

  return panelPage({
    kind: 'métricas',
    title: `Salud del proceso — ${metrics.project}`,
    subtitle: 'todo local y determinista: nada sale de tu máquina',
    heroRight: donut(evidencePercent, `${Math.round(evidencePercent)}%`, 'evidencia', evidencePercent >= 100 ? 'green' : evidencePercent > 0 ? 'yellow' : 'red'),
    body,
    footer: `Generado: ${metrics.generatedAt}`,
  })
}
