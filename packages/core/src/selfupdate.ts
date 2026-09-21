import os from 'node:os'
import path from 'node:path'
import { ensureDir, exists, readTextIfExists, toPosix, writeText } from './fsx.js'

export const PACKAGE_NAME = 'specatlas'
const REGISTRY = 'https://registry.npmjs.org'
const TTL_MS = 24 * 60 * 60 * 1000
const TIMEOUT_MS = 2_000

/** Con qué se instaló la herramienta: de ahí sale la orden que la actualiza. */
export type Gestor = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'npx' | 'desconocido'

export interface Instalacion {
  gestor: Gestor
  /** Orden concreta para actualizar, o undefined si esta instalación no se actualiza sola. */
  comando?: string
  /** Por qué no se puede, cuando no se puede. */
  motivo?: string
}

/**
 * Deduce el gestor por la ruta del ejecutable: cada uno instala en un árbol
 * reconocible, y una ejecución efímera (`npx`, `dlx`) no tiene nada que actualizar.
 */
export function detectarInstalacion(rutaEjecutable: string, plataforma: NodeJS.Platform = process.platform): Instalacion {
  const ruta = toPosix(rutaEjecutable).toLowerCase()

  if (/[/](_npx|\.npm[/]_npx)[/]/.test(ruta) || ruta.includes('/.pnpm-store/') || /[/]dlx-[^/]*[/]/.test(ruta)) {
    return {
      gestor: 'npx',
      motivo: 'la herramienta se está ejecutando sin instalar: cada ejecución ya usa la versión publicada',
    }
  }
  if (ruta.includes('/pnpm/global/') || ruta.includes('/.pnpm/global/') || /[/]pnpm[/][^/]*[/]global[/]/.test(ruta)) {
    return { gestor: 'pnpm', comando: `pnpm add -g ${PACKAGE_NAME}@latest` }
  }
  if (ruta.includes('/.bun/')) {
    return { gestor: 'bun', comando: `bun add -g ${PACKAGE_NAME}@latest` }
  }
  if (ruta.includes('/.yarn/') || ruta.includes('/yarn/global/')) {
    return { gestor: 'yarn', comando: `yarn global add ${PACKAGE_NAME}@latest` }
  }
  if (ruta.includes('/npm/node_modules/') || ruta.includes('/roaming/npm/') || ruta.includes('/lib/node_modules/') || ruta.includes('/npm-global/')) {
    return { gestor: 'npm', comando: `npm install -g ${PACKAGE_NAME}@latest` }
  }
  // Sin pistas, npm es la instalación global más común y la orden es inofensiva.
  return { gestor: 'desconocido', comando: plataforma === 'win32' ? `npm install -g ${PACKAGE_NAME}@latest` : `npm install -g ${PACKAGE_NAME}@latest` }
}

/** Compara dos versiones semánticas; ignora lo que venga tras un guion. */
export function compararVersiones(a: string, b: string): number {
  const partes = (v: string): number[] =>
    v
      .trim()
      .replace(/^v/, '')
      .split('-')[0]!
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0)
  const ap = partes(a)
  const bp = partes(b)
  for (let i = 0; i < 3; i += 1) {
    const diff = (ap[i] ?? 0) - (bp[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

export function hayVersionNueva(instalada: string, publicada: string | undefined): boolean {
  if (!publicada) return false
  return compararVersiones(publicada, instalada) > 0
}

export interface PreferenciasActualizacion {
  /** Comprobar si hay versión nueva (por defecto, sí). */
  comprobar: boolean
  /** Instalar sin preguntar al detectarla (por defecto, no). */
  automatica: boolean
}

export const PREFERENCIAS_POR_DEFECTO: PreferenciasActualizacion = { comprobar: true, automatica: false }

export interface EstadoComprobacion {
  ultimaConsulta?: string
  ultimaVersion?: string
}

export function directorioPersonal(home: string = os.homedir()): string {
  return path.join(home, '.specatlas')
}

export function rutaPreferencias(home?: string): string {
  return path.join(directorioPersonal(home), 'config.json')
}

export function rutaEstado(home?: string): string {
  return path.join(directorioPersonal(home), 'update-check.json')
}

export async function leerPreferencias(home?: string): Promise<PreferenciasActualizacion> {
  const raw = await readTextIfExists(rutaPreferencias(home))
  if (raw === undefined) return { ...PREFERENCIAS_POR_DEFECTO }
  try {
    const data = JSON.parse(raw) as { update?: Partial<PreferenciasActualizacion> }
    return {
      comprobar: data.update?.comprobar ?? PREFERENCIAS_POR_DEFECTO.comprobar,
      automatica: data.update?.automatica ?? PREFERENCIAS_POR_DEFECTO.automatica,
    }
  } catch {
    return { ...PREFERENCIAS_POR_DEFECTO }
  }
}

export async function escribirPreferencias(preferencias: PreferenciasActualizacion, home?: string): Promise<string> {
  const file = rutaPreferencias(home)
  await ensureDir(path.dirname(file))
  await writeText(file, `${JSON.stringify({ update: preferencias }, null, 2)}\n`)
  return file
}

export async function leerEstado(home?: string): Promise<EstadoComprobacion> {
  const raw = await readTextIfExists(rutaEstado(home))
  if (raw === undefined) return {}
  try {
    return JSON.parse(raw) as EstadoComprobacion
  } catch {
    return {}
  }
}

export async function escribirEstado(estado: EstadoComprobacion, home?: string): Promise<void> {
  const file = rutaEstado(home)
  await ensureDir(path.dirname(file))
  await writeText(file, `${JSON.stringify(estado, null, 2)}\n`)
}

/** ¿Toca volver a preguntarle al registro, o vale lo que se guardó? */
export function tocaConsultar(estado: EstadoComprobacion, ahora: Date = new Date(), ttlMs: number = TTL_MS): boolean {
  if (!estado.ultimaConsulta) return true
  const ultima = Date.parse(estado.ultimaConsulta)
  if (Number.isNaN(ultima)) return true
  return ahora.getTime() - ultima >= ttlMs
}

/**
 * Una máquina de integración continua no actualiza herramientas ni necesita
 * avisos: fija sus versiones a propósito.
 */
export function esIntegracionContinua(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env['CI'] || env['CONTINUOUS_INTEGRATION'] || env['GITHUB_ACTIONS'] || env['GITLAB_CI'] || env['BUILDKITE'] || env['TEAMCITY_VERSION'])
}

export function comprobacionDesactivada(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env['SPECATLAS_NO_UPDATE_CHECK']
  return flag === '1' || flag === 'true'
}

/** Última versión publicada, o undefined si el registro no contesta a tiempo. */
export async function consultarVersionPublicada(timeoutMs: number = TIMEOUT_MS, fetchImpl: typeof fetch = fetch): Promise<string | undefined> {
  const control = new AbortController()
  const timer = setTimeout(() => control.abort(), timeoutMs)
  try {
    const respuesta = await fetchImpl(`${REGISTRY}/-/package/${PACKAGE_NAME}/dist-tags`, { signal: control.signal })
    if (!respuesta.ok) return undefined
    const data = (await respuesta.json()) as { latest?: string }
    return typeof data.latest === 'string' ? data.latest : undefined
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

export interface AvisoActualizacion {
  instalada: string
  publicada: string
  comando: string
  gestor: Gestor
}

export interface ContextoComprobacion {
  instalada: string
  rutaEjecutable: string
  home?: string
  ahora?: Date
  env?: NodeJS.ProcessEnv
  /** Salida destinada a otro programa: no se avisa. */
  json?: boolean
  fetchImpl?: typeof fetch
}

/**
 * Comprueba si hay versión nueva respetando la caché, el entorno y las
 * preferencias. Nunca lanza: si algo falla, no hay aviso y punto.
 */
export async function comprobarActualizacion(ctx: ContextoComprobacion): Promise<AvisoActualizacion | undefined> {
  const env = ctx.env ?? process.env
  if (ctx.json || esIntegracionContinua(env) || comprobacionDesactivada(env)) return undefined

  const preferencias = await leerPreferencias(ctx.home)
  if (!preferencias.comprobar) return undefined

  const ahora = ctx.ahora ?? new Date()
  const estado = await leerEstado(ctx.home)
  let publicada = estado.ultimaVersion

  if (tocaConsultar(estado, ahora)) {
    publicada = await consultarVersionPublicada(TIMEOUT_MS, ctx.fetchImpl ?? fetch)
    if (publicada === undefined) return undefined
    await escribirEstado({ ultimaConsulta: ahora.toISOString(), ultimaVersion: publicada }, ctx.home)
  }

  if (!hayVersionNueva(ctx.instalada, publicada)) return undefined
  const instalacion = detectarInstalacion(ctx.rutaEjecutable)
  return {
    instalada: ctx.instalada,
    publicada: publicada!,
    comando: instalacion.comando ?? `npm install -g ${PACKAGE_NAME}@latest`,
    gestor: instalacion.gestor,
  }
}

/** Texto del aviso pasivo, en una línea y sin estorbar. */
export function textoAviso(aviso: AvisoActualizacion): string {
  return `Hay una versión nueva de SpecAtlas: ${aviso.instalada} → ${aviso.publicada}. Actualiza con \`satlas self-update\` (o \`${aviso.comando}\`).`
}

/** Comprobación de que el directorio personal es escribible (para el modo desatendido). */
export async function personalEscribible(home?: string): Promise<boolean> {
  const dir = directorioPersonal(home)
  try {
    await ensureDir(dir)
    return await exists(dir)
  } catch {
    return false
  }
}
