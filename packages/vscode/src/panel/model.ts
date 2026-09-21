import path from 'node:path'
import { collectMetrics, readTextIfExists, type WorkspaceMetrics } from '@specatlas/core'
import { buildMatrix, buildSnapshot, type MatrixModel, type Snapshot, type SnapshotChange } from '../logic.js'
import { buildStepStates, type ActionStepState } from '../actions.js'

export interface PanelDocument {
  kind: string
  label: string
  path: string
  exists: boolean
  markdown?: string
}

export interface PanelModel {
  root: string
  snapshot: Snapshot
  change?: SnapshotChange
  matrix: MatrixModel
  metrics: WorkspaceMetrics
  steps: ActionStepState[]
  documents: PanelDocument[]
}

export async function buildPanelModel(root: string): Promise<PanelModel | undefined> {
  const snapshot = await buildSnapshot(root)
  if (!snapshot) return undefined
  const [matrix, metrics] = await Promise.all([buildMatrix(root), collectMetrics(root)])
  const change = snapshot.changes.find((item) => item.state !== 'archived')
  const steps = change ? buildStepStates(change) : []
  const documents = change ? await buildDocuments(change) : []
  return { root, snapshot, change, matrix, metrics, steps, documents }
}

async function buildDocuments(change: SnapshotChange): Promise<PanelDocument[]> {
  const docs: PanelDocument[] = []
  for (const file of change.files) {
    if (file.kind === 'mockup') {
      docs.push({ kind: file.kind, label: file.label, path: file.path, exists: file.exists })
      continue
    }
    if (!file.exists) {
      docs.push({ kind: file.kind, label: file.label, path: file.path, exists: false })
      continue
    }
    const raw = await readTextIfExists(file.path)
    if (raw === undefined) {
      docs.push({ kind: file.kind, label: file.label, path: file.path, exists: true })
      continue
    }
    docs.push({ kind: file.kind, label: file.label, path: file.path, exists: true, markdown: raw })
  }
  return docs
}

export function documentByKind(model: PanelModel, kind: string): PanelDocument | undefined {
  return model.documents.find((doc) => doc.kind === kind)
}

export function relativePath(model: PanelModel, file: string): string {
  return path.relative(model.root, file)
}
