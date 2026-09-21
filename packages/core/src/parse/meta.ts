import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import type { Diagnostic } from '../diagnostics.js'
import { diag } from '../diagnostics.js'
import type { ApprovalsFile, ChangeMeta } from '../model.js'

export const changeMetaSchema = z.object({
  schema_version: z.number().int().positive().default(1),
  slug: z.string().min(1),
  title: z.string().optional(),
  domain: z.string().optional(),
  lane: z.enum(['fix', 'standard', 'full']).default('standard'),
  risk: z.enum(['low', 'medium', 'high']).optional(),
  created: z.string().optional(),
  owner: z.string().optional(),
  mockups: z.enum(['required', 'skip']).optional(),
  tracker: z.object({ provider: z.string(), id: z.string() }).optional(),
  paused: z.object({ reason: z.string(), at: z.string(), by: z.string() }).optional(),
  amendments: z.array(z.object({ reason: z.string(), by: z.string(), at: z.string(), from: z.string().optional(), to: z.string().optional() })).optional(),
  lane_history: z.array(z.object({ from: z.enum(['fix', 'standard', 'full']), to: z.enum(['fix', 'standard', 'full']), at: z.string(), by: z.string() })).optional(),
  diagram_exceptions: z.array(z.string()).optional(),
  overrides: z.array(z.object({ gate: z.string(), reason: z.string(), by: z.string(), at: z.string() })).optional(),
})

export function parseChangeMeta(raw: string, filePath: string): { meta?: ChangeMeta; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = []
  let data: unknown
  try {
    data = parseYaml(raw)
  } catch (err) {
    return { diagnostics: [diag('ATLAS-META-001', 'error', `meta.yaml inválido: ${(err as Error).message}`, { path: filePath })] }
  }
  const parsed = changeMetaSchema.safeParse(data)
  if (!parsed.success) {
    return {
      diagnostics: parsed.error.issues.map((issue) =>
        diag('ATLAS-META-002', 'error', `meta.yaml (${issue.path.join('.') || 'raíz'}): ${issue.message}`, { path: filePath }),
      ),
    }
  }
  const v = parsed.data
  const meta: ChangeMeta = { schemaVersion: v.schema_version, slug: v.slug, lane: v.lane }
  if (v.title !== undefined) meta.title = v.title
  if (v.domain !== undefined) meta.domain = v.domain
  if (v.risk !== undefined) meta.risk = v.risk
  if (v.created !== undefined) meta.created = v.created
  if (v.owner !== undefined) meta.owner = v.owner
  if (v.mockups !== undefined) meta.mockups = v.mockups
  if (v.tracker !== undefined) meta.tracker = v.tracker
  if (v.paused !== undefined) meta.paused = v.paused
  if (v.amendments !== undefined) meta.amendments = v.amendments
  if (v.lane_history !== undefined) meta.laneHistory = v.lane_history
  if (v.diagram_exceptions !== undefined) meta.diagramExceptions = v.diagram_exceptions
  if (v.overrides !== undefined) meta.overrides = v.overrides
  for (const override of meta.overrides ?? []) {
    if (!override.reason || !override.by) {
      diagnostics.push(diag('ATLAS-LIFECYCLE-004', 'error', `Override del gate "${override.gate}" sin motivo o autor`, { path: filePath }))
    }
  }
  return { meta, diagnostics }
}

export const approvalsSchema = z.object({
  schema_version: z.number().int().positive().default(1),
  approvals: z
    .array(
      z.object({
        artifact: z.string(),
        artifact_hash: z.string(),
        approved_by: z.string(),
        approved_at: z.string(),
        channel: z.enum(['presentation', 'editor', 'pr', 'tracker', 'cli']).default('cli'),
        note: z.string().optional(),
      }),
    )
    .default([]),
})

export function parseApprovals(raw: string, filePath: string): { approvals?: ApprovalsFile; diagnostics: Diagnostic[] } {
  let data: unknown
  try {
    data = parseYaml(raw)
  } catch (err) {
    return { diagnostics: [diag('ATLAS-APPROVALS-001', 'error', `approvals.yaml inválido: ${(err as Error).message}`, { path: filePath })] }
  }
  const parsed = approvalsSchema.safeParse(data)
  if (!parsed.success) {
    return {
      diagnostics: parsed.error.issues.map((issue) =>
        diag('ATLAS-APPROVALS-002', 'error', `approvals.yaml (${issue.path.join('.') || 'raíz'}): ${issue.message}`, { path: filePath }),
      ),
    }
  }
  const file: ApprovalsFile = {
    schemaVersion: parsed.data.schema_version,
    approvals: parsed.data.approvals.map((a) => {
      const approval: ApprovalsFile['approvals'][number] = {
        artifact: a.artifact,
        artifactHash: a.artifact_hash,
        approvedBy: a.approved_by,
        approvedAt: a.approved_at,
        channel: a.channel,
      }
      if (a.note !== undefined) approval.note = a.note
      return approval
    }),
  }
  return { approvals: file, diagnostics: [] }
}
