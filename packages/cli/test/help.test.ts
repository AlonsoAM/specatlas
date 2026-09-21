import { describe, expect, it } from 'vitest'
import { CATALOG } from '../src/catalog'
import { runHelp } from '../src/commands/help'
import type { CliContext } from '../src/cli'

const ctx: CliContext = { cwd: process.cwd(), json: false, language: 'es', flags: {}, positionals: [] }

async function ayuda(comando?: string): Promise<string> {
  const salida = await runHelp(ctx, comando)
  return (salida.text ?? []).join(String.fromCharCode(10))
}

describe('la ayuda es la puerta de entrada', () => {
  it('se presenta: quién es, qué versión y para qué sirve', async () => {
    const texto = await ayuda()
    expect(texto).toContain('█')
    expect(texto).toContain('el proceso se verifica')
    expect(texto).toContain('satlas <comando>')
  })

  it('lo primero que ofrece es lo que casi siempre se quiere', async () => {
    const texto = await ayuda()
    const posicionNext = texto.indexOf('satlas next')
    const posicionGrupos = texto.indexOf('EMPEZAR')
    expect(posicionNext).toBeGreaterThan(0)
    expect(posicionNext).toBeLessThan(posicionGrupos)
  })

  it('los comandos se leen por momento del flujo, no en una lista plana', async () => {
    const texto = await ayuda()
    for (const titulo of ['EMPEZAR', 'EL CICLO', 'COMPROBAR', 'COMPARTIR', 'EL PROYECTO']) {
      expect(texto).toContain(titulo)
    }
  })

  it('ningún comando se queda sin aparecer', async () => {
    const texto = await ayuda()
    for (const spec of CATALOG) {
      expect(texto, `falta ${spec.name}`).toContain(spec.name)
    }
  })

  it('ninguna línea se sale de la ventana', async () => {
    const texto = await ayuda()
    for (const linea of texto.split(String.fromCharCode(10))) {
      expect(linea.length, linea).toBeLessThanOrEqual(120)
    }
  })

  it('preguntar por un comando da su uso y sus opciones, no el catálogo entero', async () => {
    const texto = await ayuda('verify')
    expect(texto).toContain('satlas verify')
    expect(texto).toContain('--scenario')
    expect(texto).not.toContain('EMPEZAR')
  })

  it('preguntar por algo que no existe se avisa y no se inventa ayuda', async () => {
    const salida = await runHelp(ctx, 'noexiste')
    expect(salida.exitCode).toBe(2)
    expect(salida.diagnostics[0]?.code).toBe('ATLAS-CLI-001')
    expect(salida.text ?? []).toHaveLength(0)
  })
})
