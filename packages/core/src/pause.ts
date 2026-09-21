import path from 'node:path'
import { parseDocument } from 'yaml'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, readTextIfExists, writeText } from './fsx.js'
import { localStamp } from './time.js'

export interface PauseInput {
  root: string
  slug: string
  reason: string
  by: string
  now?: Date
}

export interface PauseResult {
  path: string
  paused?: { reason: string; at: string; by: string }
  diagnostics: Diagnostic[]
}

function metaPath(root: string, slug: string): string {
  return path.join(path.resolve(root), '.sdd', 'changes', slug, 'meta.yaml')
}

/**
 * Edita `meta.yaml` con el documento YAML vivo: conserva el comentario de
 * cabecera, el orden de las claves y todo lo que esta función no toca.
 */
async function editMeta(file: string, mutate: (doc: ReturnType<typeof parseDocument>) => void): Promise<void> {
  const raw = (await readTextIfExists(file)) ?? ''
  const doc = parseDocument(raw.replace(/\r\n?/g, '\n'))
  mutate(doc)
  await writeText(file, doc.toString({ lineWidth: 120 }))
}

/** Registra la pausa de un cambio con su motivo, autor y fecha (acto humano y auditado). */
export async function pauseChange(input: PauseInput): Promise<PauseResult> {
  const file = metaPath(input.root, input.slug)
  if (!(await exists(file))) {
    return { path: file, diagnostics: [diag('ATLAS-PAUSE-001', 'error', `No existe el cambio "${input.slug}"`, { path: file })] }
  }
  const reason = input.reason.trim()
  if (reason.length === 0) {
    return {
      path: file,
      diagnostics: [
        diag('ATLAS-PAUSE-002', 'error', 'La pausa necesita un motivo', {
          path: file,
          suggestion: `satlas pause ${input.slug} --reason "<motivo>" --by "<nombre>"`,
        }),
      ],
    }
  }
  const by = input.by.trim()
  if (by.length === 0) {
    return {
      path: file,
      diagnostics: [
        diag('ATLAS-PAUSE-003', 'error', 'La pausa necesita el nombre de quien la registra', {
          path: file,
          suggestion: `satlas pause ${input.slug} --reason "${reason}" --by "<nombre>"`,
        }),
      ],
    }
  }

  const paused = { reason, at: localStamp(input.now), by }
  await editMeta(file, (doc) => {
    doc.set('paused', paused)
  })
  return { path: file, paused, diagnostics: [] }
}

export interface ResumeResult {
  path: string
  resumed: boolean
  previous?: { reason: string; at: string; by: string }
  diagnostics: Diagnostic[]
}

/** Quita la pausa y devuelve el cambio al flujo, informando desde dónde se retoma. */
export async function resumeChange(root: string, slug: string): Promise<ResumeResult> {
  const file = metaPath(root, slug)
  if (!(await exists(file))) {
    return { path: file, resumed: false, diagnostics: [diag('ATLAS-PAUSE-001', 'error', `No existe el cambio "${slug}"`, { path: file })] }
  }

  let previous: { reason: string; at: string; by: string } | undefined
  await editMeta(file, (doc) => {
    const current = doc.get('paused')
    if (current && typeof current === 'object') {
      const value = JSON.parse(JSON.stringify(current)) as { reason?: string; at?: string; by?: string }
      previous = { reason: value.reason ?? '', at: value.at ?? '', by: value.by ?? '' }
    }
    doc.delete('paused')
  })

  if (!previous) {
    return {
      path: file,
      resumed: false,
      diagnostics: [diag('ATLAS-PAUSE-004', 'warning', `El cambio "${slug}" no estaba pausado`, { path: file })],
    }
  }
  return { path: file, resumed: true, previous, diagnostics: [] }
}
