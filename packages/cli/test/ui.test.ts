import { describe, expect, it } from 'vitest'
import {
  anchoVisible,
  barraProgreso,
  detectarTema,
  encabezado,
  filaAlineada,
  formatearDiagnostico,
  pinta,
  rellenar,
  resumenHallazgos,
  simbolos,
  siguienteAccion,
  banner,
  colorMarca,
  degradado,
  pintaRGB,
  letrero,
  soportaDegradado,
  truncar,
  type Tema,
} from '../src/ui'

const terminal: Tema = { color: true, unicode: true, ancho: 100 }
const plano: Tema = { color: false, unicode: true, ancho: 100 }
const limitado: Tema = { color: false, unicode: false, ancho: 80 }

describe('cuándo se pinta y cuándo no', () => {
  it('sin terminal no hay color: la salida vale para un archivo o una tubería', () => {
    expect(detectarTema({}, { isTTY: false }).color).toBe(false)
    expect(detectarTema({}, { isTTY: true }).color).toBe(true)
  })

  it('respeta NO_COLOR, TERM=dumb y FORCE_COLOR', () => {
    expect(detectarTema({ NO_COLOR: '1' }, { isTTY: true }).color).toBe(false)
    expect(detectarTema({ TERM: 'dumb' }, { isTTY: true }).color).toBe(false)
    expect(detectarTema({ FORCE_COLOR: '1' }, { isTTY: false }).color).toBe(true)
    expect(detectarTema({ FORCE_COLOR: '0' }, { isTTY: false }).color).toBe(false)
  })

  it('el ancho se adapta a la terminal, con límites razonables', () => {
    expect(detectarTema({}, { isTTY: true, columns: 200 }).ancho).toBe(120)
    expect(detectarTema({}, { isTTY: true, columns: 20 }).ancho).toBe(40)
    expect(detectarTema({}, { isTTY: true, columns: 90 }).ancho).toBe(90)
  })

  it('con SPECATLAS_ASCII no se usan símbolos que el terminal no dibuje', () => {
    expect(detectarTema({ SPECATLAS_ASCII: '1' }, { isTTY: true }).unicode).toBe(false)
    expect(simbolos({ ...terminal, unicode: false }).ok).toBe('v')
    expect(simbolos(terminal).ok).toBe('✓')
  })
})

describe('el color no descoloca el texto', () => {
  it('lo pintado ocupa lo mismo que lo escrito', () => {
    const pintado = pinta(terminal, 'rojo', 'ERROR')
    expect(pintado).not.toBe('ERROR')
    expect(anchoVisible(pintado)).toBe(5)
  })

  it('sin color, el texto sale tal cual', () => {
    expect(pinta(plano, 'rojo', 'ERROR')).toBe('ERROR')
  })

  it('las columnas se alinean aunque lleven color', () => {
    const fila = filaAlineada([{ texto: pinta(terminal, 'verde', 'ok'), ancho: 10 }, { texto: 'detalle' }])
    expect(anchoVisible(fila)).toBe(19)
    expect(rellenar(pinta(terminal, 'azul', 'x'), 5)).toContain('    ')
  })

  it('el encabezado alinea el contexto a la derecha', () => {
    const [linea] = encabezado({ ...plano, ancho: 40 }, 'Estado', 'demo · 3 specs')
    expect(anchoVisible(linea!)).toBe(40)
    expect(linea).toContain('Estado')
    expect(linea).toContain('demo · 3 specs')
  })

  it('si no cabe el contexto, se pone debajo en vez de partir la línea', () => {
    const lineas = encabezado({ ...plano, ancho: 12 }, 'Estado de los cambios', 'un contexto largo')
    expect(lineas.length).toBe(3)
  })
})

describe('la barra de progreso', () => {
  it('es proporcional y dice la cuenta', () => {
    expect(barraProgreso(plano, 0, 4)).toBe('▱▱▱▱▱▱▱▱ 0/4')
    expect(barraProgreso(plano, 2, 4)).toBe('▰▰▰▰▱▱▱▱ 2/4')
    expect(barraProgreso(plano, 4, 4)).toBe('▰▰▰▰▰▰▰▰ 4/4')
  })

  it('sin nada que medir lo dice en vez de mentir', () => {
    expect(barraProgreso(plano, 0, 0)).toContain('0/0')
  })

  it('en un terminal limitado usa caracteres que sí se dibujan', () => {
    expect(barraProgreso(limitado, 1, 2)).toBe('####---- 1/2')
  })
})

describe('los hallazgos se leen de un vistazo', () => {
  const hallazgo = { code: 'TRACE-002', severity: 'error' as const, message: 'El escenario no está cubierto', suggestion: 'Añade · Cubre: REQ-…-S1' }

  it('muestra marca, código, ubicación, qué pasa y qué hacer', () => {
    const lineas = formatearDiagnostico(plano, { ...hallazgo, line: 12 }, '.sdd/changes/x/tasks.md')
    expect(lineas[0]).toContain('✖')
    expect(lineas[0]).toContain('TRACE-002')
    expect(lineas[0]).toContain('.sdd/changes/x/tasks.md:12')
    expect(lineas[1]).toContain('El escenario no está cubierto')
    expect(lineas[2]).toContain('Añade · Cubre')
  })

  it('sin sugerencia no inventa una línea vacía', () => {
    const lineas = formatearDiagnostico(plano, { code: 'X-1', severity: 'warning', message: 'algo' })
    expect(lineas).toHaveLength(2)
  })

  it('cada severidad tiene su marca', () => {
    expect(formatearDiagnostico(plano, { code: 'A', severity: 'error', message: 'm' })[0]).toContain('✖')
    expect(formatearDiagnostico(plano, { code: 'A', severity: 'warning', message: 'm' })[0]).toContain('▲')
    expect(formatearDiagnostico(plano, { code: 'A', severity: 'info', message: 'm' })[0]).toContain('ℹ')
  })

  it('el resumen cuenta en singular y en plural, y calla si no hay nada', () => {
    expect(resumenHallazgos(plano, { errors: 1, warnings: 0, infos: 0 })).toContain('1 error')
    expect(resumenHallazgos(plano, { errors: 2, warnings: 3, infos: 0 })).toContain('2 errores')
    expect(resumenHallazgos(plano, { errors: 2, warnings: 3, infos: 0 })).toContain('3 avisos')
    expect(resumenHallazgos(plano, { errors: 0, warnings: 0, infos: 0 })).toBe('')
  })
})

describe('la siguiente acción', () => {
  it('destaca el comando y explica debajo', () => {
    const lineas = siguienteAccion(plano, 'satlas verify x', 'Registrar evidencia por escenario')
    expect(lineas[0]).toContain('→')
    expect(lineas[0]).toContain('satlas verify x')
    expect(lineas[1]).toContain('Registrar evidencia')
  })

  it('sin descripción se queda en una línea', () => {
    expect(siguienteAccion(plano, 'satlas archive x')).toHaveLength(1)
  })
})

describe('la marca en la terminal', () => {
  it('el degradado solo se dibuja donde hay 24 bits', () => {
    expect(soportaDegradado({ COLORTERM: 'truecolor' })).toBe(true)
    expect(soportaDegradado({ TERM_PROGRAM: 'vscode' })).toBe(true)
    expect(soportaDegradado({ WT_SESSION: '1' })).toBe(true)
    expect(soportaDegradado({ TERM: 'xterm-256color' })).toBe(false)
  })

  it('sin 24 bits el texto sigue siendo legible, solo que en un color plano', () => {
    const pobre = degradado(terminal, 'SpecAtlas', undefined, { TERM: 'xterm' })
    expect(anchoVisible(pobre)).toBe(9)
    expect(pobre).toContain('[36m')
  })

  it('el degradado no cambia lo que se lee ni pinta los espacios', () => {
    const rico = degradado(terminal, 'Spec Atlas', undefined, { COLORTERM: 'truecolor' })
    expect(anchoVisible(rico)).toBe(10)
    expect(rico).toContain('[38;2;20;184;166m')
  })

  it('sin color no queda ni un código de escape', () => {
    expect(degradado(plano, 'SpecAtlas', undefined, { COLORTERM: 'truecolor' })).toBe('SpecAtlas')
    expect(pintaRGB(plano, [1, 2, 3], 'x')).toBe('x')
  })

  it('el color recorre la marca de teal a violeta', () => {
    expect(colorMarca(0)).toEqual([20, 184, 166])
    expect(colorMarca(1)).toEqual([124, 58, 237])
    expect(colorMarca(0.5)).toEqual([37, 99, 235])
    expect(colorMarca(5)).toEqual([124, 58, 237])
  })

  it('la portada se presenta con el nombre, la versión y para qué sirve', () => {
    const texto = banner(plano, '1.2.3').join(String.fromCharCode(10))
    expect(texto).toContain('█')
    expect(texto).toContain('1.2.3')
    expect(texto).toContain('el proceso se verifica')
  })

  it('el nombre se escribe en grande, con todas las filas casadas columna a columna', () => {
    const filas = letrero(terminal)!
    expect(filas).toHaveLength(5)
    expect(new Set(filas.map((fila) => fila.length)).size).toBe(1)
    expect(filas[0]!.length).toBe(53)
  })

  it('cada letra se distingue de las demás: la E no se confunde con la C', () => {
    const filas = letrero(terminal)!
    // SPECATLAS: la E es la tercera letra y la C la cuarta, seis columnas cada una.
    const letra = (indice: number): string => filas.map((fila) => fila.slice(indice * 6, indice * 6 + 5)).join('|')
    expect(letra(2)).not.toBe(letra(3))
    // Y ninguna letra repetida deja de parecerse a sí misma.
    expect(letra(0)).toBe(letra(8))
  })

  it('donde no hay bloques o no hay sitio, el nombre se escribe normal', () => {
    expect(letrero(limitado)).toBeUndefined()
    expect(letrero({ ...terminal, ancho: 50 })).toBeUndefined()
    expect(banner(limitado, '1.2.3').join(String.fromCharCode(10))).toContain('SpecAtlas')
  })

  it('la portada dice la versión y para qué sirve debajo del nombre', () => {
    const lineas = banner(plano, '1.2.3')
    expect(lineas).toHaveLength(8)
    expect(lineas[6]).toContain('1.2.3')
    expect(lineas[6]).toContain('el proceso se verifica')
  })

})

describe('las descripciones caben en la ventana', () => {
  it('lo que cabe se deja intacto', () => {
    expect(truncar('corto', 20)).toBe('corto')
  })

  it('lo que no cabe se corta por la última palabra entera', () => {
    const corto = truncar('Registra evidencia por escenario del cambio', 24)
    expect(corto.endsWith('…')).toBe(true)
    expect(corto.length).toBeLessThanOrEqual(24)
    expect(corto).toBe('Registra evidencia por…')
  })

  it('una palabra sola se corta aunque no haya espacio donde partirla', () => {
    expect(truncar('supercalifragilistico', 10)).toBe('supercali…')
  })
})
