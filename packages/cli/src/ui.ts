/**
 * Presentación en la terminal. Todo pasa por aquí para que la herramienta se
 * lea igual en cualquier sitio: con color donde lo hay, en texto plano cuando
 * la salida va a un archivo o a otro programa, y con símbolos que el terminal
 * pueda dibujar de verdad.
 */
export interface Tema {
  color: boolean
  unicode: boolean
  ancho: number
}

export type Estilo = 'rojo' | 'verde' | 'amarillo' | 'azul' | 'morado' | 'cian' | 'gris' | 'negrita' | 'atenuado' | 'subrayado' | 'inverso'

const CODIGOS: Record<Estilo, [number, number]> = {
  rojo: [31, 39],
  verde: [32, 39],
  amarillo: [33, 39],
  azul: [34, 39],
  morado: [35, 39],
  cian: [36, 39],
  gris: [90, 39],
  negrita: [1, 22],
  atenuado: [2, 22],
  subrayado: [4, 24],
  inverso: [7, 27],
}

interface SalidaMinima {
  isTTY?: boolean
  columns?: number
}

/**
 * El color se apaga solo cuando la salida no es una terminal (una tubería, un
 * archivo, un registro de CI), y se respeta `NO_COLOR` como convención común.
 */
export function detectarTema(env: NodeJS.ProcessEnv = process.env, salida: SalidaMinima = process.stdout): Tema {
  const forzado = env['FORCE_COLOR']
  const color =
    forzado !== undefined && forzado !== '0'
      ? true
      : env['NO_COLOR'] !== undefined || env['TERM'] === 'dumb' || salida.isTTY !== true
        ? false
        : true

  // Las consolas antiguas de Windows dibujan mal los bloques y las flechas.
  const unicode = env['SPECATLAS_ASCII'] === '1' ? false : process.platform !== 'win32' || Boolean(env['WT_SESSION'] || env['TERM_PROGRAM'] || env['ConEmuANSI'] || env['TERM'])

  const ancho = Math.max(40, Math.min(salida.columns ?? 100, 120))
  return { color, unicode, ancho }
}

export function pinta(tema: Tema, estilo: Estilo | Estilo[], texto: string): string {
  if (!tema.color || texto === '') return texto
  const estilos = Array.isArray(estilo) ? estilo : [estilo]
  return estilos.reduce((acc, uno) => {
    const [abre, cierra] = CODIGOS[uno]
    return `\u001b[${abre}m${acc}\u001b[${cierra}m`
  }, texto)
}

export interface Simbolos {
  ok: string
  error: string
  aviso: string
  info: string
  flecha: string
  punto: string
  bloqueo: string
  pausa: string
  lleno: string
  vacio: string
  separador: string
}

const UNICODE: Simbolos = { ok: '✓', error: '✖', aviso: '▲', info: 'ℹ', flecha: '→', punto: '●', bloqueo: '⊘', pausa: '⏸', lleno: '▰', vacio: '▱', separador: '·' }
const ASCII: Simbolos = { ok: 'v', error: 'x', aviso: '!', info: 'i', flecha: '->', punto: '*', bloqueo: 'o', pausa: '||', lleno: '#', vacio: '-', separador: '-' }

export function simbolos(tema: Tema): Simbolos {
  return tema.unicode ? UNICODE : ASCII
}

/** Longitud visible: los códigos de color no ocupan sitio en pantalla. */
export function anchoVisible(texto: string): number {
  return texto.replace(/\u001b\[[0-9;]*m/g, '').length
}

export function rellenar(texto: string, ancho: number): string {
  const falta = ancho - anchoVisible(texto)
  return falta > 0 ? texto + ' '.repeat(falta) : texto
}

/** Título de un comando, con su contexto alineado a la derecha si cabe. */
export function encabezado(tema: Tema, titulo: string, contexto?: string): string[] {
  const izquierda = pinta(tema, 'negrita', titulo)
  if (!contexto) return [izquierda, '']
  const hueco = tema.ancho - anchoVisible(izquierda) - anchoVisible(contexto)
  if (hueco < 2) return [izquierda, pinta(tema, 'gris', contexto), '']
  return [`${izquierda}${' '.repeat(hueco)}${pinta(tema, 'gris', contexto)}`, '']
}

export function barraProgreso(tema: Tema, hecho: number, total: number, ancho = 8): string {
  const s = simbolos(tema)
  if (total <= 0) return pinta(tema, 'gris', `${s.vacio.repeat(ancho)} 0/0`)
  const llenos = Math.max(0, Math.min(ancho, Math.round((hecho / total) * ancho)))
  const completo = hecho >= total
  const barra = `${s.lleno.repeat(llenos)}${s.vacio.repeat(ancho - llenos)}`
  return `${pinta(tema, completo ? 'verde' : 'azul', barra)} ${hecho}/${total}`
}

export type Severidad = 'error' | 'warning' | 'info'

export function marcaSeveridad(tema: Tema, severidad: Severidad): string {
  const s = simbolos(tema)
  if (severidad === 'error') return pinta(tema, 'rojo', s.error)
  if (severidad === 'warning') return pinta(tema, 'amarillo', s.aviso)
  return pinta(tema, 'azul', s.info)
}

export interface DiagnosticoVisible {
  code: string
  severity: Severidad
  message: string
  path?: string
  line?: number
  suggestion?: string
}

/** Un hallazgo: marca, código, dónde ocurre, qué pasa y qué hacer. */
export function formatearDiagnostico(tema: Tema, d: DiagnosticoVisible, rutaRelativa?: string): string[] {
  const s = simbolos(tema)
  const ubicacion = rutaRelativa ? pinta(tema, 'gris', `${rutaRelativa}${d.line ? `:${d.line}` : ''}`) : ''
  const codigo = pinta(tema, d.severity === 'error' ? ['rojo', 'negrita'] : d.severity === 'warning' ? ['amarillo', 'negrita'] : ['azul', 'negrita'], d.code)
  const cabeza = [`  ${marcaSeveridad(tema, d.severity)} ${codigo}`, ubicacion].filter((parte) => parte !== '').join('  ')
  const lineas = [cabeza, `    ${d.message}`]
  if (d.suggestion) lineas.push(pinta(tema, 'gris', `    ${s.flecha} ${d.suggestion}`))
  return lineas
}

/** Cierre de un comando: cuántos hallazgos hay y de qué peso. */
export function resumenHallazgos(tema: Tema, counts: { errors: number; warnings: number; infos: number }): string {
  const s = simbolos(tema)
  if (counts.errors === 0 && counts.warnings === 0 && counts.infos === 0) return ''
  const partes: string[] = []
  if (counts.errors > 0) partes.push(pinta(tema, 'rojo', `${s.error} ${counts.errors} ${counts.errors === 1 ? 'error' : 'errores'}`))
  if (counts.warnings > 0) partes.push(pinta(tema, 'amarillo', `${s.aviso} ${counts.warnings} ${counts.warnings === 1 ? 'aviso' : 'avisos'}`))
  if (counts.infos > 0) partes.push(pinta(tema, 'azul', `${s.info} ${counts.infos} ${counts.infos === 1 ? 'nota' : 'notas'}`))
  return `  ${partes.join(pinta(tema, 'gris', ` ${s.separador} `))}`
}

/** Lo que salió bien, en una línea que se distingue de un vistazo. */
export function exito(tema: Tema, texto: string): string {
  return `  ${pinta(tema, 'verde', simbolos(tema).ok)} ${texto}`
}

export function aviso(tema: Tema, texto: string): string {
  return `  ${pinta(tema, 'amarillo', simbolos(tema).aviso)} ${texto}`
}

/** Siguiente acción: lo que hay que hacer, destacado y con su comando. */
export function siguienteAccion(tema: Tema, comando: string, descripcion?: string): string[] {
  const s = simbolos(tema)
  const lineas = [`    ${pinta(tema, 'cian', s.flecha)} ${pinta(tema, ['cian', 'negrita'], comando)}`]
  if (descripcion) lineas.push(pinta(tema, 'gris', `      ${descripcion}`))
  return lineas
}

export interface Columna {
  texto: string
  ancho?: number
}

/** Filas alineadas sin tocar los códigos de color. */
export function filaAlineada(columnas: Columna[], separacion = 2): string {
  return columnas
    .map((columna, indice) => (indice === columnas.length - 1 || columna.ancho === undefined ? columna.texto : rellenar(columna.texto, columna.ancho)))
    .join(' '.repeat(separacion))
}

/** Título de una sección dentro de la salida de un comando. */
export function seccion(tema: Tema, titulo: string, detalle?: string): string {
  const cabeza = pinta(tema, ['negrita'], titulo)
  return detalle ? `${cabeza} ${pinta(tema, 'gris', detalle)}` : cabeza
}

/** Colores de la marca: el degradado del logotipo, de teal a violeta. */
export const MARCA: Array<[number, number, number]> = [
  [20, 184, 166],
  [37, 99, 235],
  [124, 58, 237],
]

/** Un terminal con 24 bits puede dibujar el degradado; el resto se conforma. */
export function soportaDegradado(env: NodeJS.ProcessEnv = process.env): boolean {
  const colorterm = env['COLORTERM'] ?? ''
  return colorterm.includes('truecolor') || colorterm.includes('24bit') || env['TERM_PROGRAM'] === 'vscode' || Boolean(env['WT_SESSION'])
}

export function pintaRGB(tema: Tema, [r, g, b]: [number, number, number], texto: string): string {
  if (!tema.color || texto === '') return texto
  return `\u001b[38;2;${r};${g};${b}m${texto}\u001b[39m`
}

/** El color de la marca en un punto del degradado (0 arriba, 1 abajo). */
export function colorMarca(posicion: number, paradas: Array<[number, number, number]> = MARCA): [number, number, number] {
  const t = Math.max(0, Math.min(1, posicion)) * (paradas.length - 1)
  const tramo = Math.min(paradas.length - 2, Math.floor(t))
  return mezcla(paradas[tramo]!, paradas[tramo + 1]!, t - tramo)
}

function mezcla(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]
}

/** Interpola el degradado carácter a carácter; sin 24 bits, un color plano. */
export function degradado(tema: Tema, texto: string, paradas: Array<[number, number, number]> = MARCA, env: NodeJS.ProcessEnv = process.env): string {
  if (!tema.color) return texto
  if (!soportaDegradado(env)) return pinta(tema, 'cian', texto)
  const visibles = [...texto]
  const ultimo = Math.max(1, visibles.length - 1)
  return visibles
    .map((caracter, indice) => {
      if (caracter.trim() === '') return caracter
      const posicion = (indice / ultimo) * (paradas.length - 1)
      const tramo = Math.min(paradas.length - 2, Math.floor(posicion))
      return pintaRGB(tema, mezcla(paradas[tramo]!, paradas[tramo + 1]!, posicion - tramo), caracter)
    })
    .join('')
}

/**
 * El logotipo en la terminal: el rombo del atlas y la ruta de tres nodos
 * (requisito, tarea, evidencia) que son el símbolo de la marca.
 */
/**
 * El nombre escrito en grande para la portada: cinco filas de bloques, cinco
 * columnas por letra. Con menos altura la E y la C salen idénticas y el nombre
 * se lee mal, que era justo lo que había que evitar.
 */
const LETRAS: Record<string, string[]> = {
  S: ['█████', '█    ', '█████', '    █', '█████'],
  P: ['█████', '█   █', '█████', '█    ', '█    '],
  E: ['█████', '█    ', '████ ', '█    ', '█████'],
  C: ['█████', '█    ', '█    ', '█    ', '█████'],
  A: ['█████', '█   █', '█████', '█   █', '█   █'],
  T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
  L: ['█    ', '█    ', '█    ', '█    ', '█████'],
}

/** Alto del letrero, en filas. */
const ALTO_LETRERO = 5

const NOMBRE = 'SPECATLAS'

/** Ancho del letrero: cada letra ocupa cinco columnas y van separadas por una. */
const ANCHO_LETRERO = NOMBRE.length * 6 - 1

/**
 * El letrero del nombre, o nada cuando la terminal no dibuja bloques o no tiene
 * sitio: entonces la portada se conforma con el nombre escrito normal.
 */
export function letrero(tema: Tema): string[] | undefined {
  if (!tema.unicode || tema.ancho < ANCHO_LETRERO + 4) return undefined
  const letras = [...NOMBRE].map((letra) => LETRAS[letra])
  if (letras.some((letra) => letra === undefined)) return undefined
  return Array.from({ length: ALTO_LETRERO }, (_, fila) => letras.map((letra) => letra![fila]!).join(' '))
}

/**
 * La portada de la herramienta: el nombre en grande, la versión instalada y
 * para qué sirve.
 */
export function banner(tema: Tema, version: string, lema = 'el proceso se verifica, no se confía'): string[] {
  const pie = pinta(tema, 'gris', `${version}  ${simbolos(tema).separador}  ${lema}`)
  const letras = letrero(tema)
  if (!letras) return ['', `  ${degradado(tema, 'SpecAtlas')}`, `  ${pie}`, '']
  // Todas las filas miden lo mismo, así que el degradado cae en la misma columna.
  return ['', ...letras.map((fila) => `  ${degradado(tema, fila)}`), `  ${pie}`, '']
}

/** Recorta al ancho disponible sin partir palabras a lo bruto. */
export function truncar(texto: string, maximo: number): string {
  if (maximo <= 1 || anchoVisible(texto) <= maximo) return texto
  const corte = texto.slice(0, maximo - 1)
  const espacio = corte.lastIndexOf(' ')
  return `${(espacio > maximo * 0.6 ? corte.slice(0, espacio) : corte).trimEnd()}…`
}
