import { escapeHtml, banner, barList, commandLink, donut, kpi, pillHtml, plural, type Tone } from '../html.js'
import type { PanelModel } from '../model.js'
import type { MatrixRequirement } from '../../logic.js'

const SCRIPT = `
(function () {
  var rows = Array.prototype.slice.call(document.querySelectorAll('#mtz tbody tr[data-group]'));
  var heads = new Map();
  rows.forEach(function (row) { if (row.classList.contains('row-group')) heads.set(row.getAttribute('data-group'), row); });
  var q = document.getElementById('mq');
  var st = document.getElementById('mstatus');
  var dom = document.getElementById('mdomain');
  var ch = document.getElementById('mchange');
  var tp = document.getElementById('mtipo');
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
    var tipo = tp ? tp.value : 'all';
    var visible = 0;
    heads.forEach(function (head, key) {
      var list = (head.getAttribute('data-changes') || '').split(' ').filter(Boolean);
      var hasChanges = head.getAttribute('data-has-changes') === '1';
      var hasFixes = head.getAttribute('data-has-fixes') === '1';
      var show = (!text || norm(head.getAttribute('data-text')).indexOf(text) >= 0)
        && (status === 'all' || (status === 'gap' ? head.getAttribute('data-gap') === '1' : head.getAttribute('data-gap') !== '1'))
        && (!domain || head.getAttribute('data-domain') === domain)
        && (tipo === 'all' || (tipo === 'changes' ? hasChanges : tipo === 'fixes' ? hasFixes : (!hasChanges && !hasFixes)))
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
  [q, st, dom, ch, tp].forEach(function (el) { if (el) el.addEventListener('input', apply); });
  if (clear) clear.addEventListener('click', function () {
    if (q) q.value = '';
    if (st) st.value = 'all';
    if (dom) dom.value = '';
    if (ch) ch.value = '';
    if (tp) tp.value = 'all';
    apply();
  });
  apply();
})();
`

function requirementTone(requirement: MatrixRequirement): Tone {
  if (requirement.total === 0) return 'gray'
  const percent = (requirement.passed / requirement.total) * 100
  if (percent >= 100) return 'green'
  if (percent > 0) return 'yellow'
  return 'red'
}

export function trazabilidadSection(model: PanelModel): { html: string; script: string } {
  const { matrix } = model
  const scenarios = matrix.requirements.flatMap((requirement) => requirement.scenarios)
  const passed = scenarios.filter((scenario) => scenario.evidence === 'pass').length
  const coverage = scenarios.length > 0 ? (passed / scenarios.length) * 100 : 0
  const gaps = scenarios.length - passed
  const coverageTone: Tone = coverage >= 100 ? 'green' : coverage >= 60 ? 'yellow' : 'red'

  const rows = matrix.requirements
    .map((requirement) => {
      const percent = requirement.total > 0 ? (requirement.passed / requirement.total) * 100 : 0
      const gap = requirement.scenarios.some((scenario) => scenario.tasks.length === 0 || scenario.evidence !== 'pass')
      const groupRow = `<tr class="row-group${gap ? ' has-gap' : ''}" data-group="${escapeHtml(requirement.id)}" data-gap="${gap ? '1' : '0'}" data-domain="${escapeHtml(requirement.domain ?? '')}" data-changes="${escapeHtml((requirement.changes ?? []).join(' '))}" data-has-changes="${(requirement.changes ?? []).length > 0 ? '1' : '0'}" data-has-fixes="${(requirement.fixes ?? []).length > 0 ? '1' : '0'}" data-text="${escapeHtml([requirement.id, requirement.title, ...requirement.scenarios.flatMap((s) => [s.id, s.title])].join(' ').toLowerCase())}">
  <td colspan="4"><div class="group-line">
    <span class="group-title">${commandLink('specatlas.openAt', [requirement.file, requirement.line], `${requirement.id} — ${requirement.title}`)}</span>
    ${pillHtml(requirement.living ? 'viva' : 'delta', 'blue', '◈')}
    ${requirement.living && (requirement.changes ?? []).length > 0 ? pillHtml(`modificado por ${(requirement.changes ?? []).join(', ')}`, 'purple', '⌥') : ''}
    ${(requirement.fixes ?? []).length > 0 ? pillHtml(`corregido por ${(requirement.fixes ?? []).join(', ')}`, 'orange', '✚') : ''}
    ${requirement.living && (requirement.changes ?? []).length === 0 && (requirement.fixes ?? []).length === 0 ? pillHtml('sin procedencia registrada', 'gray', '∅') : ''}
    <span class="group-spacer"></span>
    <span class="group-coverage" style="--tone:var(--vscode-charts-${requirementTone(requirement)}, #8a8a8a)"><span class="gc-track"><span class="gc-fill" style="width:${Math.round(percent)}%"></span></span><span class="gc-label">${requirement.passed}/${requirement.total} con evidencia</span></span>
  </div></td>
</tr>`
      const scenarioRows = requirement.scenarios
        .map((scenario) => {
          const rowGap = scenario.tasks.length === 0 || scenario.evidence !== 'pass'
          const taskChips = scenario.tasks.length > 0 ? scenario.tasks.map((id) => pillHtml(id, 'blue', '▸', true)).join('') : pillHtml('sin tarea', 'red', '✕')
          const method = scenario.method ? `<span class="mono muted">${escapeHtml(scenario.method)}</span>` : ''
          const evidence =
            scenario.evidence === 'pass'
              ? `${pillHtml('pass', 'green', '✓')}${method}`
              : scenario.evidence === 'fail'
                ? `${pillHtml('fail', 'red', '✕')}${method}`
                : pillHtml('pendiente', 'orange', '⋯')
          return `<tr class="scenario-row${rowGap ? ' row-gap' : ''}" data-group="${escapeHtml(requirement.id)}">
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

  const domains = [...new Set(matrix.requirements.map((requirement) => requirement.domain).filter((domain): domain is string => Boolean(domain)))].sort()
  const changeSlugs = [...new Set(matrix.requirements.flatMap((requirement) => requirement.changes ?? []))].sort()
  const filters = `<div class="filters">
  <input type="search" id="mq" data-filter="mq" placeholder="Buscar requisito o escenario…" aria-label="Buscar requisito o escenario">
  <select id="mstatus" data-filter="mstatus" aria-label="Estado"><option value="all">Todos</option><option value="gap">Con huecos</option><option value="pass">Verificados</option></select>
  ${domains.length > 1 ? `<select id="mdomain" data-filter="mdomain" aria-label="Dominio"><option value="">Todos los dominios</option>${domains.map((domain) => `<option value="${escapeHtml(domain)}">${escapeHtml(domain)}</option>`).join('')}</select>` : ''}
  ${changeSlugs.length > 0 ? `<select id="mchange" data-filter="mchange" aria-label="Cambio"><option value="">Todos los cambios</option><option value="__none">Sin cambio activo</option>${changeSlugs.map((slug) => `<option value="${escapeHtml(slug)}">${escapeHtml(slug)}</option>`).join('')}</select>` : ''}
  <select id="mtipo" data-filter="mtipo" aria-label="Procedencia"><option value="all">Toda procedencia</option><option value="changes">Con cambios</option><option value="fixes">Con fixes</option><option value="none">Sin procedencia</option></select>
  <span class="fcount" id="mcount"></span>
  <button type="button" class="fclear" id="mclear">Limpiar</button>
</div>`

  const byDomain = domains
    .map((domain) => {
      const items = matrix.requirements.filter((requirement) => requirement.domain === domain)
      const total = items.reduce((sum, requirement) => sum + requirement.total, 0)
      const domainPassed = items.reduce((sum, requirement) => sum + requirement.passed, 0)
      const percent = total > 0 ? Math.round((domainPassed / total) * 100) : 0
      return { label: domain, value: percent, tone: (percent >= 100 ? 'green' : percent > 0 ? 'yellow' : 'red') as Tone, detail: `${domainPassed}/${total}` }
    })
    .sort((a, b) => a.value - b.value)

  const html = `
<div class="status-banner" style="--tone:${gaps === 0 && scenarios.length > 0 ? 'var(--vscode-charts-green, #89d185)' : 'var(--vscode-charts-orange, #d18616)'}">
  <span class="sb-icon">${scenarios.length === 0 ? '◍' : gaps === 0 ? '✓' : '△'}</span>
  <div><strong>${scenarios.length === 0 ? 'Sin escenarios todavía' : gaps === 0 ? 'Trazabilidad completa' : `${gaps} escenario(s) sin cerrar`}</strong>
  <span class="sb-text">${matrix.uncoveredScenarios.length} sin tarea · ${matrix.pendingEvidence.length} sin evidencia pass · ${matrix.requirementsWithoutTasks.length} requisito(s) sin tareas</span></div>
</div>
<div class="kpis">
  ${kpi(matrix.requirements.length, 'Requisitos', { tone: 'blue', icon: '▤', hint: 'vivos y del delta' })}
  ${kpi(scenarios.length, 'Escenarios', { tone: 'purple', icon: '◇', hint: 'criterios de aceptación' })}
  ${kpi(`${Math.round(coverage)}%`, 'Cobertura', { tone: coverageTone, icon: '◍', hint: `${passed}/${scenarios.length} con evidencia` })}
  ${kpi(matrix.uncoveredScenarios.length, 'Sin tarea', { tone: matrix.uncoveredScenarios.length > 0 ? 'red' : 'green', icon: '✕', hint: 'huecos de trazabilidad' })}
  ${kpi(matrix.pendingEvidence.length, 'Sin evidencia', { tone: matrix.pendingEvidence.length > 0 ? 'orange' : 'green', icon: '⋯', hint: 'esperando resultado pass' })}
</div>
<section class="section">
  <div class="section-head"><h2>Cobertura de escenarios</h2><span class="sub">requisito → escenario → tarea → evidencia</span></div>
  <div class="section-body"><div class="coverage-grid">
    <div class="donut">
      ${donut(coverage, `${Math.round(coverage)}%`, 'evidencia', coverageTone)}
      <div class="legend">
        <span class="legend-item" style="--tone:var(--vscode-charts-green, #89d185)"><i></i><b>${passed}</b> con evidencia pass</span>
        <span class="legend-item" style="--tone:var(--vscode-charts-orange, #d18616)"><i></i><b>${scenarios.length - passed}</b> pendientes o fallidas</span>
        <span class="legend-item" style="--tone:var(--vscode-charts-red, #f14c4c)"><i></i><b>${matrix.uncoveredScenarios.length}</b> escenarios sin tarea</span>
        <span class="legend-item" style="--tone:var(--vscode-descriptionForeground, #8a8a8a)"><i></i><b>${matrix.requirementsWithoutTasks.length}</b> requisitos sin tareas</span>
      </div>
    </div>
    <div class="coverage-side">
      <h3>Cobertura por dominio</h3>
      ${byDomain.length > 0 ? barList(byDomain.map((item) => ({ label: item.label, value: item.value, tone: item.tone }))) : '<div class="empty">Sin dominios todavía.</div>'}
      <p class="callout-line">${byDomain.length > 0 ? `El dominio con más huecos: <b>${escapeHtml(byDomain[0]!.label)}</b> (${escapeHtml(byDomain[0]!.detail)} con evidencia).` : ''}</p>
    </div>
  </div></div>
</section>
<section class="section" id="mtz">
  <div class="section-head"><h2>Matriz</h2><span class="sub">lo accionable primero · clic en un id para abrir en la línea</span></div>
  ${filters}
  <div class="section-body" style="padding:0">
    <table class="matrix">
      <thead><tr><th style="width:200px">Escenario</th><th>Título</th><th style="width:250px">Tareas</th><th style="width:160px">Evidencia</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4"><div class="empty">Sin requisitos todavía. Especifica un cambio para llenar la trazabilidad.</div></td></tr>'}</tbody>
    </table>
  </div>
</section>
<div class="legend-bar">
  <span class="legend-item" style="--tone:var(--vscode-charts-green, #89d185)"><i></i>evidencia pass</span>
  <span class="legend-item" style="--tone:var(--vscode-charts-orange, #d18616)"><i></i>pendiente</span>
  <span class="legend-item" style="--tone:var(--vscode-charts-red, #f14c4c)"><i></i>hueco (sin tarea o sin evidencia)</span>
  <span class="legend-item" style="--tone:var(--vscode-charts-blue, #3794ff)"><i></i>tarea que cubre</span>
</div>
`
  return { html, script: SCRIPT }
}
