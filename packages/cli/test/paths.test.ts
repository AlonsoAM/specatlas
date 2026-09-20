import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveProfilesDir, resolveWorkflowDir } from '../src/paths'

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}

describe('resolutor de fuentes (workflow y perfiles)', () => {
  it('en un checkout del repo prefiere las fuentes de la raíz, no la copia empaquetada', async () => {
    const workflow = await resolveWorkflowDir()
    expect(workflow).toBeDefined()
    expect(toPosix(workflow ?? '')).not.toContain('packages/cli/workflow')
    expect(toPosix(workflow ?? '')).toMatch(/\/workflow$/)

    const profiles = await resolveProfilesDir()
    expect(profiles).toBeDefined()
    expect(toPosix(profiles ?? '')).not.toContain('packages/cli/profiles')
    expect(toPosix(profiles ?? '')).toMatch(/\/profiles$/)
  })
})
