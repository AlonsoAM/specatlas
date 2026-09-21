export const TONES = {
  blue: 'var(--vscode-charts-blue, #3794ff)',
  green: 'var(--vscode-charts-green, #89d185)',
  orange: 'var(--vscode-charts-orange, #d18616)',
  red: 'var(--vscode-charts-red, #f14c4c)',
  purple: 'var(--vscode-charts-purple, #b180d7)',
  yellow: 'var(--vscode-charts-yellow, #cca700)',
  gray: 'var(--vscode-descriptionForeground, #8a8a8a)',
} as const

export type Tone = keyof typeof TONES

export const STATE_TONES: Record<string, Tone> = {
  draft: 'gray',
  paused: 'yellow',
  spec_draft: 'orange',
  awaiting_mockups: 'purple',
  awaiting_approval: 'purple',
  approved: 'blue',
  planned: 'blue',
  building: 'blue',
  built: 'yellow',
  verified: 'green',
  reviewed: 'green',
  ready: 'green',
  archived: 'gray',
}

export function panelStyles(): string {
  return `
:root {
  --atlas-radius: 12px;
  --atlas-radius-sm: 8px;
  --atlas-shadow: 0 1px 2px rgba(0,0,0,.14), 0 6px 18px rgba(0,0,0,.10);
  --atlas-shadow-soft: 0 1px 2px rgba(0,0,0,.08);
  --atlas-gap: 14px;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin: 0; background: var(--atlas-bg); color: var(--atlas-ink); font: 13px/1.55 var(--atlas-font-sans); }
.shell { max-width: 1280px; margin: 0 auto; padding: 22px 22px 70px; }

.hero {
  position: relative;
  border: 1px solid var(--atlas-line);
  border-radius: var(--atlas-radius);
  padding: 20px 22px;
  margin-bottom: 0;
  overflow: hidden;
  background:
    radial-gradient(1100px 220px at 0% -40%, color-mix(in srgb, ${TONES.blue} 22%, transparent), transparent),
    radial-gradient(900px 200px at 100% -60%, color-mix(in srgb, ${TONES.purple} 20%, transparent), transparent),
    var(--atlas-card);
  box-shadow: var(--atlas-shadow);
  display: flex; gap: 18px; align-items: center; justify-content: space-between; flex-wrap: wrap;
  border-bottom-left-radius: 0; border-bottom-right-radius: 0;
}
.hero-left { display: flex; align-items: center; gap: 16px; }
.brand-mark { color: var(--atlas-accent); flex: 0 0 auto; filter: drop-shadow(0 3px 10px color-mix(in srgb, var(--atlas-accent) 30%, transparent)); }
.eyebrow { margin: 0 0 4px; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--atlas-muted); }
.eyebrow strong { color: var(--atlas-accent); font-weight: 600; letter-spacing: .12em; }
.hero h1 { margin: 0; font-size: 24px; letter-spacing: -.01em; }
.hero .subtitle { margin: 6px 0 0; color: var(--atlas-muted); max-width: 80ch; }
.hero-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.panel-tabs { display: flex; gap: 2px; padding: 8px 14px 0; border: 1px solid var(--atlas-line); border-top: 0; border-bottom: 0; background: var(--atlas-card); overflow-x: auto; }
.panel-tabs button {
  min-height: 40px; padding: 8px 14px; border: 1px solid transparent; border-bottom: 0; border-radius: 9px 9px 0 0;
  background: transparent; color: var(--atlas-muted); font: inherit; cursor: pointer; white-space: nowrap;
}
.panel-tabs button:hover { color: var(--atlas-ink); }
.panel-tabs button[aria-selected="true"] { background: var(--atlas-bg); border-color: var(--atlas-line); color: var(--atlas-ink); font-weight: 600; }
.panel-body { border: 1px solid var(--atlas-line); border-top: 0; border-radius: 0 0 var(--atlas-radius) var(--atlas-radius); background: var(--atlas-bg); padding: 18px 16px 26px; box-shadow: var(--atlas-shadow-soft); }

.status-banner { display: flex; gap: 12px; align-items: flex-start; border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent); background: color-mix(in srgb, var(--tone) 10%, transparent); border-radius: var(--atlas-radius); padding: 12px 16px; margin-bottom: 16px; box-shadow: var(--atlas-shadow-soft); }
.status-banner .sb-icon { font-size: 16px; color: var(--tone); line-height: 1.3; }
.status-banner strong { display: block; font-size: 13.5px; }
.status-banner .sb-text { color: var(--atlas-muted); font-size: 12.5px; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: var(--atlas-gap); margin: 0 0 18px; }
.kpi { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius); background: var(--atlas-card); padding: 12px 14px; box-shadow: var(--atlas-shadow-soft); position: relative; overflow: hidden; }
.kpi::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--tone, ${TONES.blue}); opacity: .85; }
.kpi .top { display: flex; align-items: center; gap: 8px; color: var(--atlas-muted); font-size: 12px; }
.kpi .ico { font-size: 13px; color: var(--tone, ${TONES.blue}); }
.kpi .val { font-size: 22px; font-weight: 700; letter-spacing: -.02em; margin-top: 2px; }
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
.pill.mono { font-family: var(--atlas-font-mono); }

table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; }
thead th { position: sticky; top: 0; z-index: 2; text-align: left; font-weight: 600; color: var(--atlas-muted); background: var(--atlas-card); padding: 8px 10px; border-bottom: 1px solid var(--atlas-line); text-transform: uppercase; font-size: 10.5px; letter-spacing: .08em; }
tbody td { padding: 8px 10px; border-bottom: 1px solid color-mix(in srgb, var(--atlas-line) 60%, transparent); vertical-align: middle; }
tbody tr:hover td { background: color-mix(in srgb, var(--atlas-accent) 5%, transparent); }
tr.row-group td { background: color-mix(in srgb, var(--atlas-line) 30%, transparent); font-weight: 600; border-bottom: 1px solid var(--atlas-line); }
tr.row-group:hover td { background: color-mix(in srgb, var(--atlas-line) 38%, transparent); }
tr.row-group.has-gap td { box-shadow: inset 3px 0 0 ${TONES.orange}; }
tr.row-gap td:first-child { box-shadow: inset 3px 0 0 ${TONES.red}; }
tr.row-gap td { background: color-mix(in srgb, ${TONES.red} 7%, transparent); }
.group-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
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
.empty .e-icon { display: block; font-size: 24px; margin-bottom: 8px; color: var(--atlas-muted); }

/* Flujo en vertical: una fase por fila, sin scroll horizontal */
.flow { display: flex; flex-direction: column; gap: 10px; }
.lane { display: flex; gap: 14px; align-items: stretch; border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); background: color-mix(in srgb, var(--atlas-line) 14%, transparent); padding: 10px 12px; }
.lane-rail { flex: 0 0 190px; display: flex; align-items: center; gap: 8px; padding-right: 12px; border-right: 1px solid var(--atlas-line); }
.lane-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--tone, ${TONES.gray}); flex: 0 0 auto; }
.lane-name { font-size: 11.5px; color: var(--atlas-muted); text-transform: uppercase; letter-spacing: .05em; line-height: 1.3; }
.lane-count { margin-left: auto; font-size: 11px; color: var(--atlas-ink); background: color-mix(in srgb, var(--tone, ${TONES.gray}) 20%, transparent); border-radius: 999px; padding: 2px 8px; }
.lane-body { flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 9px; align-content: start; }
.lane.empty { opacity: .75; }
.lane.empty .lane-body { display: flex; align-items: center; color: var(--atlas-muted); font-size: 12.5px; }
.ticket { background: var(--atlas-card); border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); padding: 10px 12px; box-shadow: var(--atlas-shadow-soft); }
.ticket h4 { margin: 0 0 4px; font-size: 13px; }
.ticket .t-next { margin: 4px 0 0; color: var(--atlas-muted); font-size: 11.5px; }
.ticket .t-next .mono { color: var(--atlas-ink); }
.chips { margin: 6px 0 2px; }
.banner { display: flex; gap: 6px; align-items: center; font-size: 11.5px; border-radius: var(--atlas-radius-sm); padding: 6px 8px; margin: 6px 0; }
.banner.warn { color: var(--atlas-warn, ${TONES.orange}); background: color-mix(in srgb, ${TONES.orange} 14%, transparent); border: 1px solid color-mix(in srgb, ${TONES.orange} 40%, transparent); }
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
.coverage-grid { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr); gap: 18px; align-items: center; }
.coverage-side h3 { margin: 0 0 10px; font-size: 11.5px; color: var(--atlas-muted); text-transform: uppercase; letter-spacing: .06em; }

.bars { display: flex; align-items: flex-end; gap: 10px; height: 130px; padding-top: 6px; }
.bar-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; min-width: 46px; height: 100%; }
.bar-col .bar { width: 26px; border-radius: 6px 6px 3px 3px; background: linear-gradient(180deg, color-mix(in srgb, var(--tone, ${TONES.blue}) 65%, transparent), var(--tone, ${TONES.blue})); }
.bar-col .v { font-size: 11px; font-weight: 700; }
.bar-col .k { font-size: 10.5px; color: var(--atlas-muted); white-space: nowrap; }
.bar-list { display: flex; flex-direction: column; gap: 8px; }
.bar-row { display: grid; grid-template-columns: 110px 1fr 34px; gap: 10px; align-items: center; font-size: 12px; }
.bar-row .track { height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--atlas-line) 70%, transparent); overflow: hidden; }
.bar-row .fill { display: block; height: 100%; border-radius: 999px; background: var(--tone, ${TONES.blue}); }
.bar-row .n { text-align: right; color: var(--atlas-muted); font-variant-numeric: tabular-nums; }
.mini-progress { margin-top: 12px; min-width: 190px; }
.mini-progress .mp-label { display: block; font-size: 11.5px; color: var(--atlas-muted); margin-bottom: 2px; }
.attention-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.attention-card { display: flex; gap: 10px; border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent); background: color-mix(in srgb, var(--tone) 9%, transparent); border-radius: var(--atlas-radius-sm); padding: 10px 12px; }
.attention-card .a-icon { color: var(--tone); font-size: 15px; }
.attention-card .a-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .07em; color: var(--tone); margin-left: 8px; }
.attention-card .a-detail { color: var(--atlas-muted); font-size: 12px; margin-top: 2px; }
.callout-line { margin-top: 10px; color: var(--atlas-muted); font-size: 12.5px; border-left: 3px solid var(--atlas-accent); padding-left: 10px; }
.change-list { display: flex; flex-direction: column; gap: 10px; }
.change-card { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); background: color-mix(in srgb, var(--atlas-line) 12%, transparent); padding: 11px 12px; display: flex; flex-direction: column; gap: 8px; }
.change-card header { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.change-card h4 { margin: 0; font-size: 13.5px; }
.change-card .cc-next { color: var(--atlas-muted); font-size: 12.5px; margin: 0; }
.change-card .cc-next .mono { color: var(--atlas-ink); }
.change-card footer { display: flex; gap: 8px; flex-wrap: wrap; }
.fix-list { display: flex; flex-direction: column; gap: 8px; }
.fix-item { display: flex; align-items: center; gap: 10px; border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); background: var(--atlas-card); padding: 9px 11px; flex-wrap: wrap; }
.fix-item .f-date { font-family: var(--atlas-font-mono); font-size: 11.5px; color: var(--atlas-muted); }
.fix-item .f-slug { font-weight: 600; }
.fix-item .f-meta { margin-left: auto; display: flex; gap: 6px; align-items: center; }

.filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 16px 0; }
.filters input[type="search"] { flex: 1 1 220px; min-width: 170px; background: var(--vscode-input-background, #3c3c3c); color: var(--vscode-input-foreground, #ccc); border: 1px solid var(--vscode-input-border, transparent); border-radius: 6px; padding: 5px 10px; font: inherit; }
.filters select { background: var(--vscode-dropdown-background, #3c3c3c); color: var(--vscode-dropdown-foreground, #ccc); border: 1px solid var(--vscode-dropdown-border, transparent); border-radius: 6px; padding: 5px 8px; font: inherit; }
.filters .fcount { margin-left: auto; color: var(--atlas-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.filters .fclear { background: transparent; color: var(--atlas-muted); border: 1px solid color-mix(in srgb, var(--atlas-line) 80%, transparent); border-radius: 6px; padding: 4px 10px; font: inherit; cursor: pointer; }
.filters .fclear:hover { color: var(--atlas-ink); border-color: var(--atlas-ink); }
mark.hit { background: color-mix(in srgb, var(--vscode-charts-yellow, #cca700) 45%, transparent); color: var(--atlas-ink); border-radius: 3px; padding: 0 1px; }
tbody tr[hidden], article.ticket[hidden] { display: none; }

/* Documentos */
.doc-layout { display: grid; grid-template-columns: 280px 1fr; gap: 14px; align-items: start; }
.doc-list { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); background: color-mix(in srgb, var(--atlas-line) 12%, transparent); overflow: hidden; }
.doc-item { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-bottom: 1px solid var(--atlas-line); color: var(--atlas-muted); cursor: pointer; min-height: 44px; background: transparent; border-left: 0; border-right: 0; border-top: 0; width: 100%; text-align: left; font: inherit; border-radius: 0; }
.doc-item:last-child { border-bottom: 0; }
.doc-item:hover { background: color-mix(in srgb, var(--atlas-accent) 8%, transparent); border-color: var(--atlas-line); color: var(--atlas-muted); }
.doc-item.sel { background: color-mix(in srgb, var(--atlas-accent) 16%, transparent); color: var(--atlas-ink); }
.doc-item .d-name { font-weight: 600; }
.doc-item .d-sub { font-size: 11px; color: var(--atlas-muted); }
.doc-badge { margin-left: auto; font-size: 11px; }
.doc-view { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); background: var(--atlas-card); min-height: 360px; }
.doc-view-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--atlas-line); background: color-mix(in srgb, var(--atlas-line) 18%, transparent); flex-wrap: wrap; }
.doc-view-head h3 { margin: 0; font-size: 13.5px; }
.doc-view-body { padding: 16px 18px; max-width: 860px; }
.doc-view-body img { max-width: 100%; }
/* Tipografía del documento (ámbito propio, no toca al panel) */
.doc-view-body .atlas-doc { font: 14px/1.65 var(--atlas-font-sans); color: var(--atlas-ink); max-width: none; margin: 0; padding: 0; }
.doc-view-body .atlas-doc h1 { font-size: 21px; margin: .1em 0 .7em; border-bottom: 1px solid var(--atlas-line); padding-bottom: 8px; }
.doc-view-body .atlas-doc h2 { font-size: 17px; margin: 1.3em 0 .5em; }
.doc-view-body .atlas-doc h3 { font-size: 15px; margin: 1.1em 0 .45em; }
.doc-view-body .atlas-doc h4 { font-size: 13.5px; color: var(--atlas-muted); margin: 1em 0 .4em; }
.doc-view-body .atlas-doc p { margin: .55em 0; }
.doc-view-body .atlas-doc ul, .doc-view-body .atlas-doc ol { padding-left: 1.35em; margin: .5em 0; }
.doc-view-body .atlas-doc li { margin: .25em 0; }
.doc-view-body .atlas-doc a { color: var(--atlas-accent); }
.doc-view-body .atlas-doc code { font-family: var(--atlas-font-mono); font-size: 12.5px; background: color-mix(in srgb, var(--atlas-line) 55%, transparent); padding: 1px 5px; border-radius: 5px; white-space: normal; word-break: break-word; }
.doc-view-body .atlas-doc pre { background: var(--vscode-textCodeBlock-background, color-mix(in srgb, var(--atlas-line) 35%, transparent)); color: var(--vscode-editor-foreground, var(--atlas-ink)); padding: 12px 14px; border-radius: 10px; overflow: auto; font-size: 12.5px; line-height: 1.55; }
.doc-view-body .atlas-doc pre code { background: transparent; padding: 0; }
.doc-view-body .atlas-doc table { width: 100%; font-size: 13px; margin: .9em 0; }
.doc-view-body .atlas-doc th, .doc-view-body .atlas-doc td { border: 1px solid var(--atlas-line); padding: 7px 10px; text-align: left; vertical-align: top; }
.doc-view-body .atlas-doc th { background: color-mix(in srgb, var(--atlas-line) 25%, transparent); }
.doc-view-body .atlas-doc blockquote, .doc-view-body .atlas-doc .callout { border-left: 4px solid var(--atlas-accent); background: color-mix(in srgb, var(--atlas-accent) 8%, transparent); margin: .9em 0; padding: 9px 12px; border-radius: 8px; }
.doc-view-body .atlas-doc hr { border: 0; border-top: 1px solid var(--atlas-line); margin: 1.4em 0; }
.doc-view-body .atlas-doc ul.checklist { list-style: none; padding-left: .2em; margin: .3em 0; }
.doc-view-body .atlas-doc li.task-item { border: 0; background: transparent; border-radius: 0; padding: 3px 0; margin: .2em 0; }
.doc-view-body .atlas-doc li.task-item.done { opacity: .7; }
.doc-view-body .atlas-doc .task-box { font-size: 14px; margin-right: 6px; }
.doc-view-body .atlas-doc .task-title { font-weight: 600; }
.doc-view-body .atlas-doc .task-meta { display: block; margin: 2px 0 7px 24px; font-size: 11.5px; color: var(--atlas-muted); }
.doc-view-body .atlas-doc .task-flag { font-family: var(--atlas-font-mono); font-size: 11.5px; color: var(--atlas-muted); margin-right: 10px; }
.doc-view-body .atlas-doc .meta-line { display: flex; flex-wrap: wrap; gap: 6px; margin: .2em 0 .35em; }
.doc-view-body .atlas-doc .meta-chip { font-family: var(--atlas-font-mono); font-size: 11.5px; color: var(--atlas-muted); border: 1px solid color-mix(in srgb, var(--atlas-line) 75%, transparent); background: color-mix(in srgb, var(--atlas-line) 18%, transparent); border-radius: 999px; padding: 2px 9px; }
.doc-view-body .atlas-doc .meta-chip b { color: var(--atlas-ink); font-weight: 600; }
/* Diagramas mermaid dentro del panel */
.mermaid-block { margin: 1em 0; }
.diagram-tools { display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 6px; }
.diagram-tools button { background: transparent; color: var(--atlas-muted); border: 1px solid color-mix(in srgb, var(--atlas-line) 75%, transparent); border-radius: 6px; padding: 2px 9px; font: inherit; font-size: 11.5px; line-height: 1.4; cursor: pointer; min-width: 30px; }
.diagram-tools button:hover { color: var(--atlas-ink); border-color: var(--atlas-ink); }
.diagram-tools button[data-diagram-fit].active { color: var(--atlas-ink); border-color: var(--atlas-accent); }
.diagram-tools [data-diagram-level] { min-width: 52px; font-variant-numeric: tabular-nums; }
.diagram-canvas { display: block; overflow: auto; min-height: 140px; border: 1px solid color-mix(in srgb, var(--atlas-line) 60%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--atlas-card) 60%, transparent); padding: 12px; cursor: grab; }
.diagram-canvas.panning { cursor: grabbing; user-select: none; }
.diagram-canvas pre.mermaid { margin: 0; padding: 0; background: transparent; overflow: visible; }
.diagram-canvas svg { display: block; margin: 0 auto; }
.diagram-canvas[data-fit="off"] svg { max-width: none; margin: 0; }
.mermaid-block.diagram-fullscreen { position: fixed; inset: 0; z-index: 999; margin: 0; padding: 12px; background: var(--atlas-bg); display: flex; flex-direction: column; }
.mermaid-block.diagram-fullscreen .diagram-canvas { flex: 1; }
.mock-thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.mockup-gallery { display: grid; grid-template-columns: 1fr; gap: 16px; }
.mockup-gallery .shot { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); overflow: hidden; background: var(--atlas-card); margin: 0; }
.mockup-gallery .shot figcaption { display: flex; align-items: baseline; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--atlas-line); font-size: 12.5px; }
.mockup-gallery .shot figcaption span { font-size: 11px; }
.mockup-gallery .shot iframe { width: 100%; height: 520px; border: 0; background: #ffffff; }
.doc-frame { width: 100%; height: 680px; border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); background: #ffffff; }
.mockup-viewer { display: flex; flex-direction: column; gap: 10px; }
.mockup-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.mockup-tab { min-height: 28px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--atlas-line); background: transparent; color: var(--atlas-muted); font: inherit; font-size: 11.5px; cursor: pointer; }
.mockup-tab:hover { color: var(--atlas-ink); border-color: var(--atlas-accent); }
.mockup-tab.sel { background: color-mix(in srgb, var(--atlas-accent) 18%, transparent); color: var(--atlas-ink); border-color: var(--atlas-accent); }
.mockup-frame { height: 620px; }
.mockup-heading { margin: 18px 0 8px; font-size: 14px; }
.doc-view-body .atlas-doc .evidence-card { border: 1px solid var(--atlas-line); border-left: 4px solid var(--atlas-ok); border-radius: 10px; background: color-mix(in srgb, var(--atlas-line) 10%, transparent); padding: 10px 14px; margin: .6em 0; }
.doc-view-body .atlas-doc .ec-result { font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--atlas-ok); }
@media (min-width: 1100px) { .mockup-gallery { grid-template-columns: 1fr 1fr; } }
.thumb { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); overflow: hidden; background: color-mix(in srgb, var(--atlas-line) 12%, transparent); }
.thumb-frame { height: 110px; border-bottom: 1px solid var(--atlas-line); padding: 9px; display: flex; flex-direction: column; gap: 6px; background: var(--atlas-card); }
.thumb-frame .tf-bar { height: 8px; border-radius: 4px; background: color-mix(in srgb, var(--atlas-line) 80%, transparent); width: 60%; }
.thumb-frame .tf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; flex: 1; }
.thumb-frame .tf-cell { border-radius: 4px; background: color-mix(in srgb, var(--atlas-accent) 12%, transparent); border: 1px solid var(--atlas-line); }
.thumb .t-meta { padding: 9px 10px; }
.thumb .t-meta b { display: block; font-size: 12.5px; }
.thumb .t-meta span { font-size: 11px; color: var(--atlas-muted); }
.seg-inline { display: inline-flex; border: 1px solid var(--atlas-line); border-radius: 999px; overflow: hidden; background: var(--atlas-card); }
.seg-inline button { min-height: 30px; padding: 0 12px; border: 0; background: transparent; color: var(--atlas-muted); cursor: pointer; font: inherit; font-size: 12px; }
.seg-inline button[aria-pressed="true"] { background: color-mix(in srgb, var(--atlas-accent) 20%, transparent); color: var(--atlas-ink); }

/* Acciones: flujo secuencial por carril */
.flow-actions { display: flex; flex-direction: column; gap: 14px; }
.starter { border: 1px solid color-mix(in srgb, var(--atlas-accent) 35%, var(--atlas-line)); border-radius: var(--atlas-radius-sm); background: color-mix(in srgb, var(--atlas-accent) 6%, transparent); padding: 12px 14px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.starter h4 { margin: 0; font-size: 13.5px; }
.starter p { margin: 4px 0 0; color: var(--atlas-muted); font-size: 12.5px; }
.starter .s-lanes { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.lane-picker { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.lane-legend { display: flex; flex-wrap: wrap; gap: 10px; color: var(--atlas-muted); font-size: 11.5px; }
.lane-title { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; border: 1px dashed color-mix(in srgb, var(--atlas-accent) 40%, var(--atlas-line)); border-radius: var(--atlas-radius-sm); background: color-mix(in srgb, var(--atlas-accent) 6%, transparent); padding: 8px 12px; margin-bottom: 12px; }
.lane-title b { font-size: 12.5px; }
.lane-title .lt-meta { color: var(--atlas-muted); font-size: 11.5px; }
.stepper { display: flex; flex-direction: column; }
.step { display: grid; grid-template-columns: 36px 1fr; gap: 12px; position: relative; padding-bottom: 12px; }
.step::before { content: ""; position: absolute; left: 17px; top: 36px; bottom: 0; width: 2px; background: var(--atlas-line); }
.step:last-child { padding-bottom: 0; }
.step:last-child::before { display: none; }
.step.done::before { background: color-mix(in srgb, ${TONES.green} 55%, var(--atlas-line)); }
.step-num { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--atlas-card); border: 1px solid var(--atlas-line); font-size: 12.5px; color: var(--atlas-muted); z-index: 1; }
.step.done .step-num { background: color-mix(in srgb, ${TONES.green} 20%, transparent); border-color: color-mix(in srgb, ${TONES.green} 45%, var(--atlas-line)); color: var(--atlas-ink); }
.step.now .step-num { background: var(--atlas-accent); border-color: transparent; color: var(--vscode-button-foreground, #fff); box-shadow: 0 0 0 4px color-mix(in srgb, var(--atlas-accent) 20%, transparent); }
.step.skipped .step-num { opacity: .55; }
.step-body { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); background: color-mix(in srgb, var(--atlas-line) 12%, transparent); padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; }
.step.now .step-body { border-color: color-mix(in srgb, var(--atlas-accent) 45%, var(--atlas-line)); background: color-mix(in srgb, var(--atlas-accent) 7%, transparent); }
.step-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.step-head h4 { margin: 0; font-size: 13px; }
.step-head .spacer { flex: 1; }
.step-body p { margin: 0; color: var(--atlas-muted); font-size: 12.5px; }
.step-foot { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.step-note { border-left: 3px solid var(--tone, ${TONES.gray}); padding: 2px 0 2px 9px; color: var(--atlas-muted); font-size: 11.5px; }
.actor { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--atlas-line); color: var(--atlas-muted); }
.actor.agent { border-color: color-mix(in srgb, ${TONES.purple} 45%, var(--atlas-line)); color: ${TONES.purple}; background: color-mix(in srgb, ${TONES.purple} 12%, transparent); }
.actor.human { border-color: color-mix(in srgb, ${TONES.yellow} 45%, var(--atlas-line)); color: ${TONES.yellow}; background: color-mix(in srgb, ${TONES.yellow} 12%, transparent); }
.actor.local { border-color: color-mix(in srgb, ${TONES.blue} 40%, var(--atlas-line)); color: ${TONES.blue}; background: color-mix(in srgb, ${TONES.blue} 10%, transparent); }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }
.action-card { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius-sm); background: color-mix(in srgb, var(--atlas-line) 12%, transparent); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.action-card header { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.action-card h4 { margin: 0; font-size: 13.5px; }
.action-card p { margin: 0; color: var(--atlas-muted); font-size: 12.5px; }
.action-card footer { margin-top: auto; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.dialog { border: 1px solid var(--atlas-line); border-radius: var(--atlas-radius); background: var(--atlas-card); box-shadow: var(--atlas-shadow); padding: 16px; max-width: 480px; }
.dialog h4 { margin: 0 0 6px; font-size: 14px; }
.dialog .d-body { color: var(--atlas-muted); font-size: 12.5px; display: flex; flex-direction: column; gap: 10px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 11.5px; color: var(--atlas-muted); text-transform: uppercase; letter-spacing: .05em; }
.field input { min-height: 34px; border: 1px solid var(--vscode-input-border, var(--atlas-line)); border-radius: 8px; background: var(--vscode-input-background, var(--atlas-card)); color: var(--vscode-input-foreground, var(--atlas-ink)); padding: 0 11px; font: inherit; }
.dialog footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
.toast { display: flex; gap: 10px; align-items: flex-start; border: 1px solid color-mix(in srgb, var(--tone, ${TONES.blue}) 40%, var(--atlas-line)); border-radius: var(--atlas-radius-sm); background: color-mix(in srgb, var(--tone, ${TONES.blue}) 10%, transparent); padding: 10px 12px; font-size: 12.5px; }
.note { border-left: 3px solid var(--tone, ${TONES.blue}); padding: 2px 0 2px 10px; color: var(--atlas-muted); font-size: 12.5px; }
.term { border: 1px solid var(--atlas-line); border-radius: 8px; overflow: hidden; background: var(--vscode-terminal-background, #0b0e15); }
.term-bar { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--vscode-terminal-background, #121722); border-bottom: 1px solid var(--atlas-line); color: var(--atlas-muted); font-size: 11px; font-family: var(--atlas-font-mono); }
.term-bar .t-live { margin-left: auto; color: ${TONES.green}; }
.term-body { margin: 0; padding: 11px 12px; font-family: var(--atlas-font-mono); font-size: 12px; line-height: 1.6; color: var(--vscode-terminal-foreground, #d7e0ee); white-space: pre-wrap; }
.term-body .t-cmd { color: ${TONES.blue}; }
.term-body .t-flag { color: ${TONES.orange}; }
.term-body .t-dim { color: var(--atlas-muted); }

.foot-note { color: var(--atlas-muted); font-size: 11.5px; display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.footer { margin-top: 18px; color: var(--atlas-muted); font-size: 11.5px; display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.footer .brand { letter-spacing: .14em; text-transform: uppercase; font-size: 10.5px; }

a { color: var(--atlas-accent); text-decoration: none; border-bottom: 1px dotted color-mix(in srgb, var(--atlas-accent) 50%, transparent); }
a:hover { border-bottom-style: solid; }
button.btn, .btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 30px; padding: 0 12px; border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--atlas-line) 85%, var(--atlas-ink)); background: color-mix(in srgb, var(--atlas-ink) 7%, transparent);
  color: var(--atlas-ink); cursor: pointer; font: inherit; font-size: 12px; white-space: nowrap;
}
.btn:hover { border-color: var(--atlas-accent); color: var(--atlas-accent); }
.btn.primary { background: var(--atlas-accent); border-color: transparent; color: var(--vscode-button-foreground, #ffffff); font-weight: 600; }
.btn.primary:hover { background: color-mix(in srgb, var(--atlas-accent) 86%, #000000); color: var(--vscode-button-foreground, #ffffff); }
.btn.ghost { background: transparent; }
.btn.ghost:hover { border-color: var(--atlas-accent); color: var(--atlas-accent); }
.btn.sm { min-height: 28px; padding: 0 10px; font-size: 11.5px; }
.btn[disabled] { opacity: .55; cursor: not-allowed; }
.btn[disabled]:hover { border-color: color-mix(in srgb, var(--atlas-line) 85%, var(--atlas-ink)); color: var(--atlas-ink); }

@container (max-width: 820px) {
  .coverage-grid { grid-template-columns: 1fr; }
  .doc-layout { grid-template-columns: 1fr; }
}
@container (max-width: 560px) {
  .lane { grid-template-columns: 1fr; }
  .lane-rail { border-right: 0; border-bottom: 1px solid var(--atlas-line); padding: 0 0 8px; }
  .lane-body { grid-template-columns: 1fr; }
}
`
}
