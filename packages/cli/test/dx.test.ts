import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { closestCommand, editDistance, COMMANDS, type CliContext } from '../src/cli'
import { runInit } from '../src/commands/init'
import { runNew } from '../src/commands/new'
import { runPause, runResume } from '../src/commands/pause'

function ctx(cwd: string, positionals: string[] = [], flags: Record<string, string | boolean> = {}): CliContext {
  return { cwd, json: false, language: 'es', flags, positionals }
}

describe('sugerencia de comando', () => {
  it('propone el comando más cercano a lo que se escribió', () => {
    const names = Object.keys(COMMANDS)
    expect(closestCommand('stauts', names)).toBe('status')
    expect(closestCommand('arcive', names)).toBe('archive')
    expect(closestCommand('vaidate', names)).toBe('validate')
  })

  it('no inventa una sugerencia cuando no se parece a nada', () => {
    expect(closestCommand('xyzzy', Object.keys(COMMANDS))).toBeUndefined()
    expect(editDistance('status', 'status')).toBe(0)
    expect(editDistance('status', 'statuz')).toBe(1)
  })
})

describe('pause y resume desde la terminal', () => {
  it('pausa con motivo y autor, y reanuda indicando el siguiente paso real', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'satlas-cli-pause-'))
    await runInit(ctx(root, [], { name: 'demo' }))
    await runNew(ctx(root, ['login'], { domain: 'auth', title: 'Iniciar sesión' }))

    const paused = await runPause(ctx(root, ['login'], { reason: 'esperando negocio', by: 'Alonso Anchante' }))
    expect(paused.exitCode).toBe(0)
    expect((paused.text ?? []).join('\n')).toContain('esperando negocio')

    const resumed = await runResume(ctx(root, ['login']))
    expect(resumed.exitCode).toBe(0)
    expect((resumed.text ?? []).join('\n')).toContain('/satlas-specify login')
  })

  it('la pausa sin motivo falla con su código y no toca el cambio', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'satlas-cli-pause-err-'))
    await runInit(ctx(root, [], { name: 'demo' }))
    await runNew(ctx(root, ['login'], { domain: 'auth' }))

    const result = await runPause(ctx(root, ['login'], { by: 'Alonso' }))
    expect(result.exitCode).toBe(1)
    expect(result.diagnostics[0]?.code).toBe('ATLAS-PAUSE-002')
    const raw = await fs.readFile(path.join(root, '.sdd', 'changes', 'login', 'meta.yaml'), 'utf8')
    expect(raw).not.toContain('paused:')
  })

  it('pedir pause o resume sin slug explica el uso', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'satlas-cli-pause-usage-'))
    await runInit(ctx(root, [], { name: 'demo' }))
    expect((await runPause(ctx(root))).exitCode).toBe(2)
    expect((await runResume(ctx(root))).exitCode).toBe(2)
  })
})

describe('el agente elegido al inicializar manda', () => {
  it('`init --agents claude-code` deja la configuración, los artefactos y las invocaciones de ese agente', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'satlas-cli-agents-'))
    await runInit(ctx(root, [], { name: 'demo', agents: 'claude-code' }))

    const config = await fs.readFile(path.join(root, '.sdd', 'config.yaml'), 'utf8')
    expect(config).toContain('- claude-code')
    expect(config).not.toContain('- opencode')

    const skill = await fs.readFile(path.join(root, '.claude', 'skills', 'satlas-specify', 'SKILL.md'), 'utf8')
    expect(skill).toContain('/satlas:mockup')
    expect(skill).not.toContain('/satlas-mockup')

    const created = await runNew(ctx(root, ['pantalla'], { domain: 'frontend' }))
    expect((created.text ?? []).join(' ')).toContain('/satlas:specify pantalla')
  })
})
