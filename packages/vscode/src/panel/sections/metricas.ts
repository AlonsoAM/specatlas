import { escapeHtml, banner, barList, bars, donut, kpi, laneTone, pillHtml, progressBar, type Tone } from '../html.js'
import { STATE_TONES } from '../styles.js'
import type { PanelModel } from '../model.js'

export function metricasSection(model: PanelModel): { html: string } {
  const metrics = model.metrics
  const rows = metrics.changes
    .map((change) => {
      const tone = STATE_TONES[change.state] ?? 'gray'
      const percent = change.tasksTotal > 0 ? Math.round((change.tasksDone / change.tasksTotal) * 100) : 0
      return `<tr>
  <td class="mono">${escapeHtml(change.slug)}</td>
  <td>${pillHtml(change.lane, laneTone(change.lane), '◆')}</td>
  <td>${pillHtml(change.stateLabel, tone, '●')}</td>
  <td style="min-width:140px">${progressBar(percent, 'blue')}<span class="muted mono">${change.tasksDone}/${change.tasksTotal}</span></td>
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
  const methodTotal = methodItems.reduce((sum, item) => sum + item.value, 0)
  const preferred = methodItems[0]!.value + methodItems[1]!.value
  const wipItems = Object.values(metrics.wipByState).map((value) => ({ label: value.label, value: value.count, tone: 'purple' as Tone }))
  const laneItems = metrics.byLane.map((item) => ({ ...item, tone: laneTone(item.label) }))
  const bucketTones: Tone[] = ['green', 'blue', 'yellow', 'red']
  const agingItems = metrics.aging.buckets.map((bucket, index) => ({ ...bucket, tone: bucketTones[index] ?? 'red' }))

  const attentionLabels: Record<string, { label: string; tone: Tone; icon: string }> = {
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
            `${metrics.totals.errors} errores · ${metrics.blocked.length} bloqueados · ${metrics.attention.filter((item) => item.kind === 'aging').length} con antigüedad`,
          )

  const attention = metrics.attention.length
    ? `<section class="section"><div class="section-head"><h2>Necesita atención</h2><span class="sub">ordenado por prioridad</span></div><div class="section-body"><div class="attention-grid">${metrics.attention
        .map((item) => {
          const label = attentionLabels[item.kind] ?? attentionLabels['missing-evidence']!
          return `<div class="attention-card" style="--tone:var(--vscode-charts-${label.tone}, #cca700)"><span class="a-icon" aria-hidden="true">${label.icon}</span><div><b>${escapeHtml(item.slug)}</b><span class="a-label">${label.label}</span><div class="a-detail">${escapeHtml(item.detail)}</div></div></div>`
        })
        .join('')}</div></div></section>`
    : ''

  const html = `
${status}
<div class="kpis">
  ${kpi(metrics.totals.changes, 'Cambios activos', { tone: 'blue', icon: '◫', hint: `${metrics.totals.archived} archivados` })}
  ${kpi(`${metrics.totals.tasksDone}/${metrics.totals.tasks}`, 'Tareas', { tone: 'purple', icon: '☑', hint: `${Math.round(tasksPercent)}% completado` })}
  ${kpi(`${metrics.totals.scenariosPassed}/${metrics.totals.scenarios}`, 'Evidencia', { tone: evidencePercent >= 100 ? 'green' : 'yellow', icon: '✓', hint: 'escenarios pass' })}
  ${kpi(metrics.totals.errors, 'Errores', { tone: metrics.totals.errors > 0 ? 'red' : 'green', icon: '✕', hint: 'bloqueantes' })}
  ${kpi(metrics.totals.warnings, 'Avisos', { tone: metrics.totals.warnings > 0 ? 'orange' : 'green', icon: '△', hint: 'revisables' })}
  ${kpi(metrics.aging.averageDays !== undefined ? `${metrics.aging.averageDays}d` : '—', 'Edad media', { tone: 'blue', icon: '◷', hint: metrics.aging.oldest ? `más antiguo: ${metrics.aging.oldest.slug} (${metrics.aging.oldest.ageDays}d)` : 'sin datos' })}
</div>
<section class="section">
  <div class="section-head"><h2>Evidencia</h2><span class="sub">escenarios verificados y método de la evidencia</span></div>
  <div class="section-body"><div class="coverage-grid">
    <div class="donut">
      ${donut(evidencePercent, `${Math.round(evidencePercent)}%`, 'evidencia', evidencePercent >= 100 ? 'green' : evidencePercent > 0 ? 'yellow' : 'red')}
      <div class="legend">
        <span class="legend-item" style="--tone:var(--vscode-charts-green, #89d185)"><i></i><b>${metrics.totals.scenariosPassed}</b> verificados</span>
        <span class="legend-item" style="--tone:var(--vscode-charts-orange, #d18616)"><i></i><b>${Math.max(0, metrics.totals.scenarios - metrics.totals.scenariosPassed)}</b> pendientes</span>
        <div class="mini-progress"><span class="mp-label">Tareas del workspace</span>${progressBar(tasksPercent, 'purple')}<span class="mono muted">${metrics.totals.tasksDone}/${metrics.totals.tasks}</span></div>
      </div>
    </div>
    <div class="coverage-side">
      <h3>Evidencia por método</h3>
      ${barList(methodItems)}
      <p class="callout-line">Preferencia: ejecutable &gt; automático &gt; semi &gt; manual · ${preferred} de ${methodTotal} evidencias son ejecutables o automáticas.</p>
    </div>
  </div></div>
</section>
<div class="grid-2">
  <section class="section"><div class="section-head"><h2>Archivados por mes</h2><span class="sub">throughput del proceso</span></div><div class="section-body">${throughput.length > 0 ? bars(throughput.map(([month, count]) => ({ label: month, value: count, tone: 'green' as Tone }))) : '<div class="empty">Todavía no hay cambios archivados.</div>'}</div></section>
  <section class="section"><div class="section-head"><h2>Antigüedad del trabajo en curso</h2><span class="sub">cambios activos por días desde su creación</span></div><div class="section-body">${barList(agingItems)}${metrics.aging.oldest ? `<p class="callout-line">◷ El más antiguo: <b>${escapeHtml(metrics.aging.oldest.slug)}</b> con ${metrics.aging.oldest.ageDays} días.</p>` : ''}</div></section>
  <section class="section"><div class="section-head"><h2>Distribución por carril</h2><span class="sub">fix · standard · full</span></div><div class="section-body">${laneItems.length > 0 ? barList(laneItems) : '<div class="empty">Sin cambios activos.</div>'}</div></section>
  <section class="section"><div class="section-head"><h2>WIP por estado</h2><span class="sub">¿dónde está el trabajo?</span></div><div class="section-body">${wipItems.length > 0 ? barList(wipItems) : '<div class="empty">Sin cambios activos.</div>'}</div></section>
</div>
${attention}
<section class="section">
  <div class="section-head"><h2>Cambios</h2><span class="sub">progreso, evidencia y antigüedad</span></div>
  <div class="section-body" style="padding:0"><table>
    <thead><tr><th>Cambio</th><th>Carril</th><th>Estado</th><th>Tareas</th><th>Evidencia</th><th>Err / Avisos</th><th>Edad</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7"><div class="empty">Sin cambios activos.</div></td></tr>'}</tbody>
  </table></div>
</section>
<div class="legend-bar">
  <span class="legend-item" style="--tone:var(--vscode-descriptionForeground, #8a8a8a)"><i></i>WIP = cambios activos por estado</span>
  <span class="legend-item" style="--tone:var(--vscode-descriptionForeground, #8a8a8a)"><i></i>Throughput = cambios archivados por mes</span>
  <span class="legend-item" style="--tone:var(--vscode-descriptionForeground, #8a8a8a)"><i></i>Edad = días desde la creación del cambio</span>
</div>
`
  return { html }
}
