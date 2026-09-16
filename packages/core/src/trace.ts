import type { Diagnostic } from './diagnostics.js'
import { countBySeverity, diag } from './diagnostics.js'
import type { Change, SpecRef } from './model.js'

export interface TraceNode {
  kind: 'requirement' | 'scenario' | 'task' | 'evidence'
  id: string
}

export interface TraceEdge {
  from: string
  to: string
  kind: 'covers' | 'evidences' | 'depends'
}

export interface TraceGraph {
  nodes: TraceNode[]
  edges: TraceEdge[]
}

export interface TraceFinding extends Diagnostic {
  target?: string
}

export interface TraceResult {
  graph: TraceGraph
  findings: TraceFinding[]
  summary: { errors: number; warnings: number; infos: number }
}

export interface TraceInput {
  specs: SpecRef[]
  change: Change
  requireEvidence: boolean
}

export function buildTraceGraph(input: TraceInput): TraceGraph {
  const nodes: TraceNode[] = []
  const edges: TraceEdge[] = []
  const { change } = input
  const reqIds = new Set<string>()
  const scenarioIds = new Set<string>()

  for (const spec of input.specs) {
    for (const req of spec.spec.requirements) {
      reqIds.add(req.id)
      nodes.push({ kind: 'requirement', id: req.id })
      for (const sc of req.scenarios) {
        scenarioIds.add(sc.id)
        nodes.push({ kind: 'scenario', id: sc.id })
      }
    }
  }
  for (const deltaList of [change.delta?.added ?? [], change.delta?.modified ?? []]) {
    for (const req of deltaList) {
      if (!reqIds.has(req.id)) nodes.push({ kind: 'requirement', id: req.id })
      reqIds.add(req.id)
      for (const sc of req.scenarios) {
        if (!scenarioIds.has(sc.id)) nodes.push({ kind: 'scenario', id: sc.id })
        scenarioIds.add(sc.id)
      }
    }
  }

  for (const block of change.tasks?.blocks ?? []) {
    for (const task of block.tasks) {
      nodes.push({ kind: 'task', id: task.id })
      for (const cover of task.covers) edges.push({ from: task.id, to: cover, kind: 'covers' })
      for (const dep of task.dependsOn) edges.push({ from: task.id, to: dep, kind: 'depends' })
    }
  }
  for (const ev of change.verify?.evidence ?? []) {
    nodes.push({ kind: 'evidence', id: `${ev.scenario}@${ev.line}` })
    edges.push({ from: `${ev.scenario}@${ev.line}`, to: ev.scenario, kind: 'evidences' })
  }
  return { nodes, edges }
}

export function checkTrace(input: TraceInput): TraceResult {
  const { change, specs, requireEvidence } = input
  const findings: TraceFinding[] = []
  const livingReqs = new Map<string, { id: string; scenarios: string[] }>()
  const allScenarioIds = new Set<string>()
  for (const spec of specs) {
    for (const req of spec.spec.requirements) {
      livingReqs.set(req.id, { id: req.id, scenarios: req.scenarios.map((s) => s.id) })
      for (const sc of req.scenarios) allScenarioIds.add(sc.id)
    }
  }

  const deltaAdded = change.delta?.added ?? []
  const deltaModified = change.delta?.modified ?? []
  const deltaScenarios = new Set<string>()
  for (const req of [...deltaAdded, ...deltaModified]) {
    for (const sc of req.scenarios) {
      deltaScenarios.add(sc.id)
      allScenarioIds.add(sc.id)
    }
  }

  const taskById = new Map<string, { id: string; covers: string[]; dependsOn: string[]; block: string }>()
  const covers = new Set<string>()
  for (const block of change.tasks?.blocks ?? []) {
    for (const task of block.tasks) {
      taskById.set(task.id, { id: task.id, covers: task.covers, dependsOn: task.dependsOn, block: task.block })
      for (const c of task.covers) covers.add(c)
    }
  }
  const coversExpanded = new Set<string>(covers)
  const deltaReqScenarios = new Map<string, string[]>()
  for (const req of [...deltaAdded, ...deltaModified]) deltaReqScenarios.set(req.id, req.scenarios.map((s) => s.id))
  for (const c of covers) {
    const req = livingReqs.get(c)
    if (req) for (const sc of req.scenarios) coversExpanded.add(sc)
    const deltaScenariosOfReq = deltaReqScenarios.get(c)
    if (deltaScenariosOfReq) for (const sc of deltaScenariosOfReq) coversExpanded.add(sc)
  }

  for (const req of [...deltaAdded, ...deltaModified]) {
    if (req.scenarios.length === 0) {
      findings.push(diag('TRACE-001', 'error', `El requisito ${req.id} no tiene escenarios`, { path: change.delta?.path, line: req.line }) as TraceFinding)
    }
  }

  for (const sc of deltaScenarios) {
    if (taskById.size > 0 && !coversExpanded.has(sc)) {
      findings.push(
        diag('TRACE-002', 'error', `El escenario ${sc} no está cubierto por ninguna tarea`, {
          path: change.tasks?.path ?? change.delta?.path,
          suggestion: `Añade una tarea con · Cubre: ${sc}`,
        }) as TraceFinding,
      )
    }
  }

  for (const task of taskById.values()) {
    for (const c of task.covers) {
      if (!livingReqs.has(c) && !deltaScenarios.has(c) && !allScenarioIds.has(c)) {
        findings.push(
          diag('TRACE-003', 'error', `La tarea ${task.id} cubre ${c}, que no existe`, {
            path: change.tasks?.path,
            suggestion: 'Corrige el id o crea el requisito/escenario',
          }) as TraceFinding,
        )
      }
    }
    for (const dep of task.dependsOn) {
      const target = taskById.get(dep)
      if (!target) {
        findings.push(diag('TRACE-009', 'error', `La tarea ${task.id} depende de ${dep}, que no existe`, { path: change.tasks?.path }) as TraceFinding)
      } else if (target.block !== task.block) {
        findings.push(diag('TRACE-009', 'warning', `La tarea ${task.id} depende de ${dep} de otro bloque (${target.block})`, { path: change.tasks?.path }) as TraceFinding)
      }
    }
  }

  const cycles = findCycles(taskById)
  for (const cycle of cycles) {
    findings.push(diag('TRACE-010', 'error', `Ciclo de dependencias: ${cycle.join(' → ')}`, { path: change.tasks?.path }) as TraceFinding)
  }

  const tasksDone = change.tasks !== undefined && change.tasks.counts.total > 0 && change.tasks.counts.done === change.tasks.counts.total
  if (requireEvidence && tasksDone) {
    const passed = new Set((change.verify?.evidence ?? []).filter((e) => e.result === 'pass').map((e) => e.scenario))
    for (const sc of deltaScenarios) {
      if (!passed.has(sc)) {
        findings.push(
          diag('TRACE-005', 'error', `El escenario ${sc} no tiene evidencia de verificación (result: pass)`, {
            path: change.verify?.path ?? `changes/${change.slug}/verify.md`,
            suggestion: `Registra evidencia: satlas verify --record ${sc} --command "…"`,
          }) as TraceFinding,
        )
      }
    }
  }

  const knownScenarios = new Set<string>([...allScenarioIds, ...deltaScenarios])
  for (const ev of change.verify?.evidence ?? []) {
    if (!knownScenarios.has(ev.scenario)) {
      findings.push(diag('TRACE-006', 'warning', `Evidencia huérfana: ${ev.scenario} no existe`, { path: change.verify?.path, line: ev.line }) as TraceFinding)
    }
  }

  const summary = countBySeverity(findings)
  return { graph: buildTraceGraph(input), findings, summary }
}

function findCycles(taskById: Map<string, { id: string; dependsOn: string[] }>): string[][] {
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const cycles: string[][] = []

  const visit = (id: string, stack: string[]): void => {
    if (inStack.has(id)) {
      const idx = stack.indexOf(id)
      cycles.push([...stack.slice(idx), id])
      return
    }
    if (visited.has(id)) return
    visited.add(id)
    inStack.add(id)
    stack.push(id)
    for (const dep of taskById.get(id)?.dependsOn ?? []) {
      if (taskById.has(dep)) visit(dep, stack)
    }
    stack.pop()
    inStack.delete(id)
  }

  for (const id of taskById.keys()) visit(id, [])
  return cycles
}
