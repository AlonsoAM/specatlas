import { buildStepStates, laneOf, PROJECT_ACTIONS, resolveCommand, type ActionStepState, type Actor } from '../../actions.js'
import { escapeHtml, pillHtml, type Tone } from '../html.js'
import type { AgentTarget } from '@specatlas/core'
import type { PanelModel } from '../model.js'

const ACTOR_LABEL: Record<Actor, { text: string; cls: string; icon: string }> = {
  agent: { text: 'con agente', cls: 'agent', icon: '◈' },
  human: { text: 'humana', cls: 'human', icon: '✍' },
  local: { text: 'local', cls: 'local', icon: '⌘' },
}

const STATUS: Record<ActionStepState['status'], { text: string; tone: Tone; icon: string }> = {
  done: { text: 'hecho', tone: 'green', icon: '✓' },
  skipped: { text: 'omitido', tone: 'gray', icon: '◌' },
  now: { text: 'ahora', tone: 'blue', icon: '▶' },
  pending: { text: 'pendiente', tone: 'gray', icon: '◌' },
  blocked: { text: 'bloqueada', tone: 'red', icon: '⌸' },
}

const SCRIPT = `
(function () {
  var buttons = Array.prototype.slice.call(document.querySelectorAll('#acciones [data-set-lane]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('#acciones [data-lane-panel]'));
  function show(name) {
    panels.forEach(function (panel) { panel.hidden = panel.getAttribute('data-lane-panel') !== name; });
    buttons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-set-lane') === name)); });
  }
  buttons.forEach(function (button) {
    button.addEventListener('click', function () { show(button.getAttribute('data-set-lane')); });
  });
})();
`

function commandFor(step: ActionStepState, slug: string | undefined, agent: AgentTarget | undefined): string {
  return resolveCommand(step.command, slug, agent)
}

function stepButtons(step: ActionStepState, slug: string | undefined, agent: AgentTarget | undefined): string {
  const command = commandFor(step, slug, agent)
  const opencode = `<button type="button" class="btn sm${step.status === 'now' ? ' primary' : ''}" data-message="run-step" data-step="${escapeHtml(step.id)}" title="Abre opencode con ${escapeHtml(command)}"${step.enabled ? '' : ' disabled'}>◈ Abrir opencode</button>`
  const artifact =
    step.artifact === 'spec' || step.artifact === 'plan' || step.artifact === 'tasks' || step.artifact === 'verify' || step.artifact === 'review' || step.artifact === 'docs'
      ? `<button type="button" class="btn sm ghost" data-message="open-artifact" data-value="${escapeHtml(step.artifact)}">Abrir artefacto</button>`
      : ''
  if (step.actor === 'agent') {
    const fallback = `<button type="button" class="btn sm ghost" data-message="copy-command" data-value="${escapeHtml(command)}">Copiar instrucción</button>`
    const disabled = step.enabled ? '' : ` disabled`
    const reason = step.enabled ? '' : `<span class="muted" style="font-size:11.5px">${escapeHtml(step.reason ?? 'no aplica todavía')}</span>`
    return `${opencode}${step.enabled ? artifact + fallback : ''}${reason}`
  }
  if (step.actor === 'human') {
    const target = step.id.endsWith('.aprobar') ? 'specatlas.approve' : step.id.endsWith('.archivar') ? 'specatlas.archive' : undefined
    const label = step.id.endsWith('.aprobar') ? 'Firmar aprobación…' : step.id.endsWith('.archivar') ? 'Archivar' : step.title
    if (target && step.enabled && step.status !== 'done') {
      return `<a class="btn sm${step.status === 'now' ? ' primary' : ''}" href="command:${target}?${encodeURIComponent(JSON.stringify([slug]))}">${escapeHtml(label)}</a>`
    }
    return `<button type="button" class="btn sm" disabled>${escapeHtml(label)}</button><span class="muted" style="font-size:11.5px">${escapeHtml(step.reason ?? 'no aplica todavía')}</span>`
  }
  const localTargets: Record<string, string> = {
    'std.verificar': 'specatlas.verify',
    'fix.verificar': 'specatlas.verify',
    'full.verificar': 'specatlas.verify',
    'std.analizar': 'specatlas.analyze',
    'full.analizar': 'specatlas.analyze',
    'std.nuevo': 'specatlas.new',
    'fix.nuevo': 'specatlas.new',
    'full.nuevo': 'specatlas.new',
  }
  const target = localTargets[step.id]
  if (target && step.enabled && step.status !== 'done') {
    return `<a class="btn sm${step.status === 'now' ? ' primary' : ''}" href="command:${target}?${encodeURIComponent(JSON.stringify([slug]))}">${escapeHtml(step.title)}</a>`
  }
  if (step.status === 'done') {
    return `<button type="button" class="btn sm ghost" data-message="copy-command" data-value="${escapeHtml(command)}">Repetir en terminal</button>`
  }
  return `<button type="button" class="btn sm" disabled>${escapeHtml(step.title)}</button><span class="muted" style="font-size:11.5px">${escapeHtml(step.reason ?? 'no aplica todavía')}</span>`
}

function stepHtml(step: ActionStepState, index: number, slug: string | undefined, agent: AgentTarget | undefined): string {
  const actor = ACTOR_LABEL[step.actor]
  const status = STATUS[step.status]
  return `<div class="step ${step.status === 'done' ? 'done' : ''}${step.status === 'now' ? ' now' : ''}${step.status === 'skipped' ? ' skipped' : ''}">
  <span class="step-num">${index + 1}</span>
  <div class="step-body">
    <div class="step-head">
      <h4>${escapeHtml(step.title)}</h4>
      <span class="actor ${actor.cls}">${actor.icon} ${actor.text}</span>
      <span class="spacer"></span>
      ${pillHtml(status.text, status.tone, status.icon)}
    </div>
    <p>${escapeHtml(step.description)}</p>
    <div class="step-foot"><span class="mono muted">${escapeHtml(commandFor(step, slug, agent))}</span>${stepButtons(step, slug, agent)}</div>
  </div>
</div>`
}

export function accionesSection(model: PanelModel): { html: string; script: string } {
  const change = model.change
  const lane = change ? laneOf(change) : 'standard'
  const steps = change ? buildStepStates(change) : []
  const current = steps.find((step) => step.status === 'now')
  const currentIndex = current ? steps.indexOf(current) + 1 : 0

  const lanes: Array<{ id: 'fix' | 'standard' | 'full'; label: string }> = [
    { id: 'fix', label: 'fix · express' },
    { id: 'standard', label: 'standard' },
    { id: 'full', label: 'full · completo' },
  ]
  const lanePanels = lanes
    .map((item) => {
      const laneSteps = change && item.id === lane ? steps : buildStepStates({ ...(change ?? emptyChange()), lane: item.id, state: change?.state ?? 'draft' })
      const title = item.id === 'fix' ? 'Carril fix (express)' : item.id === 'full' ? 'Carril full (completo)' : 'Carril standard'
      const metaBase = item.id === 'fix' ? 'sin ceremonia completa' : item.id === 'full' ? 'suma revisión, documentación y contratos' : 'de la especificación al archivo'
      const meta = `${laneSteps.length} pasos · ${metaBase}`
      const progress = item.id === lane && currentIndex > 0 ? ` · cambio activo: ${change?.slug} (paso ${currentIndex} de ${laneSteps.length})` : ''
      return `<div class="stepper" data-lane-panel="${item.id}"${item.id === lane ? '' : ' hidden'}>
  <div class="lane-title"><b>${title}</b><span class="lt-meta">${meta}${progress}</span></div>
  ${laneSteps.map((step, index) => stepHtml(step, index, change?.slug, model.snapshot.agent)).join('')}
</div>`
    })
    .join('')

  const transversal = PROJECT_ACTIONS.map((action) => {
    const targets: Record<string, string> = {
      present: 'specatlas.present',
      validate: 'specatlas.validate',
      ci: 'specatlas.ci',
      doctor: 'specatlas.doctor',
      adapters: 'specatlas.adapters',
      packs: 'specatlas.packs',
    }
    const target = targets[action.id]
    const command = resolveCommand(action.command, change?.slug, model.snapshot.agent)
    const button = target
      ? `<a class="btn sm" href="command:${target}?${encodeURIComponent(JSON.stringify(change ? [change.slug] : []))}">${escapeHtml(action.title)}</a>`
      : `<button type="button" class="btn sm" data-message="copy-command" data-value="${escapeHtml(command)}">Copiar comando</button>`
    return `<article class="action-card">
  <header><span aria-hidden="true">◇</span><h4>${escapeHtml(action.title)}</h4><span class="actor local">⌘ local</span></header>
  <p>${escapeHtml(action.description)}</p>
  <footer>${button}</footer>
</article>`
  }).join('')

  const html = `
<div class="flow-actions" id="acciones">
  <div class="starter">
    <div>
      <h4>＋ Nuevo cambio — paso 1 de todos los carriles</h4>
      <p>Pide carril, título y dominio y deja el cambio en el primer paso del flujo de su carril.</p>
    </div>
    <div class="s-lanes">
      <a class="btn sm primary" href="command:specatlas.new">Crear cambio…</a>
    </div>
  </div>

  <section class="section">
    <div class="section-head"><h2>Flujo por carril</h2><span class="sub">el paso actual queda marcado · cada paso lleva su acción</span></div>
    <div class="section-body">
      <div class="lane-picker">
        <div class="seg-inline" role="group" aria-label="Carril">
          ${lanes.map((item) => `<button type="button" data-set-lane="${item.id}" aria-pressed="${item.id === lane}">${escapeHtml(item.label)}</button>`).join('')}
        </div>
        <div class="lane-legend">
          <span class="actor agent">◈ con agente</span>
          <span class="actor human">✍ humana</span>
          <span class="actor local">⌘ local</span>
        </div>
      </div>
      ${change ? lanePanels : '<div class="empty">Sin cambio activo: crea uno para recorrer el flujo.</div>'}
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Transversales</h2><span class="sub">locales, en cualquier momento · no tocan artefactos aprobados</span></div>
    <div class="section-body"><div class="action-grid">${transversal}</div></div>
  </section>

  <div class="note" style="--tone:var(--vscode-charts-blue, #3794ff)">
    Cada botón «Abrir opencode» abre una terminal del proyecto y lanza el asistente con la instrucción de ese paso. Si la terminal no se puede abrir, la instrucción queda para copiar.
  </div>
</div>
`
  return { html, script: SCRIPT }
}

function emptyChange(): Parameters<typeof buildStepStates>[0] {
  return {
    slug: '',
    dir: '',
    lane: 'standard',
    state: 'draft',
    stateLabel: 'borrador',
    next: '',
    nextDescription: '',
    requiresAgent: false,
    blockedBy: [],
    progress: { tasksDone: 0, tasksTotal: 0, scenariosDone: 0, scenariosTotal: 0 },
    blocking: 0,
    files: [],
    mockups: { screens: 0, stale: false },
  }
}
