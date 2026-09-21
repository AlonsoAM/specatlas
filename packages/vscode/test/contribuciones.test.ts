import { promises as fs } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

interface Manifest {
  activationEvents: string[]
  contributes: {
    commands: Array<{ command: string; title: string; enablement?: string }>
    configuration: { properties: Record<string, unknown> }
    views: Record<string, Array<{ id: string }>>
    viewsWelcome: Array<{ view: string; when?: string; contents: string }>
    menus: Record<string, Array<{ command?: string; when?: string; group?: string }>>
  }
}

async function manifest(): Promise<Manifest> {
  const file = path.join(__dirname, '..', 'package.json')
  return JSON.parse(await fs.readFile(file, 'utf8')) as Manifest
}

/** Lo que el editor puede hacer sin un proyecto del flujo detrás. */
const SIN_PROYECTO = new Set(['specatlas.init', 'specatlas.adopt', 'specatlas.explain', 'specatlas.openPreview', 'specatlas.openAt'])

/** Acciones que operan sobre un cambio concreto. */
const SOBRE_UN_CAMBIO = [
  'specatlas.approve',
  'specatlas.archive',
  'specatlas.verify',
  'specatlas.analyze',
  'specatlas.present',
  'specatlas.review',
  'specatlas.runNext',
  'specatlas.copyNext',
  'specatlas.mockup.open',
  'specatlas.mockups.decide',
]

describe('el editor solo ofrece lo que puede hacer', () => {
  it('sin proyecto inicializado solo se ofrecen inicializar y adoptar', async () => {
    const { contributes } = await manifest()
    const disponibles = contributes.commands.filter((command) => !command.enablement).map((command) => command.command)
    for (const command of disponibles) {
      expect(SIN_PROYECTO.has(command), `"${command}" se ofrece sin proyecto y no debería`).toBe(true)
    }
    expect(disponibles).toContain('specatlas.init')
    expect(disponibles).toContain('specatlas.adopt')
  })

  it('las acciones sobre un cambio esperan a que haya alguno', async () => {
    const { contributes } = await manifest()
    for (const name of SOBRE_UN_CAMBIO) {
      const command = contributes.commands.find((item) => item.command === name)
      expect(command, `falta el comando ${name}`).toBeDefined()
      expect(command?.enablement, `"${name}" debería exigir un cambio`).toBe('specatlas.hasChanges')
    }
  })

  it('el resto de acciones exige al menos un proyecto inicializado', async () => {
    const { contributes } = await manifest()
    const resto = contributes.commands.filter((command) => !SIN_PROYECTO.has(command.command) && !SOBRE_UN_CAMBIO.includes(command.command))
    for (const command of resto) {
      expect(command.enablement, `"${command.command}" no declara cuándo aplica`).toBe('specatlas.initialized')
    }
  })

  it('no se ofrece ningún ajuste sin efecto', async () => {
    const { contributes } = await manifest()
    const ajustes = Object.keys(contributes.configuration.properties)
    // `specatlas.language` prometía cambiar el idioma de la interfaz y no se leía en ningún punto.
    expect(ajustes).not.toContain('specatlas.language')

    const fuente = await fs.readFile(path.join(__dirname, '..', 'src', 'extension.ts'), 'utf8')
    for (const ajuste of ajustes) {
      const clave = ajuste.replace('specatlas.', '')
      expect(fuente.includes(`'${clave}'`), `el ajuste "${ajuste}" no se lee en ninguna parte`).toBe(true)
    }
  })

  it('el panel lateral se declara con sus cuatro secciones y su bienvenida', async () => {
    const { contributes, activationEvents } = await manifest()
    expect(contributes.views['specatlas']?.map((view) => view.id)).toEqual([
      'specatlas.now',
      'specatlas.explorer',
      'specatlas.health',
      'specatlas.tools',
    ])
    expect(contributes.viewsWelcome.some((welcome) => welcome.when === '!specatlas.initialized')).toBe(true)
    expect(activationEvents).toContain('onView:specatlas.now')
  })

  it('los comandos internos no ensucian la paleta', async () => {
    const { contributes } = await manifest()
    const ocultos = contributes.menus['commandPalette']?.filter((entry) => entry.when === 'false').map((entry) => entry.command)
    expect(ocultos).toEqual(expect.arrayContaining(['specatlas.focusNow', 'specatlas.focusHealth', 'specatlas.openAt', 'specatlas.openPreview']))
  })
})
