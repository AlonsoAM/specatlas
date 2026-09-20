import path from 'node:path'
import {
  applyUpgrade,
  planUpgrade,
  rollbackUpgrade,
  type UpgradeApplyReport,
  type UpgradePlan,
  type UpgradeRollbackReport,
} from '@specatlas/core'
import { flagBool } from '../args.js'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { msg } from '../messages.js'

export async function runUpgrade(ctx: CliContext): Promise<CommandResult> {
  const { root } = await requireWorkspace(ctx)
  const apply = flagBool(ctx.flags, 'apply')
  const rollback = flagBool(ctx.flags, 'rollback')

  if (apply && rollback) {
    return {
      exitCode: 2,
      diagnostics: [
        {
          code: 'ATLAS-UPGRADE-CLI-001',
          severity: 'error',
          message: 'Elige una sola acción: --apply o --rollback',
          suggestion: 'Vista previa: `satlas upgrade` · Aplicar: `satlas upgrade --apply` · Revertir: `satlas upgrade --rollback`',
        },
      ],
    }
  }

  if (rollback) return renderRollback(await rollbackUpgrade(root), ctx)
  if (apply) return renderApply(await applyUpgrade(root), ctx)
  return renderPreview(await planUpgrade(root), root, ctx)
}

function summarizable(plan: UpgradePlan): Record<string, unknown> {
  return {
    currentVersion: plan.currentVersion,
    upToDate: plan.upToDate,
    pending: plan.pending.map((i) => ({ artifact: i.artifact, from: i.from, to: i.to, migration: i.migration })),
    newer: plan.newer.map((n) => ({ artifact: n.artifact, reason: n.reason })),
    unreadable: plan.unreadable.map((u) => ({ artifact: u.artifact, reason: u.reason })),
  }
}

function renderPreview(plan: UpgradePlan, root: string, ctx: CliContext): CommandResult {
  const lines: string[] = [msg('upgrade.title', ctx.language), '']

  if (plan.upToDate && plan.newer.length === 0 && plan.unreadable.length === 0) {
    lines.push(`El estado del proyecto está al día (versión ${plan.currentVersion}). No hay nada que actualizar.`)
    return { exitCode: 0, diagnostics: [], data: summarizable(plan), text: lines }
  }

  lines.push(`${msg('upgrade.preview', ctx.language)}: no se modifica nada.`)
  lines.push(`  Versión vigente: ${plan.currentVersion}`)
  if (plan.pending.length === 0) {
    lines.push('  Elementos por actualizar: 0')
  } else {
    lines.push(`  Elementos por actualizar: ${plan.pending.length}`)
    for (const item of plan.pending) {
      lines.push(`    ${item.artifact}  ${item.from} → ${item.to}  (${item.migration})`)
    }
    lines.push('')
    lines.push(`Aplica la actualización con \`satlas upgrade --apply\`.`)
  }
  for (const item of plan.newer) {
    lines.push(`  Aviso: "${item.artifact}" ${item.reason}`)
  }
  for (const item of plan.unreadable) {
    lines.push(`  Ilegible: "${item.artifact}" — ${item.reason}`)
    lines.push(`    ↳ ${path.relative(ctx.cwd, item.path)}`)
  }
  return { exitCode: 0, diagnostics: [], data: summarizable(plan), text: lines }
}

function renderApply(report: UpgradeApplyReport, ctx: CliContext): CommandResult {
  const lines: string[] = [msg('upgrade.title', ctx.language), '']
  if (report.status === 'up-to-date') {
    lines.push('No había nada que actualizar; no se escribió ningún elemento.')
    return { exitCode: 0, diagnostics: [], data: { status: report.status, plan: summarizable(report.plan) }, text: lines }
  }
  if (report.status === 'failed') {
    lines.push(`La actualización falló en "${report.failure?.artifact}": ${report.failure?.message}`)
    lines.push('El proyecto quedó exactamente como estaba.')
    return {
      exitCode: 1,
      diagnostics: [{ code: 'ATLAS-UPGRADE-101', severity: 'error', message: `Falló la actualización en "${report.failure?.artifact}": ${report.failure?.message}` }],
      data: { status: report.status, failure: report.failure },
      text: lines,
    }
  }
  lines.push(`Actualización aplicada: ${report.applied.length} elemento(s) a la versión ${report.plan.currentVersion}.`)
  lines.push(`Respaldo recuperable: ${report.backup?.relativeDir}`)
  if (report.plan.unreadable.length > 0) {
    lines.push(`No se tocaron ${report.plan.unreadable.length} elemento(s) ilegible(s).`)
  }
  return {
    exitCode: 0,
    diagnostics: [],
    data: {
      status: report.status,
      applied: report.applied.map((i) => i.artifact),
      backup: report.backup,
      plan: summarizable(report.plan),
    },
    text: lines,
  }
}

function renderRollback(report: UpgradeRollbackReport, ctx: CliContext): CommandResult {
  const lines: string[] = [msg('upgrade.title', ctx.language), '']
  if (report.status === 'no-backup') {
    lines.push('No hay respaldo disponible para revertir; no se modificó nada.')
    return {
      exitCode: 1,
      diagnostics: [{ code: 'ATLAS-UPGRADE-102', severity: 'warning', message: 'No hay respaldo disponible para revertir la última actualización' }],
      data: { status: report.status },
      text: lines,
    }
  }
  if (report.status === 'failed') {
    lines.push(`La reversión falló en "${report.failure?.artifact}": ${report.failure?.message}`)
    lines.push('El respaldo se conserva para reintentar.')
    return {
      exitCode: 1,
      diagnostics: [{ code: 'ATLAS-UPGRADE-103', severity: 'error', message: `Falló la reversión en "${report.failure?.artifact}": ${report.failure?.message}` }],
      data: { status: report.status, failure: report.failure },
      text: lines,
    }
  }
  lines.push(`Se restauró el estado previo: ${report.restored.length} elemento(s). El respaldo quedó consumido.`)
  return { exitCode: 0, diagnostics: [], data: { status: report.status, restored: report.restored, backup: report.backup }, text: lines }
}
