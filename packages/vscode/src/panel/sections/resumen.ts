import { sortChanges, type SnapshotChange } from '../../logic.js'
import { banner, escapeHtml, kpi, laneTone, pillHtml, progressBar } from '../html.js'
import { STATE_TONES } from '../styles.js'
import type { PanelModel } from '../model.js'

function changeCard(change: SnapshotChange): string {
  const tone = STATE_TONES[change.state] ?? 'gray'
  const total = change.progress.tasksTotal
  const percent = total > 0 ? Math.round((change.progress.tasksDone / total) * 100) : 0
  const blocked = change.blockedBy.length > 0 ? `<div class="banner warn">▲ ${escapeHtml(change.blockedBy[0] ?? '')}</div>` : ''
  const agent = change.requiresAgent
  const primary = agent
    ? `<a class="btn sm primary" href="command:specatlas.runNext?${encodeURIComponent(JSON.stringify([change.slug]))}">◈ ${escapeHtml(change.next)}</a>`
    : `<a class="btn sm primary" href="command:specatlas.runNext?${encodeURIComponent(JSON.stringify([change.slug]))}">${escapeHtml(change.next)}</a>`
  const human =
    change.state === 'awaiting_approval' || change.state === 'awaiting_mockups'
      ? `<a class="btn sm" href="command:specatlas.approve?${encodeURIComponent(JSON.stringify([change.slug]))}">Firmar aprobación…</a>`
      : change.state === 'ready'
        ? `<a class="btn sm" href="command:specatlas.archive?${encodeURIComponent(JSON.stringify([change.slug]))}">Archivar</a>`
        : `<a class="btn sm ghost" href="command:specatlas.openPreview?${encodeURIComponent(JSON.stringify([change.dir]))}">Abrir cambio</a>`
  return `<article class="change-card">
  <header>
    <h4>${escapeHtml(change.title ?? change.slug)}</h4>
    <span class="chips">
      ${pillHtml(change.lane, laneTone(change.lane), '◆')}
      ${change.domain ? pillHtml(change.domain, 'gray', '⌂') : ''}
      ${pillHtml(change.stateLabel, tone, '●')}
      ${change.approval ? pillHtml(`aprobado por ${change.approval.by}`, 'green', '✍') : ''}
    </span>
  </header>
  <p class="cc-next">Siguiente: <span class="mono">${escapeHtml(change.next)}</span> — ${escapeHtml(change.nextDescription)}</p>
  ${blocked}
  ${progressBar(percent, tone)}
  <div class="progress-label"><span>${change.progress.tasksDone}/${total} tareas</span><span>evidencia ${change.progress.scenariosDone}/${change.progress.scenariosTotal}</span></div>
  <footer>${primary}${human}</footer>
</article>`
}

export function resumenSection(model: PanelModel): { html: string } {
  const { snapshot, metrics } = model
  const changes = sortChanges(snapshot.changes)
  const blocked = changes.filter((change) => change.blockedBy.length > 0)
  const pendingEvidence = changes.reduce((sum, change) => sum + Math.max(0, change.progress.scenariosTotal - change.progress.scenariosDone), 0)
  const totalScenarios = changes.reduce((sum, change) => sum + change.progress.scenariosTotal, 0)
  const passed = changes.reduce((sum, change) => sum + change.progress.scenariosDone, 0)
  const tasksDone = changes.reduce((sum, change) => sum + change.progress.tasksDone, 0)
  const tasksTotal = changes.reduce((sum, change) => sum + change.progress.tasksTotal, 0)

  const status =
    changes.length === 0
      ? banner('gray', '◍', 'Sin cambios activos', 'Todo el trabajo está archivado. Crea un cambio para empezar.')
      : blocked.length === 0 && snapshot.summary.errors === 0
        ? banner('green', '✓', 'Proceso al día', `Sin bloqueos ni hallazgos bloqueantes · ${pendingEvidence} escenario(s) esperando evidencia`)
        : banner(
            snapshot.summary.errors > 0 ? 'red' : 'orange',
            '△',
            `${blocked.length + snapshot.summary.errors} punto(s) requieren atención`,
            `${blocked.length} cambio(s) bloqueado(s) · ${snapshot.summary.errors} error(es) · ${snapshot.summary.warnings} aviso(s)`,
          )

  const attention = metrics.attention.length
    ? `<section class="section">
  <div class="section-head"><h2>Necesita atención</h2><span class="sub">ordenado por prioridad</span></div>
  <div class="section-body"><div class="attention-grid">${metrics.attention
    .map((item) => {
      const label = item.kind === 'blocked' ? { text: 'Bloqueado', tone: 'red', icon: '⛔' } : item.kind === 'aging' ? { text: 'Antigüedad', tone: 'orange', icon: '◷' } : { text: 'Sin evidencia', tone: 'yellow', icon: '⋯' }
      return `<div class="attention-card" style="--tone:var(--vscode-charts-${label.tone}, #cca700)"><span class="a-icon" aria-hidden="true">${label.icon}</span><div><b>${escapeHtml(item.slug)}</b><span class="a-label">${label.text}</span><div class="a-detail">${escapeHtml(item.detail)}</div></div></div>`
    })
    .join('')}</div></div>
</section>`
    : ''

  const fixes = snapshot.fixes.length
    ? `<section class="section">
  <div class="section-head"><h2>Fixes vivos</h2><span class="sub">correcciones que quedaron registradas</span></div>
  <div class="section-body"><div class="fix-list">${snapshot.fixes
    .slice(0, 6)
    .map(
      (fix) => `<div class="fix-item"><span class="f-date">${escapeHtml(fix.date)}</span><span class="f-slug">${escapeHtml(fix.slug)}</span>${fix.domain ? pillHtml(fix.domain, 'gray', '⌂') : ''}<span class="f-meta">${pillHtml(fix.result, fix.result === 'pass' ? 'green' : 'orange', '✓')}</span></div>`,
    )
    .join('')}</div><p class="callout-line">La historia completa vive en la vista lateral; los fixes no se pliegan a las specs vivas.</p></div>
</section>`
    : ''

  const html = `
${status}
<div class="kpis">
  ${kpi(changes.length, 'Cambios activos', { tone: 'blue', icon: '◫', hint: `${snapshot.archived.length} archivados` })}
  ${kpi(`${tasksDone}/${tasksTotal}`, 'Tareas', { tone: 'purple', icon: '☑', hint: tasksTotal > 0 ? `${Math.round((tasksDone / tasksTotal) * 100)}% completado` : 'sin planificar' })}
  ${kpi(`${passed}/${totalScenarios}`, 'Evidencia', { tone: totalScenarios > 0 && passed === totalScenarios ? 'green' : 'yellow', icon: '✓', hint: 'escenarios en pass' })}
  ${kpi(snapshot.summary.errors, 'Errores', { tone: snapshot.summary.errors > 0 ? 'red' : 'green', icon: '✕', hint: 'bloqueantes' })}
  ${kpi(snapshot.summary.warnings, 'Avisos', { tone: snapshot.summary.warnings > 0 ? 'orange' : 'green', icon: '△', hint: 'revisables' })}
  ${kpi(metrics.aging.averageDays !== undefined ? `${metrics.aging.averageDays}d` : '—', 'Edad media', { tone: 'blue', icon: '◷', hint: metrics.aging.oldest ? `más antiguo: ${metrics.aging.oldest.slug} (${metrics.aging.oldest.ageDays}d)` : 'sin datos' })}
</div>
<section class="section">
  <div class="section-head"><h2>Cambios activos y siguiente acción</h2><span class="sub">un clic para retomar donde quedó</span></div>
  <div class="section-body"><div class="change-list">${changes.map(changeCard).join('') || '<div class="empty">Sin cambios activos.</div>'}</div></div>
</section>
${attention}
${fixes}
`
  return { html }
}
