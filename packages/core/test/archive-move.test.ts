import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { moveDirectory } from '../src/archive'

async function makeSource(): Promise<{ base: string; from: string; to: string }> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-move-'))
  const from = path.join(base, 'cambio')
  const to = path.join(base, 'archivo', '2026-09-cambio')
  await fs.mkdir(path.join(from, 'mockups'), { recursive: true })
  await fs.writeFile(path.join(from, 'spec.md'), '# delta', 'utf8')
  await fs.writeFile(path.join(from, 'mockups', 'a.html'), '<p>hola</p>', 'utf8')
  await fs.mkdir(path.dirname(to), { recursive: true })
  return { base, from, to }
}

function epermError(): NodeJS.ErrnoException {
  const error = new Error('EPERM: operation not permitted, rename') as NodeJS.ErrnoException
  error.code = 'EPERM'
  return error
}

describe('moveDirectory', () => {
  it('usa rename cuando está disponible', async () => {
    const { from, to } = await makeSource()
    const result = await moveDirectory(from, to)
    expect(result.strategy).toBe('rename')
    expect(await fs.readFile(path.join(to, 'spec.md'), 'utf8')).toBe('# delta')
  })

  it('reintenta y cae a copiar+borrar cuando rename falla con EPERM', async () => {
    const { from, to } = await makeSource()
    let calls = 0
    const result = await moveDirectory(from, to, {
      rename: async () => {
        calls += 1
        throw epermError()
      },
    })
    expect(calls).toBe(3)
    expect(result.strategy).toBe('copy')
    expect(await fs.readFile(path.join(to, 'spec.md'), 'utf8')).toBe('# delta')
    expect(await fs.readFile(path.join(to, 'mockups', 'a.html'), 'utf8')).toBe('<p>hola</p>')
    await expect(fs.stat(from)).rejects.toBeTruthy()
  })

  it('no cae al respaldo si el error no es transitorio', async () => {
    const { from, to } = await makeSource()
    const error = new Error('ENOSPC') as NodeJS.ErrnoException
    error.code = 'ENOSPC'
    await expect(
      moveDirectory(from, to, {
        rename: async () => {
          throw error
        },
      }),
    ).rejects.toThrow('ENOSPC')
    expect(await fs.readFile(path.join(from, 'spec.md'), 'utf8')).toBe('# delta')
  })
})
