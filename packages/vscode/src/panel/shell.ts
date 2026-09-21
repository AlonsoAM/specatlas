import { DIAGRAM_TOOLS_SCRIPT, renderStyles } from '@specatlas/render'
import { escapeHtml } from '../logic.js'
import { panelStyles } from './styles.js'

export interface PanelSection {
  id: string
  label: string
  html: string
  script?: string
}

export interface PanelPageInput {
  project: string
  title: string
  subtitle: string
  heroRight?: string
  sections: PanelSection[]
  active: string
  nonce: string
  mermaid?: { uri: string; cspSource: string }
}

function brandMark(size = 36): string {
  return `<svg class="brand-mark" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 2.4 21.6 12 12 21.6 2.4 12z" opacity=".5"></path>
  <path d="M7.2 14.8 9.8 11l2.6 2.1 4.2-5.8"></path>
  <circle cx="7.2" cy="14.8" r="1.5" fill="currentColor" stroke="none"></circle>
  <circle cx="16.6" cy="7.3" r="1.5" fill="currentColor" stroke="none"></circle>
  <circle cx="12.4" cy="13.1" r="1.2" fill="currentColor" stroke="none" opacity=".75"></circle>
</svg>`
}

const STATE_SCRIPT = `
(function () {
  var api = acquireVsCodeApi();
  var state = api.getState() || {};
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-section-tab]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-section-panel]'));
  function show(id) {
    panels.forEach(function (panel) { panel.hidden = panel.getAttribute('data-section-panel') !== id; });
    tabs.forEach(function (tab) { tab.setAttribute('aria-selected', String(tab.getAttribute('data-section-tab') === id)); });
    state.section = id;
    api.setState(state);
    if (window.__atlasRenderMermaid) window.__atlasRenderMermaid(document.querySelector('[data-section-panel="' + id + '"]'));
  }
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { show(tab.getAttribute('data-section-tab')); });
  });
  var filters = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  state.filters = state.filters || {};
  filters.forEach(function (el) {
    var id = el.getAttribute('data-filter');
    if (state.filters[id] !== undefined) el.value = state.filters[id];
    el.addEventListener('input', function () { state.filters[id] = el.value; api.setState(state); });
  });
  var selectors = Array.prototype.slice.call(document.querySelectorAll('[data-selector]'));
  selectors.forEach(function (el) {
    var id = el.getAttribute('data-selector');
    el.addEventListener('click', function () {
      state.selectors = state.selectors || {};
      state.selectors[id] = el.getAttribute('data-value');
      api.setState(state);
    });
  });
  if (state.section) show(state.section);
  else show(document.body.getAttribute('data-active') || tabs[0].getAttribute('data-section-tab'));
  window.__atlasState = state;
  window.addEventListener('message', function (event) {
    var message = event.data;
    if (message && message.type === 'show-section' && message.value) show(message.value);
    if (message && message.type === 'mockup-html') {
      var frame = document.querySelector('#docs .mockup-frame');
      if (frame) frame.srcdoc = decodeBase64(message.data || '');
    }
  });
  function decodeBase64(data) {
    try {
      var binary = atob(data);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    } catch (error) {
      return '';
    }
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-srcdoc]'), function (el) {
    el.srcdoc = decodeBase64(el.getAttribute('data-srcdoc') || '');
  });
  filters.forEach(function (el) { if (el.value) el.dispatchEvent(new Event('input')); });
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-message]') : null;
    if (!target) return;
    event.preventDefault();
    api.postMessage({ type: target.getAttribute('data-message'), value: target.getAttribute('data-value') || undefined, step: target.getAttribute('data-step') || undefined });
  });
})();
`

export function panelPage(input: PanelPageInput): string {
  const tabs = input.sections
    .map(
      (section) =>
        `<button type="button" role="tab" data-section-tab="${escapeHtml(section.id)}" aria-selected="${section.id === input.active}" aria-controls="sec-${escapeHtml(section.id)}">${escapeHtml(section.label)}</button>`,
    )
    .join('')
  const panels = input.sections
    .map(
      (section) =>
        `<section id="sec-${escapeHtml(section.id)}" data-section-panel="${escapeHtml(section.id)}" role="tabpanel"${section.id === input.active ? '' : ' hidden'}>${section.html}</section>`,
    )
    .join('\n')
  const scripts = input.sections.map((section) => section.script ?? '').join('\n')
  const csp = input.mermaid
    ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: ${input.mermaid.cspSource}; font-src data:; script-src 'nonce-${input.nonce}' ${input.mermaid.cspSource}; frame-src ${input.mermaid.cspSource};">\n`
    : `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'nonce-${input.nonce}';">\n`
  const mermaidScript = input.mermaid
    ? `<script nonce="${input.nonce}" src="${input.mermaid.uri}"></script>
<script nonce="${input.nonce}">
(function () {
  if (!window.mermaid) return;
  var dark = !document.body.classList.contains('vscode-light');
  mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', themeVariables: dark ? { fontSize: '13px', lineColor: '#64748b', primaryColor: '#1e293b', primaryTextColor: '#e2e8f0', primaryBorderColor: '#475569', tertiaryColor: '#0f172a' } : { fontSize: '13px' } });
  window.__atlasRenderMermaid = function (scope) {
    if (!scope || scope.hidden) return;
    function broken(node) {
      var svg = node.querySelector('svg');
      if (!svg) return !node.getAttribute('data-processed');
      var viewBox = svg.getAttribute('viewBox') || '';
      var style = svg.getAttribute('style') || '';
      var text = svg.textContent || '';
      return viewBox === '-8 -8 16 16' || /width:\s*1px/.test(style) || text.indexOf('Syntax error') >= 0;
    }
    var pending = [];
    Array.prototype.forEach.call(scope.querySelectorAll('pre.mermaid'), function (node) {
      if (node.offsetParent === null) return;
      if (!broken(node)) return;
      var source = node.getAttribute('data-source');
      if (source && node.getAttribute('data-processed')) node.textContent = source;
      if (!node.getAttribute('data-source')) node.setAttribute('data-source', node.textContent);
      node.removeAttribute('data-processed');
      pending.push(node);
    });
    if (pending.length > 0) {
      try {
        var result = mermaid.run({ nodes: pending });
        if (result && result.catch) result.catch(function (error) { try { console.error('SpecAtlas mermaid:', error); } catch (ignored) {} });
      } catch (error) {
        try { console.error('SpecAtlas mermaid:', error); } catch (ignored) {}
      }
    }
  };
${DIAGRAM_TOOLS_SCRIPT}
  window.__atlasRenderMermaid(document.querySelector('[data-section-panel="' + (document.body.getAttribute('data-active') || 'resumen') + '"]'));
  setTimeout(function () { window.__atlasRenderMermaid(document.querySelector('[data-section-panel="documentos"]')); }, 700);
})();
</script>
`
    : ''
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}<title>SpecAtlas — Panel principal</title>
<style>${renderStyles({ theme: 'vscode' })}${panelStyles()}</style>
</head>
<body data-active="${escapeHtml(input.active)}">
<div class="shell">
  <header class="hero">
    <div class="hero-left">
      ${brandMark()}
      <div>
        <p class="eyebrow">SpecAtlas · <strong>panel principal</strong></p>
        <h1>${escapeHtml(input.title)}</h1>
        <p class="subtitle">${escapeHtml(input.subtitle)}</p>
      </div>
    </div>
    ${input.heroRight ? `<div class="hero-right">${input.heroRight}</div>` : ''}
  </header>
  <nav class="panel-tabs" role="tablist" aria-label="Secciones del panel principal">${tabs}</nav>
  <div class="panel-body">
${panels}
  </div>
  <div class="footer"><span>${escapeHtml(input.project)}</span><span class="brand">SpecAtlas</span></div>
</div>
<script nonce="${input.nonce}">
${STATE_SCRIPT}
${scripts}
</script>
${mermaidScript}</body>
</html>
`
}

export function noticePage(input: { kind: string; title: string; message: string; action?: { label: string; command: string } }): string {
  const action = input.action
    ? `<p style="margin-top:14px"><a class="btn primary" href="command:${input.action.command}">${escapeHtml(input.action.label)}</a></p>`
    : ''
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${renderStyles({ theme: 'vscode' })}${panelStyles()}</style>
</head>
<body>
<div class="shell">
  <header class="hero">
    <div class="hero-left">
      ${brandMark()}
      <div>
        <p class="eyebrow">SpecAtlas · <strong>panel principal</strong></p>
        <h1>${escapeHtml(input.title)}</h1>
        <p class="subtitle">${escapeHtml(input.kind)}</p>
      </div>
    </div>
  </header>
  <div class="panel-body">
    <div class="empty" style="padding:34px 18px">
      <span class="e-icon" aria-hidden="true">◈</span>
      <strong>${escapeHtml(input.title)}</strong>
      <p>${escapeHtml(input.message)}</p>
      ${action}
    </div>
  </div>
</div>
</body>
</html>
`
}
