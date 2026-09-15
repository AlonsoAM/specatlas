import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import type { Task, TaskBlock, TasksFile } from './model.js'
import { toPosix } from './fsx.js'

export interface BlockWavePlan {
  block: string
  title: string
  waves: Task[][]
  degraded: Array<{ task: string; reason: 'file-collision' | 'orphan-dependency'; movedToWave: number }>
  diagnostics: Diagnostic[]
}

export interface WavePlan {
  maxParallel: number
  blocks: BlockWavePlan[]
  summary: { blocks: number; waves: number; tasks: number }
}

export function compareTaskIds(a: string, b: string): number {
  const parse = (id: string): [string, number, number] => {
    const m = /^T([A-Za-z0-9]+)\.(\d+)$/.exec(id)
    if (!m) return [id, 0, 0]
    const blockPart = m[1] ?? ''
    const blockNum = Number.parseInt(blockPart, 10)
    const isNumeric = !Number.isNaN(blockNum)
    return [isNumeric ? '' : blockPart, isNumeric ? blockNum : 0, Number.parseInt(m[2] ?? '0', 10)]
  }
  const pa = parse(a)
  const pb = parse(b)
  if (pa[0] !== pb[0]) return pa[0] < pb[0] ? -1 : 1
  if (pa[1] !== pb[1]) return pa[1] - pb[1]
  return pa[2] - pb[2]
}

function normalizeFile(file: string): string {
  return toPosix(file.trim().toLowerCase())
}

export function planWaves(tasks: TasksFile, opts: { maxParallel?: number } = {}): WavePlan {
  const maxParallel = Math.max(1, Math.min(opts.maxParallel ?? 3, 8))
  const blocks: BlockWavePlan[] = []
  let totalWaves = 0

  for (const block of tasks.blocks) {
    const plan = planBlock(block, maxParallel)
    blocks.push(plan)
    totalWaves += plan.waves.length
  }

  return {
    maxParallel,
    blocks,
    summary: { blocks: blocks.length, waves: totalWaves, tasks: tasks.counts.total },
  }
}

export function planBlock(block: TaskBlock, maxParallel: number): BlockWavePlan {
  const diagnostics: Diagnostic[] = []
  const degraded: BlockWavePlan['degraded'] = []
  const allIds = new Set(block.tasks.map((t) => t.id))
  const pending = block.tasks.filter((t) => !t.done).sort((a, b) => compareTaskIds(a.id, b.id))
  const remaining = new Set(pending.map((t) => t.id))

  for (const task of pending) {
    for (const dep of task.dependsOn) {
      if (dep.startsWith('T') && !allIds.has(dep)) {
        diagnostics.push(diag('TRACE-009', 'error', `La tarea ${task.id} depende de ${dep}, que no existe en el bloque`, { line: task.line }))
        degraded.push({ task: task.id, reason: 'orphan-dependency', movedToWave: 0 })
        remaining.delete(task.id)
      }
    }
  }

  const waves: Task[][] = []
  let guard = 0
  while (remaining.size > 0) {
    guard += 1
    if (guard > pending.length + 2) {
      for (const id of remaining) {
        const task = pending.find((t) => t.id === id)
        diagnostics.push(diag('TRACE-010', 'error', `No se puede planificar ${id}: dependencia circular`, { line: task?.line }))
      }
      break
    }

    const ready = pending.filter((t) => remaining.has(t.id) && t.dependsOn.every((dep) => !remaining.has(dep)))
    if (ready.length === 0) {
      for (const id of remaining) {
        const task = pending.find((t) => t.id === id)
        diagnostics.push(diag('TRACE-010', 'error', `La tarea ${id} no puede planificarse: dependencia bloqueada`, { line: task?.line }))
      }
      break
    }

    const wave: Task[] = []
    const filesInWave = new Set<string>()
    for (const task of ready) {
      if (wave.length >= maxParallel) break
      const files = task.files.map(normalizeFile)
      if (files.some((f) => filesInWave.has(f))) continue
      for (const f of files) filesInWave.add(f)
      wave.push(task)
    }
    if (wave.length === 0) {
      const first = ready[0]
      if (first) wave.push(first)
    }

    for (const task of wave) remaining.delete(task.id)
    waves.push(wave)

    for (const task of pending) {
      if (!remaining.has(task.id)) continue
      if (task.files.map(normalizeFile).some((f) => filesInWave.has(f))) {
        degraded.push({ task: task.id, reason: 'file-collision', movedToWave: waves.length + 1 })
      }
    }
  }

  return { block: block.id, title: block.title, waves, degraded, diagnostics }
}
