import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { adoptWorkspace } from '../src/adopt'
import { initWorkspace } from '../src/init'

async function makeProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-adopt-'))
  await initWorkspace({ root, name: 'legacy-app', language: 'es' })
  await fs.mkdir(path.join(root, 'src', 'auth'), { recursive: true })
  await fs.mkdir(path.join(root, 'src', 'billing'), { recursive: true })
  await fs.writeFile(path.join(root, 'src', 'auth', 'login.ts'), 'export const login = () => 1\n', 'utf8')
  await fs.writeFile(path.join(root, 'src', 'auth', 'logout.ts'), 'export const logout = () => 1\n', 'utf8')
  await fs.writeFile(path.join(root, 'src', 'billing', 'invoice.ts'), 'export const invoice = () => 1\n', 'utf8')
  await fs.writeFile(path.join(root, 'src', 'billing', 'payment.ts'), 'export const pay = () => 1\n', 'utf8')
  await fs.writeFile(path.join(root, 'src', 'index.ts'), 'export {}\n', 'utf8')
  return root
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

describe('adoptWorkspace (brownfield)', () => {
  it('inventa dominios, crea specs baseline y escribe el informe', async () => {
    const root = await makeProject()
    const result = await adoptWorkspace({ root, profilesDirs: [path.resolve(__dirname, '..', '..', '..', 'profiles')] })
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
    const names = result.domains.map((d) => d.name).sort()
    expect(names).toContain('auth')
    expect(names).toContain('billing')

    const spec = path.join(root, '.sdd', 'specs', 'auth', 'spec.md')
    expect(await exists(spec)).toBe(true)
    const content = await fs.readFile(spec, 'utf8')
    expect(content).toContain('domain: auth')
    expect(content).toContain('## Anclas de implementación')
    expect(content).toContain('src/auth/login.ts')

    const report = path.join(root, '.sdd', 'adopt-report.md')
    expect(await exists(report)).toBe(true)
    const reportText = await fs.readFile(report, 'utf8')
    expect(reportText).toContain('/satlas-adopt')
    expect(reportText).toContain('satlas archive adopt-')
  })

  it('respeta specs existentes y el dry-run no escribe', async () => {
    const root = await makeProject()
    const first = await adoptWorkspace({ root })
    expect(first.createdSpecs.length).toBeGreaterThan(0)

    await fs.writeFile(path.join(root, '.sdd', 'specs', 'auth', 'spec.md'), '---\ndomain: auth\ntitle: Auth\nversion: 3\n---\n\n# Auth\n\n### Requisito: REQ-AUTH-001 — Login\nProsa.\n\n#### Escenario: REQ-AUTH-001-S1 — ok\n- **CUANDO** a\n- **ENTONCES** b\n', 'utf8')
    const second = await adoptWorkspace({ root })
    const auth = second.domains.find((d) => d.name === 'auth')!
    expect(auth.existingSpec).toBe(true)
    const preserved = await fs.readFile(path.join(root, '.sdd', 'specs', 'auth', 'spec.md'), 'utf8')
    expect(preserved).toContain('version: 3')
    expect(second.diagnostics.some((d) => d.code === 'ATLAS-ADOPT-003')).toBe(true)

    const dry = await adoptWorkspace({ root, domains: ['nuevo'], dryRun: true })
    expect(dry.createdSpecs.some((s) => s.includes('nuevo'))).toBe(true)
    expect(await exists(path.join(root, '.sdd', 'specs', 'nuevo', 'spec.md'))).toBe(false)
  })

  it('falla claro si no está inicializado', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-adopt2-'))
    const result = await adoptWorkspace({ root })
    expect(result.diagnostics[0]!.code).toBe('ATLAS-ADOPT-001')
  })
})
