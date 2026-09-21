import { describe, expect, it } from 'vitest'
import { hasShellMetacharacters, runProcess } from '../src/exec'

describe('ejecución de comandos de evidencia', () => {
  it('ejecuta un lanzador de npm (en Windows es un .cmd que execFile no resuelve solo)', async () => {
    const result = await runProcess('npx --version', { timeoutMs: 60_000 })
    expect(result.spawnError).toBeUndefined()
    expect(result.ok).toBe(true)
    expect(result.stdout.trim().length).toBeGreaterThan(0)
  }, 60_000)

  it('ejecuta un binario normal sin pasar por el shell', async () => {
    const result = await runProcess('node --version')
    expect(result.ok).toBe(true)
    expect(result.stdout).toContain('v')
  })

  it('un comando inexistente falla y lo dice, en vez de devolver una salida vacía en silencio', async () => {
    const result = await runProcess('specatlas-no-existe-jamas --version')
    expect(result.ok).toBe(false)
    expect(result.exitCode).not.toBe(0)
    expect(result.spawnError !== undefined || result.stderr.trim().length > 0).toBe(true)
  })

  it('los metacaracteres siguen rechazados antes de ejecutar nada', async () => {
    expect(hasShellMetacharacters('npm test | tee salida.txt')).toBe(true)
    const result = await runProcess('npm test && rm -rf .')
    expect(result.exitCode).toBe(126)
    expect(result.stderr).toContain('metacaracteres')
  })
})
