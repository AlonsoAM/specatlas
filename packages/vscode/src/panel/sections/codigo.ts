import { banner, commandLink, escapeHtml, kpi, pillHtml, plural, type Tone } from '../html.js'
import type { PanelModel } from '../model.js'

const DRIFT_LABEL: Record<string, string> = {
  'missing-file': 'el archivo ya no existe',
  'missing-symbol': 'el símbolo ya no está',
}

/**
 * Sección «Código»: el puente entre lo que dicen las specs vivas y lo que hay
 * en el repositorio — las anclas, su deriva y el estado de la revisión.
 */
export function codigoSection(model: PanelModel): { html: string } {
  // Un snapshot de una versión anterior puede no traer la deriva todavía.
  const drift = model.snapshot.drift ?? { mode: 'advisory', domains: 0, checked: 0, broken: [] }
  const change = model.change
  const review = change?.review

  const driftTone: Tone = drift.broken.length === 0 ? 'green' : drift.mode === 'strict' ? 'red' : 'orange'
  const head =
    drift.checked === 0
      ? banner(
          'gray',
          '◎',
          'Todavía ninguna spec viva dice dónde vive en el código',
          'Las anclas se registran solas al archivar un cambio, desde los «Archivos:» de sus tareas. También puedes escribirlas a mano en .sdd/specs/<dominio>/anchors.yaml.',
        )
      : drift.broken.length === 0
        ? banner('green', '✓', 'Las specs vivas y el código siguen de acuerdo', `${plural(drift.checked, 'ancla comprobada', 'anclas comprobadas')} en ${plural(drift.domains, 'dominio', 'dominios')}.`)
        : banner(
            driftTone,
            '⚠',
            `${plural(drift.broken.length, 'ancla apunta', 'anclas apuntan')} a código que ya no existe`,
            drift.mode === 'strict'
              ? 'El modo estricto bloquea la comprobación continua hasta resolverlo.'
              : 'Modo aviso: no detiene el trabajo, pero la trazabilidad apunta al vacío.',
          )

  const kpis = [
    kpi(drift.checked, 'Anclas comprobadas', { tone: 'blue', icon: '◎' }),
    kpi(drift.domains, 'Dominios anclados', { tone: 'purple', icon: '◈' }),
    kpi(drift.broken.length, 'Anclas rotas', { tone: driftTone, icon: '⚠' }),
    kpi(drift.mode === 'strict' ? 'estricto' : 'aviso', 'Modo de deriva', { tone: drift.mode === 'strict' ? 'red' : 'gray', icon: '⚙', hint: 'ci.drift' }),
  ].join('')

  const brokenRows = drift.broken
    .map(
      (item) => `<tr>
  <td>${pillHtml(item.requirement, 'blue', '◆', true)}</td>
  <td class="mono">${escapeHtml(item.anchor)}</td>
  <td>${escapeHtml(item.domain)}</td>
  <td>${escapeHtml(DRIFT_LABEL[item.kind] ?? item.kind)}</td>
</tr>`,
    )
    .join('')

  const brokenTable =
    drift.broken.length > 0
      ? `<table class="grid">
  <thead><tr><th>Requisito</th><th>Ancla</th><th>Dominio</th><th>Qué pasó</th></tr></thead>
  <tbody>${brokenRows}</tbody>
</table>
<p class="muted">Si solo cambió la ruta, ${commandLink('specatlas.drift', [], 'depura las anclas rotas')}. Si cambió el comportamiento, lo que toca es especificar un cambio.</p>`
      : ''

  const reviewTone: Tone = !review ? 'gray' : review.passed ? 'green' : review.blocking > 0 ? 'red' : 'orange'
  const reviewBlock = change
    ? `<h3>Revisión de código — ${escapeHtml(change.title ?? change.slug)}</h3>
${
  review
    ? `<p>${pillHtml(review.passed ? 'cerrada' : `resultado ${review.verdict}`, reviewTone, review.passed ? '✓' : '⚠')} ${
        review.blocking > 0 ? `${plural(review.blocking, 'hallazgo bloqueante', 'hallazgos bloqueantes')} sin resolver` : review.open > 0 ? `${plural(review.open, 'hallazgo abierto', 'hallazgos abiertos')}` : 'sin hallazgos abiertos'
      }</p>
<p class="muted">La revisión se cierra con <code>- resultado: pass</code> y sin bloqueantes abiertos. ${commandLink('specatlas.review', [change.slug], 'Abrir review.md')}.</p>`
    : `<p class="muted">Este cambio todavía no tiene <code>review.md</code>. ${commandLink('specatlas.review', [change.slug], 'Crear el artefacto de revisión')} — la revisión la hace el agente o una persona.</p>`
}`
    : ''

  const html = `${head}
<div class="kpis">${kpis}</div>
${brokenTable}
${reviewBlock}
<p class="muted">Las anclas viven fuera de la especificación: la spec es de negocio y no nombra archivos. ${commandLink('specatlas.impact', [], 'Consulta el impacto')} de un requisito o de un archivo cuando necesites saber qué toca qué.</p>`

  return { html }
}
