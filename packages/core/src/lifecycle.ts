import path from 'node:path'
import type { AtlasConfig } from './config.js'
import type { Change, ChangeMeta, Lane } from './model.js'
import { artifactHash } from './hash.js'

export type ChangeState =
  | 'draft'
  | 'spec_draft'
  | 'awaiting_mockups'
  | 'awaiting_approval'
  | 'approved'
  | 'planned'
  | 'building'
  | 'built'
  | 'verified'
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
    return { state: 'building', blockedBy: [`pausado: ${change.meta.paused.reason}`], nextAction: next(`satlas resume ${change.slug}`, 'Reanudar el cambio pausado'), progress }
  }

  if (lane === 'fix') {
    const fixEvidence = change.fix?.evidence ?? []
    if (fixEvidence.length === 0) {
      return { state: 'draft', blockedBy, nextAction: next(`/satlas-fix ${change.slug}`, 'Investigar la causa raíz, aplicar el fix y registrar la evidencia', true), progress }
    }
    if (!fixEvidence.some((e) => e.result === 'pass')) {
      blockedBy.push('la evidencia del fix no está en pass')
      return { state: 'built', blockedBy, nextAction: next(`satlas verify ${change.slug} --file fix`, 'Corregir y registrar la evidencia del fix'), progress }
    }
    return { state: 'ready', blockedBy, nextAction: next(`satlas archive ${change.slug}`, 'Archivar el fix (carril express, sin plegar deltas)'), progress }
  }

  if (!change.delta) {
    return { state: 'draft', blockedBy, nextAction: next(`/satlas.specify ${change.slug}`, 'Especificar el cambio (spec funcional y de negocio)', true), progress }
  }

  if (blockingFindings > 0) {
    blockedBy.push(`${blockingFindings} hallazgo(s) bloqueante(s)`)
    return { state: 'spec_draft', blockedBy, nextAction: next(`satlas validate --change ${change.slug}`, 'Corregir los hallazgos de la especificación'), progress }
  }

  if ((approval.status === 'missing' || approval.status === 'stale') && requiresMockups(change.meta, cfg) && input.mockupsReady !== true && !mockupOverride(change)) {
    return {
      state: 'awaiting_mockups',
      blockedBy: ['mockups requeridos y no listos'],
      nextAction: next(`/satlas-mockup ${change.slug}`, 'Generar los mockups (contrato visual) antes de aprobar', true),
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

  if (!change.planPath && !change.tasks) {
    return { state: 'approved', blockedBy, nextAction: next(`/satlas.plan ${change.slug}`, 'Crear el plan técnico y las tareas', true), progress }
  }

  if (tasksTotal > 0 && tasksDone < tasksTotal) {
    return { state: 'building', blockedBy, nextAction: next(`/satlas.build ${change.slug}`, `Construir en olas (${tasksDone}/${tasksTotal} tareas)`, true), progress }
  }

  if (cfg.gates.verify.mode !== 'off' && cfg.gates.verify.require_evidence && deltaScenarios.length > 0 && scenariosEvidenced < deltaScenarios.length) {
    blockedBy.push(`evidencia ${scenariosEvidenced}/${deltaScenarios.length}`)
    return { state: 'built', blockedBy, nextAction: next(`satlas verify ${change.slug}`, 'Registrar evidencia por escenario'), progress }
  }

  if (lane === 'full' && cfg.gates.review.mode === 'blocking' && !change.reviewPath) {
    blockedBy.push('review pendiente')
    return { state: 'verified', blockedBy, nextAction: next(`/satlas.review ${change.slug}`, 'Revisión de código', true), progress }
  }

  return { state: 'ready', blockedBy, nextAction: next(`satlas archive ${change.slug}`, 'Archivar el cambio y plegar los deltas'), progress }
}

export function stateLabel(state: ChangeState): string {
  const labels: Record<ChangeState, string> = {
    draft: 'borrador',
    spec_draft: 'spec en borrador',
    awaiting_mockups: 'esperando mockups',
    awaiting_approval: 'esperando aprobación',
    approved: 'aprobado',
    planned: 'planificado',
    building: 'construyendo',
    built: 'construido',
    verified: 'verificado',
    ready: 'listo para archivar',
    archived: 'archivado',
  }
  return labels[state]
}
