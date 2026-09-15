import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { ensureDir, exists, listDirs, readTextIfExists, writeText } from './fsx.js'

export type RunStatus = 'active' | 'paused' | 'completed' | 'aborted'

export const RUN_EVENT_TYPES = [
  'run_started',
  'task_started',
  'task_completed',
  'wave_started',
  'wave_completed',
  'block_started',
  'block_completed',
  'validate_run',
  'trace_run',
  'analyze_run',
  'verify_run',
  'mockup_checked',
  'presentation_generated',
  'override_applied',
  'paused',
  'resumed',
  'run_completed',
] as const

export type RunEventType = (typeof RUN_EVENT_TYPES)[number]

export interface RunState {
  runId: string
  slug: string
  phase: string
  status: RunStatus
  startedAt: string
  updatedAt: string
  inputs?: Record<string, unknown>
}

export interface RunEvent {
  eventId: string
  at: string
  type: string
  data?: Record<string, unknown>
}

export interface RunRecord {
  state: RunState
  events: RunEvent[]
}

export function generateRunId(now: Date = new Date()): string {
  const iso = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  return `${iso.slice(0, 8)}-${iso.slice(8, 14)}-${randomBytes(3).toString('hex')}`
}

function runsDir(root: string): string {
  return path.join(path.resolve(root), '.sdd', 'runs')
}

export async function createRun(root: string, slug: string, phase: string, inputs?: Record<string, unknown>, now: Date = new Date()): Promise<RunState> {
  const runId = generateRunId(now)
  const state: RunState = {
    runId,
    slug,
    phase,
    status: 'active',
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  if (inputs) state.inputs = inputs
  const dir = path.join(runsDir(root), runId)
  await ensureDir(dir)
  await writeText(path.join(dir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`)
  await writeText(path.join(dir, 'events.jsonl'), '')
  await appendRunEvent(root, runId, 'run_started', { slug, phase })
  return state
}

export async function appendRunEvent(root: string, runId: string, type: string, data?: Record<string, unknown>, now: Date = new Date()): Promise<RunEvent> {
  const event: RunEvent = { eventId: randomBytes(4).toString('hex'), at: now.toISOString(), type }
  if (data) event.data = data
  const file = path.join(runsDir(root), runId, 'events.jsonl')
  const previous = (await readTextIfExists(file)) ?? ''
  await writeText(file, `${previous}${JSON.stringify(event)}\n`)
  return event
}

export async function updateRunStatus(root: string, runId: string, status: RunStatus, now: Date = new Date()): Promise<void> {
  const file = path.join(runsDir(root), runId, 'state.json')
  const raw = await readTextIfExists(file)
  if (raw === undefined) return
  const state = JSON.parse(raw) as RunState
  state.status = status
  state.updatedAt = now.toISOString()
  await writeText(file, `${JSON.stringify(state, null, 2)}\n`)
}

export async function readRun(root: string, runId: string): Promise<{ record?: RunRecord; diagnostics: Diagnostic[] }> {
  const dir = path.join(runsDir(root), runId)
  const stateRaw = await readTextIfExists(path.join(dir, 'state.json'))
  if (stateRaw === undefined) {
    return { diagnostics: [diag('ATLAS-RUN-001', 'error', `No existe el run ${runId}`, { path: dir })] }
  }
  const state = JSON.parse(stateRaw) as RunState
  const eventsRaw = (await readTextIfExists(path.join(dir, 'events.jsonl'))) ?? ''
  const events: RunEvent[] = []
  for (const line of eventsRaw.split('\n')) {
    if (line.trim() === '') continue
    try {
      events.push(JSON.parse(line) as RunEvent)
    } catch {
      // línea corrupta: se ignora
    }
  }
  return { record: { state, events }, diagnostics: [] }
}

export async function listRuns(root: string, filter: { slug?: string; status?: RunStatus } = {}): Promise<RunState[]> {
  const dir = runsDir(root)
  if (!(await exists(dir))) return []
  const ids = await listDirs(dir)
  const out: RunState[] = []
  for (const id of ids) {
    const raw = await readTextIfExists(path.join(dir, id, 'state.json'))
    if (raw === undefined) continue
    try {
      const state = JSON.parse(raw) as RunState
      if (filter.slug && state.slug !== filter.slug) continue
      if (filter.status && state.status !== filter.status) continue
      out.push(state)
    } catch {
      // ignorar runs corruptos
    }
  }
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}
