import path from 'node:path'
import type { AtlasConfig } from './config.js'
import type { Change, ChangeMeta, Lane } from './model.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { artifactHash } from './hash.js'
import { contractCoverage } from './contracts.js'
import { agentCommand } from './agents.js'
import { isSkeletonDelta } from './placeholders.js'
import { openBlockingFindings, reviewPassed } from './parse/review.js'

export type ChangeState =
  | 'draft'
  | 'spec_draft'
  | 'awaiting_mockups'
  | 'awaiting_approval'
  | 'paused'
  | 'approved'
  | 'planned'
  | 'building'
  | 'built'
  | 'verified'
  | 'reviewed'
  | 'ready'
  | 'archived'

export interface NextAction {
  command: string
  description: string
  requiresAgent: boolean
}

export interface DerivedState {
  state: ChangeState
  blockedBy: string[]
  nextAction: NextAction
  progress: { tasksDone: number; tasksTotal: number; scenariosEvidenced: number; scenariosTotal: number }
}

export interface ApprovalStatus {
  status: 'valid' | 'stale' | 'missing' | 'not_required' | 'overridden'
  approvedBy?: string
  approvedAt?: string
}

export function verifyApproval(change: Change, approvals: Map<string, { hash: string; by: string; at: string }>, cfg: AtlasConfig, specContent?: string): ApprovalStatus {
  if (cfg.gates.approval === 'none') return { status: 'not_required' }
  if ((change.meta?.overrides ?? []).some((o) => o.gate === 'approval')) return { status: 'overridden' }
  if (!change.delta) return { status: 'missing' }
  const key = path.posix.join('changes', change.slug, 'spec.md')
  const approval = approvals.get(key) ?? approvals.get(`${key}`)
  if (!approval) return { status: 'missing' }
  if (specContent === undefined) return { status: 'valid', approvedBy: approval.by, approvedAt: approval.at }
  const current = artifactHash(specContent)
  if (current !== approval.hash) return { status: 'stale', approvedBy: approval.by, approvedAt: approval.at }
  return { status: 'valid', approvedBy: approval.by, approvedAt: approval.at }
}

export interface DeriveInput {
  change: Change
  cfg: AtlasConfig
  approval: ApprovalStatus
  blockingFindings: number
  /**
   * Hallazgos de la especificación misma (lint del delta). Se separan del resto
   * porque corregir la spec va antes de firmarla, mientras que los huecos de
   * trazabilidad llegan después y no pueden saltarse la firma.
   */
  specFindings?: number
  mockupsReady?: boolean
  specContent?: string
}

export function requiresMockups(meta: ChangeMeta | undefined, cfg: AtlasConfig): boolean {
  if (meta?.mockups === 'required') return true
  if (meta?.mockups === 'skip') return false
  return cfg.gates.mockup.require_approval
}

function mockupOverride(change: Change): boolean {
  return (change.meta?.overrides ?? []).some((override) => override.gate === 'mockup')
}

export function docsReady(change: Change): boolean {
  const paths = change.docsPaths ?? []
  return paths.some((p) => p.endsWith('tecnica.md')) && paths.some((p) => p.endsWith('manual.md'))
}

export function clarifyAdvisory(change: Change, cfg: AtlasConfig): Diagnostic[] {
  const open = change.clarify?.open.length ?? 0
  if (cfg.gates.clarify.mode !== 'advisory' || open === 0) return []
  return [
    diag('ATLAS-CLARIFY-001', 'warning', `El cambio "${change.slug}" tiene ${open} pregunta(s) sin aclarar`, {
      ...(change.clarifyPath !== undefined ? { path: change.clarifyPath } : {}),
      suggestion: `Aclara antes de planificar: ${agentCommand('clarify', change.slug, cfg)} (o satlas clarify ${change.slug})`,
    }),
  ]
}

export function reviewAdvisory(change: Change, cfg: AtlasConfig): Diagnostic[] {
  const lane = change.meta?.lane ?? cfg.lanes.default
  if (lane === 'fix' || cfg.gates.review.mode !== 'advisory') return []
  // Revisar código tiene sentido cuando ya hay código: se avisa con las tareas terminadas.
  const tasks = change.tasks?.counts
  if (!tasks || tasks.total === 0 || tasks.done < tasks.total) return []
  if (!change.reviewPath) {
    return [
      diag('ATLAS-REVIEW-001', 'warning', `El cambio "${change.slug}" no tiene revisión de código (review.md)`, {
        suggestion: `Revisa antes del PR: satlas review ${change.slug}`,
      }),
    ]
  }
  if (change.review && !reviewPassed(change.review)) {
    const open = openBlockingFindings(change.review).length
    const motivo = change.review.verdict === 'pass' ? `${open} hallazgo(s) bloqueante(s) sin resolver` : `resultado "${change.review.verdict}"`
    return [
      diag('ATLAS-REVIEW-003', 'warning', `La revisión del cambio "${change.slug}" no está cerrada: ${motivo}`, {
        ...(change.reviewPath !== undefined ? { path: change.reviewPath } : {}),
        suggestion: 'Resuelve los hallazgos bloqueantes y deja `- resultado: pass` en el veredicto',
      }),
    ]
  }
  return []
}

export function docsAdvisory(change: Change, cfg: AtlasConfig): Diagnostic[] {
  const lane = change.meta?.lane ?? cfg.lanes.default
  if (lane !== 'full' || cfg.gates.docs.mode !== 'advisory' || docsReady(change)) return []
  return [
    diag('ATLAS-DOCS-001', 'warning', `El cambio "${change.slug}" (carril completo) no tiene su documentación técnica y manual`, {
      suggestion: `Genera la documentación: satlas docs ${change.slug} (o ${agentCommand('docs', change.slug, cfg)})`,
    }),
  ]
}

export function deriveState(input: DeriveInput): DerivedState {
  const { change, cfg, approval, blockingFindings } = input
  const lane: Lane = change.meta?.lane ?? cfg.lanes.default
  const tasksTotal = change.tasks?.counts.total ?? 0
  const tasksDone = change.tasks?.counts.done ?? 0
  const deltaScenarios = [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])].flatMap((r) => r.scenarios)
  const passed = new Set((change.verify?.evidence ?? []).filter((e) => e.result === 'pass').map((e) => e.scenario))
  const scenariosEvidenced = deltaScenarios.filter((s) => passed.has(s.id)).length
  const progress = { tasksDone, tasksTotal, scenariosEvidenced, scenariosTotal: deltaScenarios.length }

  const blockedBy: string[] = []
  const next = (command: string, description: string, requiresAgent = false): NextAction => ({ command, description, requiresAgent })

  if (change.meta?.paused) {
    return { state: 'paused', blockedBy: [`pausado: ${change.meta.paused.reason}`], nextAction: next(`satlas resume ${change.slug}`, 'Reanudar el cambio pausado'), progress }
  }

  if (lane === 'fix') {
    const fixEvidence = change.fix?.evidence ?? []
    if (fixEvidence.length === 0) {
      return { state: 'draft', blockedBy, nextAction: next(agentCommand('fix', change.slug, cfg), 'Investigar la causa raíz, aplicar el fix y registrar la evidencia', true), progress }
    }
    if (!fixEvidence.some((e) => e.result === 'pass')) {
      blockedBy.push('la evidencia del fix no está en pass')
      return { state: 'built', blockedBy, nextAction: next(`satlas verify ${change.slug} --file fix`, 'Corregir y registrar la evidencia del fix'), progress }
    }
    return { state: 'ready', blockedBy, nextAction: next(`satlas archive ${change.slug}`, 'Archivar el fix (carril express, sin plegar deltas)'), progress }
  }

  if (!change.delta) {
    return { state: 'draft', blockedBy, nextAction: next(agentCommand('specify', change.slug, cfg), 'Especificar el cambio (spec funcional y de negocio)', true), progress }
  }

  if (isSkeletonDelta(change.delta)) {
    blockedBy.push('la especificación sigue siendo la plantilla de `satlas new`')
    return {
      state: 'spec_draft',
      blockedBy,
      nextAction: next(agentCommand('specify', change.slug, cfg), 'Especificar el cambio (spec funcional y de negocio)', true),
      progress,
    }
  }

  // Una especificación con hallazgos propios se corrige antes de firmarse.
  const specFindings = input.specFindings ?? (tasksTotal === 0 ? blockingFindings : 0)
  if (specFindings > 0) {
    blockedBy.push(`${specFindings} hallazgo(s) en la especificación`)
    return { state: 'spec_draft', blockedBy, nextAction: next(`satlas validate --change ${change.slug}`, 'Corregir los hallazgos de la especificación'), progress }
  }

  if ((approval.status === 'missing' || approval.status === 'stale') && requiresMockups(change.meta, cfg) && input.mockupsReady !== true && !mockupOverride(change)) {
    return {
      state: 'awaiting_mockups',
      blockedBy: ['mockups requeridos y no listos'],
      nextAction: next(agentCommand('mockup', change.slug, cfg), 'Generar los mockups (contrato visual) antes de aprobar', true),
      progress,
    }
  }

  if (approval.status === 'missing' || approval.status === 'stale') {
    blockedBy.push(approval.status === 'stale' ? 'la firma de la spec quedó obsoleta (el archivo cambió)' : 'la spec no está aprobada')
    const presented = change.presentationPath !== undefined
    return {
      state: 'awaiting_approval',
      blockedBy,
      nextAction: presented
        ? next(`satlas approve ${change.slug} --by "<nombre>"`, 'Firmar la aprobación (la presentación ya está generada)')
        : next(`satlas present ${change.slug}`, 'Presentar la propuesta y firmar la aprobación (satlas approve)'),
      progress,
    }
  }

  // Huecos de trazabilidad y de tareas: ya con la firma vigente.
  if (blockingFindings > 0) {
    blockedBy.push(`${blockingFindings} hallazgo(s) bloqueante(s)`)
    if (tasksTotal > 0 && tasksDone < tasksTotal) {
      return {
        state: 'building',
        blockedBy,
        nextAction: next(agentCommand('build', change.slug, cfg), `Construir en olas (${tasksDone}/${tasksTotal} tareas) · ${blockingFindings} hallazgo(s) pendientes`, true),
        progress,
      }
    }
    if (tasksTotal > 0) {
      return { state: 'built', blockedBy, nextAction: next(`satlas verify ${change.slug}`, 'Registrar evidencia por escenario'), progress }
    }
  }

  if (!change.planPath && !change.tasks) {
    const openQuestions = change.clarify?.open.length ?? 0
    if (openQuestions > 0 && cfg.gates.clarify.mode === 'blocking') {
      blockedBy.push(`aclaración pendiente (${openQuestions})`)
      return {
        state: 'approved',
        blockedBy,
        nextAction: next(agentCommand('clarify', change.slug, cfg), `Aclarar ${openQuestions} pregunta(s) antes de planificar`, true),
        progress,
      }
    }
    return { state: 'approved', blockedBy, nextAction: next(agentCommand('plan', change.slug, cfg), 'Crear el plan técnico y las tareas', true), progress }
  }

  if (tasksTotal > 0 && tasksDone < tasksTotal) {
    return { state: 'building', blockedBy, nextAction: next(agentCommand('build', change.slug, cfg), `Construir en olas (${tasksDone}/${tasksTotal} tareas)`, true), progress }
  }

  if (cfg.gates.verify.mode !== 'off' && cfg.gates.verify.require_evidence && deltaScenarios.length > 0 && scenariosEvidenced < deltaScenarios.length) {
    blockedBy.push(`evidencia ${scenariosEvidenced}/${deltaScenarios.length}`)
    return { state: 'built', blockedBy, nextAction: next(`satlas verify ${change.slug}`, 'Registrar evidencia por escenario'), progress }
  }

  if (cfg.gates.review.mode === 'blocking' && !reviewPassed(change.review)) {
    const openFindings = change.review ? openBlockingFindings(change.review).length : 0
    blockedBy.push(
      !change.reviewPath
        ? 'review pendiente'
        : openFindings > 0
          ? `review con ${openFindings} hallazgo(s) bloqueante(s)`
          : `review sin resultado favorable (${change.review?.verdict ?? 'pendiente'})`,
    )
    return {
      state: 'verified',
      blockedBy,
      nextAction: !change.reviewPath
        ? next(agentCommand('review', change.slug, cfg), 'Revisión de código', true)
        : next(`satlas review ${change.slug}`, 'Cerrar los hallazgos de la revisión'),
      progress,
    }
  }

  if (lane === 'full' && cfg.gates.docs.mode === 'blocking' && !docsReady(change)) {
    blockedBy.push('documentación pendiente')
    return { state: 'reviewed', blockedBy, nextAction: next(agentCommand('docs', change.slug, cfg), 'Generar la documentación técnica y manual del cambio', true), progress }
  }

  if (cfg.gates.contracts.mode === 'blocking') {
    const contractFindings = contractCoverage(change, 'blocking')
    if (contractFindings.length > 0) {
      blockedBy.push(`contratos con hallazgos (${contractFindings.length})`)
      return { state: 'verified', blockedBy, nextAction: next(`satlas contracts ${change.slug}`, 'Resolver los hallazgos de contrato antes de archivar'), progress }
    }
  }

  return { state: 'ready', blockedBy, nextAction: next(`satlas archive ${change.slug}`, 'Archivar el cambio y plegar los deltas'), progress }
}

export function stateLabel(state: ChangeState): string {
  const labels: Record<ChangeState, string> = {
    draft: 'borrador',
    spec_draft: 'spec en borrador',
    awaiting_mockups: 'esperando mockups',
    awaiting_approval: 'esperando aprobación',
    paused: 'pausado',
    approved: 'aprobado',
    planned: 'planificado',
    building: 'construyendo',
    built: 'construido',
    verified: 'verificado',
    reviewed: 'revisado',
    ready: 'listo para archivar',
    archived: 'archivado',
  }
  return labels[state]
}
