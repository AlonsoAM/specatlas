import { escapeHtml, laneTone, pillHtml, progressBar } from '../html.js'
import { STATE_TONES } from '../styles.js'
import type { PanelModel } from '../model.js'
import type { SnapshotChange } from '../../logic.js'

const LANES: Array<{ state: string; label: string }> = [
  { state: 'draft', label: 'Borrador' },
  { state: 'spec_draft', label: 'Spec en borrador' },
  { state: 'awaiting_mockups', label: 'Esperando mockups' },
  { state: 'awaiting_approval', label: 'Esperando aprobación' },
  { state: 'approved', label: 'Aprobado' },
  { state: 'building', label: 'Construyendo' },
  { state: 'built', label: 'Construido' },
  { state: 'verified', label: 'Verificado' },
  { state: 'reviewed', label: 'Revisado' },
  { state: 'ready', label: 'Listo para archivar' },
]

const SCRIPT = `
(function () {
  var tickets = Array.prototype.slice.call(document.querySelectorAll('#flujo article.ticket'));
  var q = document.getElementById('fq');
  var lane = document.getElementById('flane');
  var dom = document.getElementById('fdomain');
  var out = document.getElementById('fcount');
  var clear = document.getElementById('fclear');
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
    if (out) out.textContent = visible + ' de ' + tickets.length + ' cambios';
  }
  [q, lane, dom].forEach(function (el) { if (el) el.addEventListener('input', apply); });
  if (clear) clear.addEventListener('click', function () {
    if (q) q.value = '';
    if (lane) lane.value = '';
    if (dom) dom.value = '';
    apply();
  });
  apply();
})();
`

function ticket(change: SnapshotChange): string {
  const tone = STATE_TONES[change.state] ?? 'gray'
  const total = change.progress.tasksTotal
  const percent = total > 0 ? Math.round((change.progress.tasksDone / total) * 100) : 0
  const spec = change.files.find((file) => file.kind === 'spec')
  const title = escapeHtml(change.title ?? change.slug)
  const open = spec ? `<a href="command:specatlas.openPreview?${encodeURIComponent(JSON.stringify([spec.path, change.slug, 'spec']))}">${title}</a>` : title
  const blocked = change.blockedBy.length > 0 ? `<div class="banner warn">▲ ${escapeHtml(change.blockedBy[0] ?? '')}</div>` : ''
  return `<article class="ticket" data-lane="${escapeHtml(change.lane)}" data-domain="${escapeHtml(change.domain ?? '')}" data-text="${escapeHtml(`${change.slug} ${change.title ?? ''}`.toLowerCase())}">
  <h4>${open}</h4>
  <div class="chips">${pillHtml(change.lane, laneTone(change.lane), '◆')}${change.domain ? pillHtml(change.domain, 'gray', '⌂') : ''}</div>
  <p class="t-next"><span class="mono">${escapeHtml(change.next)}</span></p>
  ${blocked}
  ${progressBar(percent, tone)}
  <div class="progress-label"><span>${change.progress.tasksDone}/${total} tareas</span><span>evidencia ${change.progress.scenariosDone}/${change.progress.scenariosTotal}</span></div>
</article>`
}

export function flujoSection(model: PanelModel): { html: string; script: string } {
  const { snapshot } = model
  const lanes = LANES.map((lane) => {
    const items = snapshot.changes.filter((change) => change.state === lane.state)
    const tone = STATE_TONES[lane.state] ?? 'gray'
    const empty = items.length === 0
    if (empty) return ''
    return `<div class="lane" style="--tone:var(--vscode-charts-${tone}, #8a8a8a)" data-col="${lane.state}">
  <div class="lane-rail"><span class="lane-dot" aria-hidden="true"></span><span class="lane-name">${escapeHtml(lane.label)}</span><span class="lane-count" data-count="${lane.state}">${items.length}</span></div>
  <div class="lane-body">${items.map(ticket).join('')}</div>
</div>`
  })
    .filter((html) => html !== '')
    .join('\n')
  const emptyLanes = LANES.filter((lane) => !snapshot.changes.some((change) => change.state === lane.state))

  const laneValues = [...new Set(snapshot.changes.map((change) => change.lane))].sort()
  const domains = [...new Set(snapshot.changes.map((change) => change.domain).filter((domain): domain is string => Boolean(domain)))].sort()
  const filters = `<div class="filters">
  <input type="search" id="fq" data-filter="fq" placeholder="Buscar cambio…" aria-label="Buscar cambio">
  ${laneValues.length > 1 ? `<select id="flane" data-filter="flane" aria-label="Carril"><option value="">Todos los carriles</option>${laneValues.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select>` : ''}
  ${domains.length > 1 ? `<select id="fdomain" data-filter="fdomain" aria-label="Dominio"><option value="">Todos los dominios</option>${domains.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select>` : ''}
  <span class="fcount" id="fcount"></span>
  <button type="button" class="fclear" id="fclear">Limpiar</button>
</div>`

  const html = `
<section class="section" id="flujo">
  <div class="section-head"><h2>Fases del ciclo</h2><span class="sub">cada fase con sus cambios · las fases vacías se resumen abajo</span></div>
  ${snapshot.changes.length > 0 ? filters : ''}
  <div class="section-body">
    ${snapshot.changes.length > 0 ? `<div class="flow">${lanes}</div>` : '<div class="empty">Sin cambios activos.</div>'}
    ${snapshot.changes.length > 0 && emptyLanes.length > 0 ? `<div class="flow-empty"><span>Sin cambios en:</span>${emptyLanes.map((lane) => `<span class="flow-empty-chip"><span class="lane-dot" style="--tone:var(--vscode-charts-${STATE_TONES[lane.state] ?? 'gray'}, #8a8a8a)"></span>${escapeHtml(lane.label)}</span>`).join('')}</div>` : ''}
  </div>
</section>
<div class="foot-note"><span>◈ el flujo se lee de arriba abajo: cada fase con sus cambios, sin scroll horizontal</span></div>
`
  return { html, script: SCRIPT }
}
