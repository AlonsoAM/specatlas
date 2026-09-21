import { agentCommand, type AgentTarget, type PhaseId } from '@specatlas/core'
import type { SnapshotChange } from './logic.js'

export type Actor = 'agent' | 'human' | 'local'
export type Lane = 'fix' | 'standard' | 'full'
export type StepStatus = 'done' | 'skipped' | 'now' | 'pending' | 'blocked'

export interface ActionStep {
  id: string
  lane: Lane
  title: string
  description: string
  actor: Actor
  command: string
  artifact?: 'spec' | 'mockups' | 'plan' | 'tasks' | 'verify' | 'review' | 'docs' | 'presentation' | 'analyze'
}

export interface ActionStepState extends ActionStep {
  status: StepStatus
  enabled: boolean
  reason?: string
}

const STEPS: Record<Lane, ActionStep[]> = {
  fix: [
    { id: 'fix.nuevo', lane: 'fix', title: 'Nuevo cambio (fix)', description: 'Carril express para incidentes: sin ceremonia completa.', actor: 'local', command: 'satlas new <slug> --lane fix' },
    { id: 'fix.corregir', lane: 'fix', title: 'Corregir', description: 'Síntoma, causa raíz, cambio mínimo, reversión y evidencia en un solo artefacto.', actor: 'agent', command: '<agent:fix> <slug>' },
    { id: 'fix.verificar', lane: 'fix', title: 'Verificar', description: 'Registra la evidencia del fix; sin resultado favorable no se archiva.', actor: 'local', command: 'satlas verify <slug> --file fix' },
    { id: 'fix.archivar', lane: 'fix', title: 'Archivar', description: 'El fix queda vivo con su contenido íntegro; no pliega deltas a las specs vivas.', actor: 'human', command: 'satlas archive <slug>' },
  ],
  standard: [
    { id: 'std.nuevo', lane: 'standard', title: 'Nuevo cambio', description: 'Asistente de creación: carril, título y dominio.', actor: 'local', command: 'satlas new <slug> --lane standard' },
    { id: 'std.especificar', lane: 'standard', title: 'Especificar', description: 'Propuesta y especificación funcional (requisitos y escenarios).', actor: 'agent', command: '<agent:specify> <slug>', artifact: 'spec' },
    { id: 'std.aclarar', lane: 'standard', title: 'Aclarar', description: 'Supuestos, dependencias y preguntas abiertas antes de planificar.', actor: 'agent', command: '<agent:clarify> <slug>' },
    { id: 'std.mockups', lane: 'standard', title: 'Mockups', description: 'Contrato visual del cambio, si lo requiere.', actor: 'agent', command: '<agent:mockup> <slug>', artifact: 'mockups' },
    { id: 'std.aprobar', lane: 'standard', title: 'Aprobar', description: 'Firma la aprobación con nombre y fecha; queda auditada con la huella de la especificación.', actor: 'human', command: 'satlas approve <slug> --by "<nombre>"' },
    { id: 'std.planificar', lane: 'standard', title: 'Planificar', description: 'Plan técnico y tareas trazadas a los escenarios.', actor: 'agent', command: '<agent:plan> <slug>', artifact: 'plan' },
    { id: 'std.construir', lane: 'standard', title: 'Construir', description: 'Implementa las tareas por olas paralelas, con evidencia.', actor: 'agent', command: '<agent:build> <slug>', artifact: 'tasks' },
    { id: 'std.verificar', lane: 'standard', title: 'Verificar', description: 'Registra la evidencia por escenario (comando y resultado).', actor: 'local', command: 'satlas verify <slug>', artifact: 'verify' },
    { id: 'std.revisar', lane: 'standard', title: 'Revisar', description: 'Revisión de código con lentes por tamaño del diff y verificación adversarial.', actor: 'agent', command: '<agent:review> <slug>', artifact: 'review' },
    { id: 'std.analizar', lane: 'standard', title: 'Analizar', description: 'Analiza el cambio (gates, evidencia y avisos) y deja su informe en el cambio.', actor: 'local', command: 'satlas analyze <slug>', artifact: 'analyze' },
    { id: 'std.archivar', lane: 'standard', title: 'Archivar', description: 'Pliega los deltas en la spec viva y mueve el cambio al histórico.', actor: 'human', command: 'satlas archive <slug>' },
  ],
  full: [
    { id: 'full.nuevo', lane: 'full', title: 'Nuevo cambio (full)', description: 'Carril completo: suma revisión y documentación al estándar.', actor: 'local', command: 'satlas new <slug> --lane full' },
    { id: 'full.especificar', lane: 'full', title: 'Especificar', description: 'Propuesta y especificación funcional.', actor: 'agent', command: '<agent:specify> <slug>', artifact: 'spec' },
    { id: 'full.aclarar', lane: 'full', title: 'Aclarar', description: 'Vacía supuestos, dependencias y preguntas abiertas antes de planificar.', actor: 'agent', command: '<agent:clarify> <slug>' },
    { id: 'full.mockups', lane: 'full', title: 'Mockups', description: 'Contrato visual, solo si el cambio declara que los requiere.', actor: 'agent', command: '<agent:mockup> <slug>', artifact: 'mockups' },
    { id: 'full.aprobar', lane: 'full', title: 'Aprobar', description: 'Firma con nombre y fecha.', actor: 'human', command: 'satlas approve <slug> --by "<nombre>"' },
    { id: 'full.planificar', lane: 'full', title: 'Planificar', description: 'Plan técnico con diagramas y tareas trazadas.', actor: 'agent', command: '<agent:plan> <slug>', artifact: 'plan' },
    { id: 'full.construir', lane: 'full', title: 'Construir', description: 'Implementa por olas paralelas, con evidencia.', actor: 'agent', command: '<agent:build> <slug>', artifact: 'tasks' },
    { id: 'full.verificar', lane: 'full', title: 'Verificar', description: 'Evidencia por escenario.', actor: 'local', command: 'satlas verify <slug>', artifact: 'verify' },
    { id: 'full.revisar', lane: 'full', title: 'Revisar', description: 'Revisión de código con lentes por tamaño del diff y verificación adversarial.', actor: 'agent', command: '<agent:review> <slug>', artifact: 'review' },
    { id: 'full.analizar', lane: 'full', title: 'Analizar', description: 'Analiza el cambio (gates, evidencia y avisos) y deja su informe en el cambio.', actor: 'local', command: 'satlas analyze <slug>', artifact: 'analyze' },
    { id: 'full.documentar', lane: 'full', title: 'Documentar', description: 'Documento técnico y manual en texto fuente, HTML y PDF.', actor: 'agent', command: '<agent:docs> <slug>', artifact: 'docs' },
    { id: 'full.contratos', lane: 'full', title: 'Contratos', description: 'Comprueba los contratos declarados y su cobertura por escenario.', actor: 'local', command: 'satlas contracts <slug>' },
    { id: 'full.archivar', lane: 'full', title: 'Archivar', description: 'Cierra el cambio y pliega los deltas.', actor: 'human', command: 'satlas archive <slug>' },
  ],
}

export function laneOf(change: SnapshotChange): Lane {
  if (change.lane === 'fix' || change.lane === 'full') return change.lane
  return 'standard'
}

const CURRENT_STEP: Record<Lane, Record<string, string>> = {
  fix: {
    draft: 'fix.corregir',
    built: 'fix.verificar',
    ready: 'fix.archivar',
  },
  standard: {
    draft: 'std.especificar',
    spec_draft: 'std.especificar',
    awaiting_mockups: 'std.mockups',
    awaiting_approval: 'std.aprobar',
    approved: 'std.planificar',
    planned: 'std.planificar',
    building: 'std.construir',
    built: 'std.verificar',
    verified: 'std.revisar',
    reviewed: 'std.archivar',
    ready: 'std.archivar',
  },
  full: {
    draft: 'full.especificar',
    spec_draft: 'full.especificar',
    awaiting_mockups: 'full.mockups',
    awaiting_approval: 'full.aprobar',
    approved: 'full.planificar',
    planned: 'full.planificar',
    building: 'full.construir',
    built: 'full.verificar',
    verified: 'full.revisar',
    reviewed: 'full.documentar',
    ready: 'full.archivar',
  },
}

export function stepsForLane(lane: Lane): ActionStep[] {
  return STEPS[lane]
}

export function buildStepStates(change: SnapshotChange): ActionStepState[] {
  const lane = laneOf(change)
  const steps = STEPS[lane]
  const currentId = CURRENT_STEP[lane][change.state] ?? steps[steps.length - 1]!.id
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentId))
  const hasClarify = change.files.some((file) => file.kind === 'clarify' && file.exists)
  const hasMockups = change.mockups.screens > 0
  const contracts = change.files.some((file) => file.kind === 'docs' && file.exists)
  const hasArtifact = (kind: string | undefined): boolean => Boolean(kind) && change.files.some((file) => file.kind === kind && file.exists)

  const states: ActionStepState[] = steps
    .map((step, index) => {
    const base: ActionStepState = { ...step, status: 'pending', enabled: false }
    if (index < currentIndex) {
      if (step.id.endsWith('.aclarar') && !hasClarify) {
        return { ...base, status: 'skipped' as StepStatus, enabled: true, reason: 'sin preguntas abiertas; puedes aclarar igualmente para dejar constancia' }
      }
      if ((step.id.endsWith('.revisar') || step.id.endsWith('.analizar')) && !hasArtifact(step.artifact)) {
        return {
          ...base,
          status: 'pending' as StepStatus,
          enabled: true,
          reason: step.id.endsWith('.revisar') ? 'recomendado antes de archivar: revisión de código con evidencia' : 'opcional: analiza el cambio antes de archivar',
        }
      }
      base.status = 'done'
      base.enabled = step.actor === 'agent' || step.actor === 'local'
      return base
    }
    if (index > currentIndex) {
      base.status = 'pending'
      base.enabled = false
      const previous = steps[index - 1]
      base.reason = previous ? `no aplica todavía: requiere «${previous.title}»` : undefined
      return base
    }
    base.status = 'now'
    base.enabled = true
    return base
  })
    .map((step) => {
    if ((step.id.endsWith('.revisar') || step.id.endsWith('.analizar')) && step.status !== 'done') {
      if (hasArtifact(step.artifact)) return { ...step, status: 'done' as StepStatus, enabled: true, reason: undefined }
      return {
        ...step,
        status: step.status === 'now' ? ('now' as StepStatus) : ('pending' as StepStatus),
        enabled: true,
        reason: step.id.endsWith('.revisar') ? 'recomendado antes de archivar: revisión de código con evidencia' : 'opcional: analiza el cambio antes de archivar',
      }
    }
    if (step.id.endsWith('.mockups') && step.status !== 'done' && !hasMockups && change.mockups.decision !== 'required') {
      return { ...step, reason: step.reason ?? 'no aplica: el cambio no declara mockups' }
    }
    if (step.id.endsWith('.contratos') && step.status !== 'done' && !contracts) {
      return { ...step, reason: 'solo si el cambio declara contratos' }
    }
    if (step.id.endsWith('.archivar') && step.status !== 'now' && step.status !== 'done') {
      return { ...step, status: 'blocked' as StepStatus, reason: change.blockedBy[0] ?? 'no aplica todavía' }
    }
    return step
  })
  const hasNow = states.some((step) => step.status === 'now')
  if (!hasNow) {
    const nextIndex = states.findIndex((step) => step.status !== 'done')
    if (nextIndex >= 0) states[nextIndex] = { ...states[nextIndex]!, status: 'now', enabled: true }
  }
  return states
}

export interface CatalogAction {
  id: string
  title: string
  description: string
  actor: Actor
  command: string
}

export const PROJECT_ACTIONS: CatalogAction[] = [
  { id: 'present', title: 'Presentar', description: 'Genera la presentación para aprobar: propuesta, especificación y mockups en una página lista para leer, imprimir o firmar.', actor: 'local', command: 'satlas present <slug>' },
  { id: 'validate', title: 'Validar', description: 'Estructura y lenguaje de negocio de specs y deltas.', actor: 'local', command: 'satlas validate' },
  { id: 'ci', title: 'CI (gate local)', description: 'Specs, cambios, diagnóstico y adaptadores: el mismo veredicto que la terminal.', actor: 'local', command: 'satlas ci' },
  { id: 'doctor', title: 'Diagnóstico', description: 'Salud de .sdd/ y gates del proyecto.', actor: 'local', command: 'satlas doctor' },
  { id: 'adapters', title: 'Compilar adaptadores', description: 'Regenera los comandos y skills del agente desde el flujo de trabajo.', actor: 'local', command: 'satlas adapters' },
  { id: 'upgrade', title: 'Actualizar esquema', description: 'Migra el estado del proyecto a la versión vigente, con vista previa y respaldo.', actor: 'local', command: 'satlas upgrade' },
  { id: 'link', title: 'Enlazar repos', description: 'Enlaza otros proyectos y consulta sus specs en solo lectura.', actor: 'local', command: 'satlas link list' },
  { id: 'packs', title: 'Packs de cumplimiento', description: 'Evalúa los packs activos (seguridad, datos, auditoría, accesibilidad).', actor: 'local', command: 'satlas packs' },
]

/**
 * Los pasos declaran la fase (`<agent:plan>`), no la invocación: cada agente
 * tiene la suya y se resuelve con el target configurado en el proyecto.
 */
export function resolveCommand(command: string, slug: string | undefined, agent: AgentTarget | undefined): string {
  return command
    .replace(/<agent:([a-z]+)>/g, (_match, phase: string) => agentCommand(phase as PhaseId, '', agent ? { adapters: { targets: [agent] } } : undefined))
    .replace(/<slug>/g, slug ?? '<slug>')
    .trim()
}
