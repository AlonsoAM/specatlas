import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  comprobarActualizacion,
  compararVersiones,
  comprobacionDesactivada,
  consultarVersionPublicada,
  detectarInstalacion,
  escribirEstado,
  escribirPreferencias,
  esIntegracionContinua,
  hayVersionNueva,
  leerPreferencias,
  rutaEstado,
  textoAviso,
  tocaConsultar,
} from '../src/selfupdate'

async function hogar(prefijo: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefijo))
}

function registro(latest: string | undefined, opts: { lento?: boolean; roto?: boolean } = {}): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    if (opts.roto) throw new Error('sin conexión')
    if (opts.lento) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5_000)
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new Error('abortado'))
        })
      })
    }
    return { ok: latest !== undefined, json: async () => ({ latest }) } as Response
  }) as typeof fetch
}

describe('comparar versiones', () => {
  it('ordena por mayor, menor y parche', () => {
    expect(compararVersiones('0.1.36', '0.1.35')).toBe(1)
    expect(compararVersiones('0.2.0', '0.1.99')).toBe(1)
    expect(compararVersiones('1.0.0', '0.9.9')).toBe(1)
    expect(compararVersiones('0.1.35', '0.1.35')).toBe(0)
    expect(compararVersiones('0.1.35', '0.1.36')).toBe(-1)
  })

  it('tolera el prefijo v y los sufijos de prelanzamiento', () => {
    expect(compararVersiones('v0.1.36', '0.1.36')).toBe(0)
    expect(compararVersiones('0.1.36-rc.1', '0.1.36')).toBe(0)
  })

  it('solo hay versión nueva si de verdad es posterior', () => {
    expect(hayVersionNueva('0.1.35', '0.1.36')).toBe(true)
    expect(hayVersionNueva('0.1.36', '0.1.36')).toBe(false)
    expect(hayVersionNueva('0.1.37', '0.1.36')).toBe(false)
    expect(hayVersionNueva('0.1.36', undefined)).toBe(false)
  })
})

describe('con qué se instaló la herramienta', () => {
  it('reconoce cada gestor por su árbol', () => {
    expect(detectarInstalacion('C:/Users/x/AppData/Roaming/npm/node_modules/specatlas/dist/bin.js').gestor).toBe('npm')
    expect(detectarInstalacion('/usr/local/lib/node_modules/specatlas/dist/bin.js').gestor).toBe('npm')
    expect(detectarInstalacion('C:/Users/x/AppData/Local/pnpm/global/5/node_modules/specatlas/dist/bin.js').gestor).toBe('pnpm')
    expect(detectarInstalacion('/home/x/.bun/install/global/node_modules/specatlas/dist/bin.js').gestor).toBe('bun')
    expect(detectarInstalacion('/home/x/.yarn/bin/specatlas').gestor).toBe('yarn')
  })

  it('cada gestor propone su propia orden', () => {
    expect(detectarInstalacion('/usr/local/lib/node_modules/specatlas/dist/bin.js').comando).toBe('npm install -g specatlas@latest')
    expect(detectarInstalacion('C:/Users/x/AppData/Local/pnpm/global/5/node_modules/specatlas/dist/bin.js').comando).toBe('pnpm add -g specatlas@latest')
    expect(detectarInstalacion('/home/x/.bun/install/global/node_modules/specatlas/dist/bin.js').comando).toBe('bun add -g specatlas@latest')
  })

  it('una ejecución efímera no tiene nada que actualizar', () => {
    const efimera = detectarInstalacion('C:/Users/x/AppData/Local/npm-cache/_npx/a1b2/node_modules/specatlas/dist/bin.js')
    expect(efimera.gestor).toBe('npx')
    expect(efimera.comando).toBeUndefined()
    expect(efimera.motivo).toContain('sin instalar')
  })
})

describe('cuándo se consulta al registro', () => {
  it('la primera vez sí, y luego no hasta pasadas 24 horas', () => {
    const ahora = new Date('2026-09-21T12:00:00Z')
    expect(tocaConsultar({}, ahora)).toBe(true)
    expect(tocaConsultar({ ultimaConsulta: '2026-09-21T09:00:00Z' }, ahora)).toBe(false)
    expect(tocaConsultar({ ultimaConsulta: '2026-09-20T09:00:00Z' }, ahora)).toBe(true)
    expect(tocaConsultar({ ultimaConsulta: 'no es una fecha' }, ahora)).toBe(true)
  })

  it('en integración continua y con la comprobación apagada, nunca', () => {
    expect(esIntegracionContinua({ CI: 'true' })).toBe(true)
    expect(esIntegracionContinua({ GITHUB_ACTIONS: 'true' })).toBe(true)
    expect(esIntegracionContinua({})).toBe(false)
    expect(comprobacionDesactivada({ SPECATLAS_NO_UPDATE_CHECK: '1' })).toBe(true)
    expect(comprobacionDesactivada({})).toBe(false)
  })
})

describe('consultar la versión publicada', () => {
  it('devuelve la última publicada', async () => {
    expect(await consultarVersionPublicada(2_000, registro('0.1.40'))).toBe('0.1.40')
  })

  it('un registro que no responde a tiempo no rompe nada', async () => {
    expect(await consultarVersionPublicada(50, registro('0.1.40', { lento: true }))).toBeUndefined()
    expect(await consultarVersionPublicada(2_000, registro('0.1.40', { roto: true }))).toBeUndefined()
  })
})

describe('el aviso de versión nueva', () => {
  const ejecutable = '/usr/local/lib/node_modules/specatlas/dist/bin.js'

  it('avisa cuando hay una versión posterior', async () => {
    const home = await hogar('satlas-update-')
    const aviso = await comprobarActualizacion({ instalada: '0.1.35', rutaEjecutable: ejecutable, home, env: {}, fetchImpl: registro('0.1.36') })
    expect(aviso?.publicada).toBe('0.1.36')
    expect(aviso?.gestor).toBe('npm')
    expect(textoAviso(aviso!)).toContain('0.1.35 → 0.1.36')
    expect(textoAviso(aviso!)).toContain('satlas self-update')
  })

  it('no avisa si ya está al día', async () => {
    const home = await hogar('satlas-update-aldia-')
    expect(await comprobarActualizacion({ instalada: '0.1.36', rutaEjecutable: ejecutable, home, env: {}, fetchImpl: registro('0.1.36') })).toBeUndefined()
  })

  it('reutiliza lo comprobado durante 24 horas sin volver a consultar', async () => {
    const home = await hogar('satlas-update-cache-')
    await escribirEstado({ ultimaConsulta: new Date().toISOString(), ultimaVersion: '0.1.36' }, home)
    let consultas = 0
    const contador: typeof fetch = (async () => {
      consultas += 1
      return { ok: true, json: async () => ({ latest: '0.1.40' }) } as Response
    }) as typeof fetch

    const aviso = await comprobarActualizacion({ instalada: '0.1.35', rutaEjecutable: ejecutable, home, env: {}, fetchImpl: contador })
    expect(consultas).toBe(0)
    expect(aviso?.publicada).toBe('0.1.36')
  })

  it('guarda lo consultado para la próxima vez', async () => {
    const home = await hogar('satlas-update-guarda-')
    await comprobarActualizacion({ instalada: '0.1.35', rutaEjecutable: ejecutable, home, env: {}, fetchImpl: registro('0.1.36') })
    const estado = JSON.parse(await fs.readFile(rutaEstado(home), 'utf8')) as { ultimaVersion?: string }
    expect(estado.ultimaVersion).toBe('0.1.36')
  })

  it('calla en integración continua, con la comprobación apagada y en la salida para otro programa', async () => {
    const home = await hogar('satlas-update-callado-')
    const base = { instalada: '0.1.35', rutaEjecutable: ejecutable, home, fetchImpl: registro('0.1.36') }
    expect(await comprobarActualizacion({ ...base, env: { CI: 'true' } })).toBeUndefined()
    expect(await comprobarActualizacion({ ...base, env: { SPECATLAS_NO_UPDATE_CHECK: '1' } })).toBeUndefined()
    expect(await comprobarActualizacion({ ...base, env: {}, json: true })).toBeUndefined()
  })

  it('con el registro caído, el comando sigue sin aviso', async () => {
    const home = await hogar('satlas-update-sinred-')
    expect(await comprobarActualizacion({ instalada: '0.1.35', rutaEjecutable: ejecutable, home, env: {}, fetchImpl: registro('0.1.36', { roto: true }) })).toBeUndefined()
  })
})

describe('preferencia de actualización desatendida', () => {
  it('nace desactivada y se puede cambiar', async () => {
    const home = await hogar('satlas-update-pref-')
    expect(await leerPreferencias(home)).toEqual({ comprobar: true, automatica: false })

    await escribirPreferencias({ comprobar: true, automatica: true }, home)
    expect((await leerPreferencias(home)).automatica).toBe(true)

    await escribirPreferencias({ comprobar: false, automatica: false }, home)
    expect(await leerPreferencias(home)).toEqual({ comprobar: false, automatica: false })
  })

  it('con la comprobación desactivada no se consulta ni se avisa', async () => {
    const home = await hogar('satlas-update-nocheck-')
    await escribirPreferencias({ comprobar: false, automatica: false }, home)
    let consultas = 0
    const contador: typeof fetch = (async () => {
      consultas += 1
      return { ok: true, json: async () => ({ latest: '0.1.40' }) } as Response
    }) as typeof fetch

    expect(await comprobarActualizacion({ instalada: '0.1.35', rutaEjecutable: '/usr/local/lib/node_modules/specatlas/dist/bin.js', home, env: {}, fetchImpl: contador })).toBeUndefined()
    expect(consultas).toBe(0)
  })

  it('una preferencia ilegible no rompe nada: se usan los valores por defecto', async () => {
    const home = await hogar('satlas-update-roto-')
    await fs.mkdir(path.join(home, '.specatlas'), { recursive: true })
    await fs.writeFile(path.join(home, '.specatlas', 'config.json'), '{ esto no es json', 'utf8')
    expect(await leerPreferencias(home)).toEqual({ comprobar: true, automatica: false })
  })
})
