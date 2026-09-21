import path from 'node:path'
import { parseDocument } from 'yaml'
import { signApproval } from './approvals.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, readTextIfExists, writeText } from './fsx.js'
import { artifactHash } from './hash.js'
import type { Approval } from './model.js'
import { loadApprovals } from './workspace.js'
import { localStamp } from './time.js'

export interface Amendment {
  reason: string
  by: string
  at: string
  /** Huella firmada que se deja atrás y huella que se firma ahora. */
  from: string
  to: string
}

export interface AmendOptions {
  root: string
  slug: string
  reason: string
  by: string
  now?: Date
  dryRun?: boolean
}

export interface AmendResult {
  slug: string
  amendment?: Amendment
  approval?: Approval
  unchanged?: boolean
  diagnostics: Diagnostic[]
}

/**
 * Cambio de alcance sobre una spec ya aprobada (Artículo 5 de la constitución):
 * lo aprobado no se edita en silencio, se firma una revisión con su motivo.
 *
 * La enmienda queda en `meta.yaml` (qué huella se deja atrás, cuál se firma,
 * quién y por qué) y vuelve a firmar la spec, así que el cambio recupera su
 * firma vigente sin perder el rastro de que el alcance se movió.
 */
export async function amendChange(opts: AmendOptions): Promise<AmendResult> {
  const root = path.resolve(opts.root)
  const changeDir = path.join(root, '.sdd', 'changes', opts.slug)
  const specFile = path.join(changeDir, 'spec.md')
  const metaFile = path.join(changeDir, 'meta.yaml')
  const diagnostics: Diagnostic[] = []

  const reason = opts.reason.trim()
  const by = opts.by.trim()
  if (!(await exists(specFile))) {
    return { slug: opts.slug, diagnostics: [diag('ATLAS-AMEND-001', 'error', `No existe el cambio "${opts.slug}" o no tiene spec.md`, { path: changeDir })] }
  }
  if (reason.length === 0) {
    return {
      slug: opts.slug,
      diagnostics: [
        diag('ATLAS-AMEND-002', 'error', 'La enmienda necesita el motivo del cambio de alcance', {
          suggestion: `satlas amend ${opts.slug} --reason "<qué cambia y por qué>" --by "<nombre>"`,
        }),
      ],
    }
  }
  if (by.length === 0) {
    return {
      slug: opts.slug,
      diagnostics: [diag('ATLAS-AMEND-003', 'error', 'La enmienda es un acto humano: falta el nombre de quien la firma', { suggestion: `satlas amend ${opts.slug} --reason "${reason}" --by "<nombre>"` })],
    }
  }

  const approvals = await loadApprovals(path.join(root, '.sdd'))
  const key = `changes/${opts.slug}/spec.md`
  const previous = approvals.byArtifact.get(key)
  if (!previous) {
    return {
      slug: opts.slug,
      diagnostics: [
        diag('ATLAS-AMEND-004', 'error', `La especificación de "${opts.slug}" no está aprobada: no hay nada que enmendar`, {
          path: specFile,
          suggestion: `Fírmala por primera vez con satlas approve ${opts.slug} --by "${by}"`,
        }),
      ],
    }
  }

  const content = (await readTextIfExists(specFile)) ?? ''
  const current = artifactHash(content)
  if (current === previous.hash) {
    diagnostics.push(
      diag('ATLAS-AMEND-005', 'warning', `La especificación de "${opts.slug}" no cambió desde su firma: no hay enmienda que registrar`, {
        path: specFile,
        suggestion: 'Edita la especificación y vuelve a enmendar, o deja la firma como está',
      }),
    )
    return { slug: opts.slug, unchanged: true, diagnostics }
  }

  const amendment: Amendment = { reason, by, at: localStamp(opts.now), from: previous.hash, to: current }

  if (!opts.dryRun) {
    const raw = (await readTextIfExists(metaFile)) ?? ''
    const doc = parseDocument(raw.replace(/\r\n?/g, '\n'))
    const history = doc.get('amendments')
    const rows = history && typeof (history as { toJSON?: () => unknown }).toJSON === 'function' ? ((history as { toJSON: () => unknown }).toJSON() as unknown[]) : []
    doc.set('amendments', [...(Array.isArray(rows) ? rows : []), { reason, by, at: amendment.at, from: amendment.from, to: amendment.to }])
    await writeText(metaFile, doc.toString({ lineWidth: 120 }))
  }

  const signed = await signApproval({
    root,
    artifact: specFile,
    by,
    channel: 'cli',
    note: `enmienda: ${reason}`,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
    ...(opts.dryRun !== undefined ? { dryRun: opts.dryRun } : {}),
  })
  diagnostics.push(...signed.diagnostics)

  return { slug: opts.slug, amendment, ...(signed.approval !== undefined ? { approval: signed.approval } : {}), diagnostics }
}
