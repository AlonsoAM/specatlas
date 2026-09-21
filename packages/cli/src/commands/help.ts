import type { Language } from '@specatlas/core'
import { CATALOG } from '../catalog.js'
import type { CliContext, CommandResult } from '../cli.js'
import { msg } from '../messages.js'
import { cliVersion } from '../version.js'
import { banner, degradado, detectarTema, filaAlineada, pinta, simbolos, truncar, type Tema } from '../ui.js'

/**
 * Los comandos agrupados por el momento en que se usan, no por orden
 * alfabético: quien llega quiere saber por dónde empezar, no leerse 39 nombres.
 */
interface Grupo {
  titulo: string
  detalle: string
  comandos: string[]
}

const GRUPOS: Grupo[] = [
  { titulo: 'Empezar', detalle: 'poner el flujo en marcha', comandos: ['init', 'adopt', 'new'] },
  { titulo: 'El ciclo', detalle: 'de lo acordado a la evidencia', comandos: ['approve', 'amend', 'verify', 'review', 'archive', 'pause', 'resume'] },
  { titulo: 'Saber dónde estás', detalle: 'qué toca y cómo va', comandos: ['status', 'next', 'watch', 'metrics', 'impact', 'explain'] },
  { titulo: 'Comprobar', detalle: 'que encaja y que funciona', comandos: ['validate', 'trace', 'waves', 'analyze', 'ci', 'doctor', 'drift', 'packs', 'contracts', 'clarify'] },
  { titulo: 'Compartir', detalle: 'lo que otros van a leer', comandos: ['present', 'docs', 'mockup', 'issue'] },
  { titulo: 'El proyecto', detalle: 'configuración y herramientas', comandos: ['adapters', 'profile', 'link', 'upgrade', 'self-update', 'hash', 'run', 'mcp', 'version', 'help'] },
]

const TONOS = ['verde', 'cian', 'azul', 'amarillo', 'morado', 'gris'] as const

function detalleDeComando(tema: Tema, nombre: string): string[] {
  const spec = CATALOG.find((item) => item.name === nombre)
  if (!spec) return []
  const s = simbolos(tema)
  return [
    '',
    `  ${pinta(tema, ['negrita'], `satlas ${spec.name}`)}  ${pinta(tema, 'gris', spec.description)}`,
    '',
    `    ${pinta(tema, 'cian', s.flecha)} ${pinta(tema, 'cian', spec.usage ?? `satlas ${spec.name}`)}`,
    ...(spec.flags.length > 0 ? ['', `    ${pinta(tema, 'gris', 'opciones:')} ${spec.flags.map((flag) => pinta(tema, 'gris', `--${flag}`)).join(pinta(tema, 'gris', ' · '))}`] : []),
    '',
  ]
}

export async function runHelp(ctx: CliContext, commandName?: string): Promise<CommandResult> {
  const language: Language = ctx.language
  const tema = detectarTema()
  const s = simbolos(tema)

  if (commandName) {
    const spec = CATALOG.find((item) => item.name === commandName)
    if (!spec) {
      return {
        exitCode: 2,
        diagnostics: [{ code: 'ATLAS-CLI-001', severity: 'error', message: `${msg('cli.unknownCommand', language)}: ${commandName}`, suggestion: 'Ejecuta `satlas help` para ver los comandos por grupo' }],
      }
    }
    return { exitCode: 0, diagnostics: [], text: detalleDeComando(tema, commandName) }
  }

  const lines: string[] = banner(tema, cliVersion())

  lines.push(filaAlineada([{ texto: `  ${pinta(tema, 'gris', 'uso')}`, ancho: 8 }, { texto: pinta(tema, 'negrita', 'satlas <comando> [opciones]') }]))
  lines.push(filaAlineada([{ texto: `  ${pinta(tema, 'gris', 'ayuda')}`, ancho: 8 }, { texto: pinta(tema, 'gris', 'satlas help <comando>   ·   todos aceptan --json') }]))
  lines.push('')

  // La línea que más se usa, antes que el catálogo entero.
  lines.push(`  ${pinta(tema, 'cian', s.flecha)} ${pinta(tema, ['cian', 'negrita'], 'satlas next')}   ${pinta(tema, 'gris', 'qué toca hacer ahora mismo en este proyecto')}`)
  lines.push('')

  const ancho = Math.max(...CATALOG.map((spec) => spec.name.length)) + 2
  // La descripción se recorta a lo que quede de ventana: nada de líneas partidas.
  const anchoDescripcion = Math.max(24, tema.ancho - ancho - 8)

  GRUPOS.forEach((grupo, indice) => {
    const disponibles = grupo.comandos.filter((nombre) => CATALOG.some((spec) => spec.name === nombre))
    if (disponibles.length === 0) return
    lines.push(`  ${pinta(tema, [TONOS[indice % TONOS.length]!, 'negrita'], grupo.titulo.toUpperCase())}  ${pinta(tema, 'gris', grupo.detalle)}`)
    for (const nombre of disponibles) {
      const spec = CATALOG.find((item) => item.name === nombre)!
      lines.push(filaAlineada([{ texto: `    ${pinta(tema, 'negrita', spec.name)}`, ancho: ancho + 4 }, { texto: pinta(tema, 'gris', truncar(spec.description, anchoDescripcion)) }]))
    }
    lines.push('')
  })

  // Nada queda fuera aunque el catálogo crezca y nadie actualice los grupos.
  const agrupados = new Set(GRUPOS.flatMap((grupo) => grupo.comandos))
  const sueltos = CATALOG.filter((spec) => !agrupados.has(spec.name))
  if (sueltos.length > 0) {
    lines.push(`  ${pinta(tema, ['gris', 'negrita'], 'OTROS')}`)
    for (const spec of sueltos) {
      lines.push(filaAlineada([{ texto: `    ${pinta(tema, 'negrita', spec.name)}`, ancho: ancho + 4 }, { texto: pinta(tema, 'gris', truncar(spec.description, anchoDescripcion)) }]))
    }
    lines.push('')
  }

  lines.push(`  ${pinta(tema, 'gris', `salida: 0 ${s.separador} 1 hallazgos ${s.separador} 2 uso ${s.separador} 3 E/S`)}`)
  lines.push(`  ${pinta(tema, 'gris', 'documentación: ')}${degradado(tema, 'github.com/AlonsoAM/specatlas')}`)
  lines.push('')

  return { exitCode: 0, diagnostics: [], text: lines }
}
