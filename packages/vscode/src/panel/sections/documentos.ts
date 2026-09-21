import { renderMarkdown } from '@specatlas/render'
import { escapeHtml, pillHtml } from '../html.js'
import type { PanelDocument, PanelModel } from '../model.js'

const LABELS: Record<string, string> = {
  proposal: 'Propuesta',
  spec: 'Especificación',
  clarify: 'Aclaraciones',
  plan: 'Plan técnico',
  tasks: 'Tareas',
  verify: 'Verificación',
  review: 'Revisión de código',
  'docs-tecnica': 'Documentación técnica',
  'docs-manual': 'Manual de usuario',
  fix: 'Fix',
  analyze: 'Análisis',
  presentation: 'Presentación para aprobar',
  mockup: 'Mockups',
}

const ORDER = ['proposal', 'spec', 'clarify', 'plan', 'tasks', 'verify', 'review', 'docs-tecnica', 'docs-manual', 'fix', 'presentation', 'mockup', 'analyze']

export interface DocumentosOptions {
  mermaidUri?: string
  nonce?: string
  resources?: { presentationBase64?: string; mockups?: Array<{ file: string; title: string; path: string; base64?: string }> }
}

const SCRIPT = `
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('#docs .doc-item'));
  var panes = Array.prototype.slice.call(document.querySelectorAll('#docs [data-doc-pane]'));
  function select(key) {
    items.forEach(function (item) { item.classList.toggle('sel', item.getAttribute('data-doc') === key); });
    panes.forEach(function (pane) { pane.hidden = pane.getAttribute('data-doc-pane') !== key; });
    var pane = panes.filter(function (item) { return item.getAttribute('data-doc-pane') === key; })[0];
    if (pane && window.__atlasRenderMermaid) window.__atlasRenderMermaid(pane);
    if (key === 'mockup' && pane) {
      var frame = pane.querySelector('.mockup-frame');
      var tab = pane.querySelector('.mockup-tab');
      if (frame && !frame.getAttribute('srcdoc') && tab) tab.click();
    }
  }
  items.forEach(function (item) {
    item.addEventListener('click', function () { select(item.getAttribute('data-doc')); });
  });
  Array.prototype.slice.call(document.querySelectorAll('#docs [data-goto-doc]')).forEach(function (link) {
    link.addEventListener('click', function () {
      var key = link.getAttribute('data-goto-doc');
      var target = items.filter(function (item) { return item.getAttribute('data-doc') === key; })[0];
      if (target) target.click(); else select(key);
    });
  });
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#docs .mockup-tab'));
  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (other) { other.classList.toggle('sel', other === tab); });
      if (index === 0 || !tab.getAttribute('data-loaded')) tab.setAttribute('data-loaded', '1');
    });
  });
  if (tabs[0]) tabs[0].classList.add('sel');
  var saved = window.__atlasState && window.__atlasState.selectors ? window.__atlasState.selectors.doc : undefined;
  if (saved && items.some(function (item) { return item.getAttribute('data-doc') === saved; })) select(saved);
  else {
    var first = items.filter(function (item) { return item.getAttribute('data-exists') === '1'; })[0] || items[0];
    if (first) select(first.getAttribute('data-doc'));
  }
})();
`

function keyOf(doc: PanelDocument): string {
  if (doc.kind !== 'docs') return doc.kind
  return /(^|[\\/])manual\./i.test(doc.path) ? 'docs-manual' : 'docs-tecnica'
}

function docItem(doc: PanelDocument, key: string): string {
  const badge = doc.exists ? pillHtml('✓', 'green') : pillHtml('ausente', 'gray')
  const sub =
    key === 'mockup'
      ? 'pantallas del contrato visual'
      : key === 'docs-tecnica' || key === 'docs-manual'
        ? 'texto fuente · HTML · PDF'
        : escapeHtml(doc.path.split(/[\\/]/).pop() ?? '')
  return `<button type="button" class="doc-item" data-doc="${escapeHtml(key)}" data-selector="doc" data-value="${escapeHtml(key)}" data-exists="${doc.exists ? '1' : '0'}">
  <span aria-hidden="true">◇</span>
  <span><span class="d-name">${escapeHtml(LABELS[key] ?? doc.label)}</span><br><span class="d-sub">${sub}</span></span>
  <span class="doc-badge">${badge}</span>
</button>`
}

function mockupViewer(resources: DocumentosOptions['resources']): string {
  const mockups = resources?.mockups ?? []
  if (mockups.length === 0) return ''
  const firstBase64 = mockups[0]?.base64
  return `<div class="banner warn" style="--tone:var(--vscode-charts-orange, #d18616)"><span aria-hidden="true">△</span><div><b>Mockup · no funcional</b><span class="sb-text">el HTML del mockup se muestra dentro del panel; sus controles interactivos no se ejecutan aquí (usa «Abrir visor de mockups»).</span></div></div>
<div class="mockup-viewer">
  <div class="mockup-tabs" role="tablist" aria-label="Pantallas del mockup">${mockups
    .map(
      (screen, index) =>
        `<button type="button" class="mockup-tab${index === 0 ? ' sel' : ''}" role="tab" data-message="mockup-html" data-value="${escapeHtml(screen.path)}" title="${escapeHtml(screen.title)}">${escapeHtml(screen.title)}</button>`,
    )
    .join('')}</div>
  <iframe class="doc-frame mockup-frame" title="Mockup del cambio"${firstBase64 ? ` data-srcdoc="${firstBase64}"` : ''}></iframe>
</div>`
}

function docPane(doc: PanelDocument, key: string, model: PanelModel, opts: DocumentosOptions): string {
  const label = LABELS[key] ?? doc.label
  if (key === 'mockup') {
    const change = model.change
    const screens = change?.files.find((file) => file.kind === 'mockup')?.screens ?? []
    const stale = change?.mockups.stale ? `<div class="banner warn">▲ mockups desactualizados respecto de la especificación: regenera y vuelve a aprobar</div>` : ''
    const declared = change?.mockups.decision === 'required' || (change?.mockups.screens ?? 0) > 0
    const mockups = opts.resources?.mockups ?? []
    const viewer =
      mockups.length > 0
        ? mockupViewer(opts.resources)
        : screens.length > 0
          ? `<div class="mock-thumbs">${screens
              .map(
                (screen) => `<div class="thumb"><div class="thumb-frame"><span class="tf-bar"></span><span class="tf-grid"><span class="tf-cell"></span><span class="tf-cell"></span><span class="tf-cell"></span><span class="tf-cell"></span><span class="tf-cell"></span><span class="tf-cell"></span></span></div><div class="t-meta"><b>${escapeHtml(screen.title)}</b><span>${escapeHtml(screen.file)}</span></div></div>`,
              )
              .join('')}</div>`
          : declared
            ? `<div class="empty">Los mockups están requeridos pero aún no existen: se generan con la acción «Mockups».</div>`
            : `<div class="empty">Este cambio no declara mockups.</div>`
    const open = change && screens.length > 0 ? `<a class="btn sm" href="command:specatlas.mockup.open?${encodeURIComponent(JSON.stringify([change.slug]))}">Abrir visor de mockups</a>` : ''
    return `<div data-doc-pane="${escapeHtml(key)}" hidden>
  <div class="doc-view"><div class="doc-view-head"><h3>Mockups</h3>${screens.length > 0 ? pillHtml(stale ? 'desactualizados' : 'al día', stale ? 'orange' : 'green', '✓') : ''}<span class="muted" style="font-size:11.5px">${screens.length} pantalla(s)</span><span style="margin-left:auto">${open}</span></div>
  <div class="doc-view-body" style="max-width:none">${stale}${viewer}</div></div>
</div>`
  }
  if (key === 'presentation' && opts.resources?.presentationBase64) {
    const openInEditor = `<a class="btn sm ghost" href="command:specatlas.openPreview?${encodeURIComponent(JSON.stringify([doc.path]))}">Abrir en el editor</a>`
    const screens = model.change?.files.find((file) => file.kind === 'mockup')?.screens ?? []
    // Los mockups NO se incrustan aquí: dentro de la presentación no se pintan bien. Se abren en su propio visor.
    const openMockups =
      model.change && screens.length > 0
        ? `<a class="btn sm" href="command:specatlas.mockup.open?${encodeURIComponent(JSON.stringify([model.change.slug]))}">Abrir visor de mockups</a>`
        : ''
    const mockupsNote =
      screens.length > 0
        ? `<div class="banner" style="margin-top:12px"><span aria-hidden="true">◈</span><div><b>Las ${screens.length} pantalla(s) del contrato visual se revisan en su propio visor</b><span class="sb-text">ahí se pintan a tamaño completo y con sus estados; dentro de la presentación solo se listan.</span></div><span style="margin-left:auto;display:flex;gap:6px">${openMockups}<button type="button" class="btn sm ghost" data-goto-doc="mockup">Ver en el panel</button></span></div>`
        : ''
    return `<div data-doc-pane="${escapeHtml(key)}" hidden>
  <div class="doc-view"><div class="doc-view-head"><h3>${escapeHtml(label)}</h3><span class="muted mono" style="font-size:11px">${escapeHtml(doc.path.split(/[\\/]/).slice(-2).join('/'))}</span><span style="margin-left:auto;display:flex;gap:6px">${openMockups}${openInEditor}</span></div>
  <div class="doc-view-body" style="max-width:none;padding:12px"><iframe class="doc-frame" data-srcdoc="${opts.resources.presentationBase64}" title="${escapeHtml(label)}"></iframe>${mockupsNote}</div></div>
</div>`
  }
  if (!doc.exists) {
    return `<div data-doc-pane="${escapeHtml(key)}" hidden>
  <div class="doc-view"><div class="doc-view-head"><h3>${escapeHtml(label)}</h3></div>
  <div class="doc-view-body"><div class="empty"><span class="e-icon" aria-hidden="true">◇</span><strong>Aún no existe</strong><p>Se genera con la acción del ciclo correspondiente; el panel lo indica y no muestra contenido de ejemplo.</p></div></div></div>
</div>`
  }
  const openInEditor = `<a class="btn sm ghost" href="command:specatlas.openPreview?${encodeURIComponent(JSON.stringify([doc.path]))}">Abrir en el editor</a>`
  const body = doc.markdown
    ? `<article class="atlas-doc">${renderMarkdown(doc.markdown, {
        theme: 'vscode',
        highlight: true,
        mermaid: opts.mermaidUri ? 'script' : 'code',
        nonce: opts.nonce,
        ...(opts.mermaidUri ? { mermaidScriptUri: opts.mermaidUri } : {}),
      })}</article>`
    : '<div class="empty">Este documento no se puede mostrar dentro del panel; ábrelo en el editor.</div>'
  return `<div data-doc-pane="${escapeHtml(key)}" hidden>
  <div class="doc-view"><div class="doc-view-head"><h3>${escapeHtml(label)}</h3><span class="muted mono" style="font-size:11px">${escapeHtml(doc.path.split(/[\\/]/).slice(-2).join('/'))}</span><span style="margin-left:auto">${openInEditor}</span></div>
  <div class="doc-view-body">${body}</div></div>
</div>`
}

export function documentosSection(model: PanelModel, opts: DocumentosOptions = {}): { html: string; script: string } {
  const change = model.change
  const seen = new Set<string>()
  const entries: Array<{ doc: PanelDocument; key: string }> = []
  for (const doc of model.documents) {
    const key = keyOf(doc)
    if (!ORDER.includes(key) || seen.has(key)) continue
    seen.add(key)
    entries.push({ doc, key })
  }
  if (change && !seen.has('mockup')) {
    entries.push({ doc: { kind: 'mockup', label: 'Mockups', path: `${change.dir}/mockups`, exists: false }, key: 'mockup' })
  }
  entries.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
  const html = `
<section class="section" id="docs">
  <div class="section-head"><h2>Documentos${change ? ` de ${escapeHtml(change.slug)}` : ''}</h2><span class="sub">${entries.filter((entry) => entry.doc.exists).length} disponibles · los ausentes se indican</span></div>
  <div class="section-body">
    ${change ? `<div class="doc-layout"><div class="doc-list" role="list">${entries.map((entry) => docItem(entry.doc, entry.key)).join('')}</div><div>${entries.map((entry) => docPane(entry.doc, entry.key, model, opts)).join('')}</div></div>` : '<div class="empty">Sin cambio activo: crea o selecciona un cambio.</div>'}
  </div>
</section>
<div class="foot-note"><span>◈ documentos y mockups dentro del panel: sin pestañas adicionales</span></div>
`
  return { html, script: SCRIPT }
}
