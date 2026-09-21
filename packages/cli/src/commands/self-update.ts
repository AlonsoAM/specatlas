import {
  comprobarActualizacion,
  consultarVersionPublicada,
  detectarInstalacion,
  escribirPreferencias,
  hayVersionNueva,
  leerPreferencias,
  runProcess,
  type Instalacion,
} from '@specatlas/core'
import { flagBool, flagString } from '../args.js'
import type { CliContext, CommandResult } from '../cli.js'
import { cliVersion } from '../version.js'

function rutaEjecutable(): string {
  return process.argv[1] ?? process.execPath
}

/** Instala la versión publicada con el gestor que corresponda. */
export async function instalarUltima(instalacion: Instalacion, cwd: string): Promise<{ ok: boolean; salida: string }> {
  if (!instalacion.comando) return { ok: false, salida: instalacion.motivo ?? 'no se puede actualizar esta instalación' }
  const resultado = await runProcess(instalacion.comando, { cwd, timeoutMs: 180_000 })
  return { ok: resultado.ok, salida: `${resultado.stdout}${resultado.stderr}`.trim() }
}

export async function runSelfUpdate(ctx: CliContext): Promise<CommandResult> {
  const instalada = cliVersion()
  const soloConsultar = flagBool(ctx.flags, 'check')
  const auto = flagString(ctx.flags, 'auto')

  // `--auto on|off` cambia la preferencia personal y no instala nada.
  if (auto !== undefined) {
    const valor = auto.toLowerCase()
    if (valor !== 'on' && valor !== 'off') {
      return {
        exitCode: 2,
        diagnostics: [{ code: 'ATLAS-SELFUPDATE-000', severity: 'error', message: 'Valor inválido para --auto', suggestion: 'satlas self-update --auto on | off' }],
      }
    }
    const preferencias = await leerPreferencias()
    const nuevas = { ...preferencias, automatica: valor === 'on' }
    const file = await escribirPreferencias(nuevas)
    return {
      exitCode: 0,
      diagnostics: [],
      data: { automatica: nuevas.automatica, archivo: file },
      text: [
        'Actualización desatendida',
        '',
        `  ${nuevas.automatica ? 'activada: la herramienta se actualizará sola al detectar una versión nueva' : 'desactivada: solo se avisa cuando hay versión nueva'}`,
        `  preferencia: ${file}`,
      ],
    }
  }

  const publicada = await consultarVersionPublicada()
  const instalacion = detectarInstalacion(rutaEjecutable())
  const preferencias = await leerPreferencias()

  if (publicada === undefined) {
    return {
      exitCode: 1,
      diagnostics: [
        {
          code: 'ATLAS-SELFUPDATE-001',
          severity: 'error',
          message: 'No se pudo consultar la versión publicada',
          suggestion: `Comprueba tu conexión o instala a mano: ${instalacion.comando ?? 'npm install -g specatlas@latest'}`,
        },
      ],
    }
  }

  const base = [
    'Actualización de SpecAtlas',
    '',
    `  instalada: ${instalada}`,
    `  publicada: ${publicada}`,
    `  instalada con: ${instalacion.gestor}`,
    `  desatendida: ${preferencias.automatica ? 'activada' : 'desactivada'}`,
  ]

  if (!hayVersionNueva(instalada, publicada)) {
    return { exitCode: 0, diagnostics: [], data: { instalada, publicada, actualizada: false, alDia: true }, text: [...base, '', '  Ya estás en la última versión.'] }
  }

  if (soloConsultar) {
    return {
      exitCode: 0,
      diagnostics: [],
      data: { instalada, publicada, actualizada: false, alDia: false, comando: instalacion.comando },
      text: [...base, '', `  Hay una versión nueva. Actualiza con \`satlas self-update\`${instalacion.comando ? ` (o \`${instalacion.comando}\`)` : ''}.`],
    }
  }

  if (!instalacion.comando) {
    return {
      exitCode: 0,
      diagnostics: [{ code: 'ATLAS-SELFUPDATE-002', severity: 'info', message: instalacion.motivo ?? 'esta instalación no se actualiza sola' }],
      data: { instalada, publicada, actualizada: false, motivo: instalacion.motivo },
      text: [...base, '', `  ${instalacion.motivo}`],
    }
  }

  const resultado = await instalarUltima(instalacion, ctx.cwd)
  if (!resultado.ok) {
    return {
      exitCode: 1,
      diagnostics: [
        {
          code: 'ATLAS-SELFUPDATE-003',
          severity: 'error',
          message: `No se pudo instalar ${publicada}: ${resultado.salida.split('\n')[0] ?? 'el gestor falló'}`,
          suggestion: `Ejecútalo a mano: ${instalacion.comando}`,
        },
      ],
      data: { instalada, publicada, actualizada: false, comando: instalacion.comando },
      text: [...base, '', `  La instalación falló; sigues con ${instalada}.`],
    }
  }

  return {
    exitCode: 0,
    diagnostics: [],
    data: { instalada, publicada, actualizada: true, comando: instalacion.comando },
    text: [...base, '', `  Actualizada: ${instalada} → ${publicada}.`, '  Abre una terminal nueva si el comando sigue apuntando a la versión anterior.'],
  }
}

/**
 * Aviso pasivo al terminar cualquier comando. Con la actualización desatendida
 * activada, instala en vez de avisar. Nunca cambia el resultado del comando.
 */
export async function avisoDeActualizacion(json: boolean, cwd: string): Promise<string[]> {
  try {
    const aviso = await comprobarActualizacion({ instalada: cliVersion(), rutaEjecutable: rutaEjecutable(), json })
    if (!aviso) return []
    const preferencias = await leerPreferencias()
    if (!preferencias.automatica) {
      return ['', `Hay una versión nueva de SpecAtlas: ${aviso.instalada} → ${aviso.publicada}. Actualiza con \`satlas self-update\`.`]
    }
    const instalacion = detectarInstalacion(rutaEjecutable())
    const resultado = await instalarUltima(instalacion, cwd)
    return resultado.ok
      ? ['', `SpecAtlas se actualizó solo: ${aviso.instalada} → ${aviso.publicada}.`]
      : ['', `Hay una versión nueva (${aviso.publicada}) y la actualización automática falló. Ejecuta \`${aviso.comando}\`.`]
  } catch {
    // El aviso jamás puede romper el comando que lo precede.
    return []
  }
}
