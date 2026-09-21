import { loadLivingFixes, stateLabel, upgradeAdvisory } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { evaluateChange } from '../evaluate.js'
import { msg } from '../messages.js'
import { barraProgreso, detectarTema, encabezado, filaAlineada, pinta, seccion, siguienteAccion, simbolos, type Estilo, type Tema } from '../ui.js'

/** Color de cada fase: lo que espera a una persona se distingue de lo que ya corre. */
const TONO_ESTADO: Record<string, Estilo> = {
  draft: 'gris',
  spec_draft: 'amarillo',
  paused: 'amarillo',
  awaiting_mockups: 'morado',
  awaiting_approval: 'morado',
  approved: 'azul',
  planned: 'azul',
  building: 'azul',
  built: 'amarillo',
  verified: 'verde',
  reviewed: 'verde',
  ready: 'verde',
  archived: 'gris',
}

function marcaDeEstado(tema: Tema, estado: string, bloqueado: boolean): string {
  const s = simbolos(tema)
  if (bloqueado) return pinta(tema, 'rojo', s.bloqueo)
  if (estado === 'paused') return pinta(tema, 'amarillo', s.pausa)
  if (estado === 'ready') return pinta(tema, 'verde', s.ok)
  return pinta(tema, TONO_ESTADO[estado] ?? 'azul', s.punto)
}

export async function runStatus(ctx: CliContext): Promise<CommandResult> {
  const { root, workspace, config, approvals } = await requireWorkspace(ctx)
  const advisory = await upgradeAdvisory(root)
  const tema = detectarTema()
  const s = simbolos(tema)
  const fixes = await loadLivingFixes(root)

  const contexto = [
    `${workspace.specs.length} ${workspace.specs.length === 1 ? 'spec viva' : 'specs vivas'}`,
    `${workspace.changes.length} ${workspace.changes.length === 1 ? 'cambio' : 'cambios'}`,
    fixes.length > 0 ? `${fixes.length} ${fixes.length === 1 ? 'fix' : 'fixes'}` : '',
  ]
    .filter((parte) => parte !== '')
    .join(` ${s.separador} `)

  const lines: string[] = encabezado(tema, msg('status.title', ctx.language), `${config.project.name} ${s.separador} ${contexto}`)
  const changes: unknown[] = []

  if (workspace.changes.length === 0) {
    lines.push(pinta(tema, 'gris', `  Sin cambios activos. Crea uno con \`satlas new <slug>\`.`))
  }

  for (const change of workspace.changes) {
    const evaluation = await evaluateChange(workspace, config, change, approvals)
    const { state, progress, nextAction, blockedBy } = evaluation.state
    const lane = change.meta?.lane ?? config.lanes.default
    const bloqueado = blockedBy.length > 0 || evaluation.blocking > 0

    changes.push({
      slug: change.slug,
      lane,
      domain: change.meta?.domain,
      state,
      label: stateLabel(state),
      next: nextAction.command,
      progress,
      blocking: evaluation.blocking,
    })

    lines.push(
      filaAlineada([
        { texto: `  ${marcaDeEstado(tema, state, bloqueado)} ${pinta(tema, 'negrita', change.slug)}`, ancho: 30 },
        { texto: pinta(tema, TONO_ESTADO[state] ?? 'azul', stateLabel(state)), ancho: 22 },
        { texto: pinta(tema, 'gris', `${change.meta?.domain ?? '—'} ${s.separador} ${lane}`) },
      ]),
    )

    const medidas = [
      `${pinta(tema, 'gris', 'tareas')} ${barraProgreso(tema, progress.tasksDone, progress.tasksTotal)}`,
      `${pinta(tema, 'gris', 'evidencia')} ${barraProgreso(tema, progress.scenariosEvidenced, progress.scenariosTotal)}`,
    ]
    lines.push(`      ${medidas.join(pinta(tema, 'gris', `  ${s.separador}  `))}`)

    for (const bloqueo of blockedBy) lines.push(`      ${pinta(tema, 'amarillo', s.bloqueo)} ${pinta(tema, 'gris', bloqueo)}`)
    lines.push(...siguienteAccion(tema, nextAction.command, nextAction.description))
    lines.push('')
  }

  if (workspace.specs.length > 0) {
    lines.push(seccion(tema, msg('status.specs', ctx.language), `${workspace.specs.length}`))
    const ancho = Math.max(...workspace.specs.map((spec) => spec.domain.length), 8)
    for (const spec of workspace.specs) {
      lines.push(
        filaAlineada([
          { texto: `  ${pinta(tema, 'morado', s.punto)} ${spec.domain}`, ancho: ancho + 6 },
          { texto: pinta(tema, 'gris', `${spec.spec.requirements.length} ${spec.spec.requirements.length === 1 ? 'requisito' : 'requisitos'}`) },
        ]),
      )
    }
    lines.push('')
  }

  lines.push(seccion(tema, msg('status.fixes', ctx.language), `${fixes.length}`))
  if (fixes.length === 0) {
    lines.push(pinta(tema, 'gris', '  (se llenan al archivar un fix)'))
  } else {
    for (const fix of fixes) {
      const resultado = fix.result === 'pass' ? pinta(tema, 'verde', fix.result) : pinta(tema, 'rojo', fix.result)
      lines.push(
        filaAlineada([
          { texto: `  ${pinta(tema, 'gris', fix.date || '—')}`, ancho: 14 },
          { texto: pinta(tema, 'gris', fix.domain ?? '—'), ancho: 14 },
          { texto: fix.slug, ancho: 28 },
          { texto: `${resultado}${fix.source === 'archive' ? pinta(tema, 'gris', ' (histórico)') : ''}` },
        ]),
      )
    }
  }

  const diagnostics = [...workspace.diagnostics, ...advisory.diagnostics]
  const errors = diagnostics.filter((d) => d.severity === 'error').length
  return {
    exitCode: errors > 0 ? 1 : 0,
    diagnostics,
    data: {
      changes,
      specs: workspace.specs.map((spec) => ({ domain: spec.domain, requirements: spec.spec.requirements.length })),
      fixes: fixes.map((fix) => ({
        slug: fix.slug,
        date: fix.date,
        result: fix.result,
        source: fix.source,
        ...(fix.domain !== undefined ? { domain: fix.domain } : {}),
        covers: fix.covers,
      })),
      upgrade: {
        currentVersion: advisory.plan.currentVersion,
        pending: advisory.plan.pending.length,
        newer: advisory.plan.newer.length,
        unreadable: advisory.plan.unreadable.length,
      },
    },
    text: lines,
  }
}
