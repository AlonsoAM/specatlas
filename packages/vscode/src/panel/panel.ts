import { buildPanelModel, type PanelModel } from './model.js'
import { noticePage, panelPage, type PanelSection } from './shell.js'
import { resumenSection } from './sections/resumen.js'
import { flujoSection } from './sections/flujo.js'
import { trazabilidadSection } from './sections/trazabilidad.js'
import { codigoSection } from './sections/codigo.js'
import { metricasSection } from './sections/metricas.js'
import { documentosSection } from './sections/documentos.js'
import { accionesSection } from './sections/acciones.js'
import { escapeHtml } from './html.js'

export const PANEL_KEY = 'panel'
export const PANEL_VIEW_TYPE = 'specatlas.panel'
export const PANEL_TITLE = 'Panel principal'
export const PANEL_SECTIONS = ['resumen', 'flujo', 'trazabilidad', 'codigo', 'metricas', 'documentos', 'acciones'] as const
export type PanelSectionId = (typeof PANEL_SECTIONS)[number]

export function isPanelSection(value: unknown): value is PanelSectionId {
  return typeof value === 'string' && (PANEL_SECTIONS as readonly string[]).includes(value)
}

export interface PanelResources {
  presentationBase64?: string
  mockups?: Array<{ file: string; title: string; path: string; base64?: string }>
}

export interface PanelRenderOptions {
  mermaidUri?: string
  cspSource?: string
  resources?: PanelResources
}

export function renderPanelHtml(model: PanelModel, active: PanelSectionId, nonce: string, opts: PanelRenderOptions = {}): string {
  const resumen = resumenSection(model)
  const flujo = flujoSection(model)
  const trazabilidad = trazabilidadSection(model)
  const codigo = codigoSection(model)
  const metricas = metricasSection(model)
  const documentos = documentosSection(model, {
    ...(opts.mermaidUri ? { mermaidUri: opts.mermaidUri } : {}),
    ...(opts.resources ? { resources: opts.resources } : {}),
    nonce,
  })
  const acciones = accionesSection(model)
  const sections: PanelSection[] = [
    { id: 'resumen', label: 'Resumen', html: resumen.html },
    { id: 'flujo', label: 'Flujo', html: flujo.html, script: flujo.script },
    { id: 'trazabilidad', label: 'Trazabilidad', html: trazabilidad.html, script: trazabilidad.script },
    { id: 'codigo', label: 'Código', html: codigo.html },
    { id: 'metricas', label: 'Métricas', html: metricas.html },
    { id: 'documentos', label: 'Documentos', html: documentos.html, script: documentos.script },
    { id: 'acciones', label: 'Acciones', html: acciones.html, script: acciones.script },
  ]
  const change = model.change
  const heroRight = change
    ? `<span class="muted" style="font-size:12px">siguiente paso:</span>
       <a class="btn primary" href="command:specatlas.runNext?${encodeURIComponent(JSON.stringify([change.slug]))}">${escapeHtml(`${change.requiresAgent ? '◈ ' : ''}${change.next}`)}</a>
       <a class="btn ghost" href="command:specatlas.refresh" aria-label="Refrescar">↻</a>`
    : `<a class="btn primary" href="command:specatlas.new">＋ Nuevo cambio</a>`
  return panelPage({
    project: `${model.snapshot.projectName} · ${model.snapshot.summary.changes} cambios · ${model.snapshot.summary.specs} specs vivas`,
    title: 'Panel principal',
    subtitle: `${model.snapshot.projectName} · ${change ? `${change.next} — ${change.nextDescription}` : 'Sin cambio activo'}`,
    heroRight,
    sections,
    active,
    nonce,
    ...(opts.mermaidUri && opts.cspSource ? { mermaid: { uri: opts.mermaidUri, cspSource: opts.cspSource } } : {}),
  })
}

export async function buildPanelPage(root: string, active: PanelSectionId, nonce: string, opts: PanelRenderOptions = {}): Promise<{ title: string; html: string } | undefined> {
  const model = await buildPanelModel(root)
  if (!model) return undefined
  return { title: `${PANEL_TITLE} — ${model.snapshot.projectName}`, html: renderPanelHtml(model, active, nonce, opts) }
}

export function panelNotice(kind: 'no-workspace' | 'not-initialized' | 'error', message: string): string {  if (kind === 'no-workspace') {
    return noticePage({ kind: 'sin proyecto', title: 'No hay una carpeta de proyecto abierta', message, action: { label: 'Abrir carpeta', command: 'vscode.openFolder' } })
  }
  if (kind === 'not-initialized') {
    return noticePage({ kind: 'proyecto sin inicializar', title: 'SpecAtlas no está inicializado en este proyecto', message, action: { label: 'Inicializar SpecAtlas', command: 'specatlas.init' } })
  }
  return noticePage({ kind: 'error', title: 'No se pudo leer el estado del proyecto', message, action: { label: 'Reintentar', command: 'specatlas.refresh' } })
}
