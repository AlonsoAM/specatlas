import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it } from 'vitest'
import { runCi } from '../src/commands/ci'
import type { CliContext } from '../src/cli'
import { cliVersion } from '../src/version'
import type { SarifReport } from '@specatlas/core'

const CLEAN_SPEC = `---
domain: altas
title: Alta de tareas
version: 1
updated: 2026-09-20
---

# Alta de tareas

### Requisito: REQ-ALTAS-001 — Registrar una tarea
El equipo DEBE poder registrar una tarea con su título.

- Regla BR-ALTAS-001: Toda tarea registrada queda con su título y su fecha.

#### Escenario: REQ-ALTAS-001-S1 — Registro válido
- **CUANDO** el equipo registra una tarea con título válido
- **ENTONCES** la tarea queda registrada con su fecha
`

const ERROR_SPEC = CLEAN_SPEC.replace(
  'El equipo DEBE poder registrar una tarea con su título.',
  'El equipo DEBE poder registrar una tarea con su título desde la api. NOTA-INTERNA-S3CR3T',
)

const ORPHAN_VERIFY = `# Verificación — aviso

### REQ-OTRO-001-S9

\`\`\`evidence
method: executable
command: node -e ok
result: pass
date: 2026-09-20 10:00:00 -05:00
by: Prueba
\`\`\`
`

function ctx(cwd: string, flags: Record<string, string | boolean> = {}): CliContext {
  return { cwd, json: true, language: 'es', flags, positionals: [] }
}

async function writeArtifact(root: string, rel: string, content: string): Promise<void> {
  const abs = path.join(root, '.sdd', ...rel.split('/'))
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

async function makeWorkspace(kind: 'clean' | 'error' | 'warning'): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-ci-sarif-'))
  await writeArtifact(root, 'config.yaml', 'schema_version: 1\nproject:\n  name: prueba\n  language: es\n')
  await writeArtifact(root, 'specs/altas/spec.md', kind === 'error' ? ERROR_SPEC : CLEAN_SPEC)
  if (kind === 'warning') {
    await writeArtifact(root, 'changes/aviso/meta.yaml', 'schema_version: 1\nslug: aviso\nlane: standard\ndomain: altas\ntitle: Aviso\n')
    await writeArtifact(root, 'changes/aviso/verify.md', ORPHAN_VERIFY)
  }
  return root
}

function readReport(root: string, rel = 'out.sarif'): Promise<SarifReport> {
  return fs.readFile(path.join(root, rel), 'utf8').then((text) => JSON.parse(text) as SarifReport)
}

describe('satlas ci --sarif', () => {
  it('escribe el informe con los hallazgos y bloquea igual que el gate (REQ-CI-001-S1, REQ-CI-003-S1)', async () => {
    const root = await makeWorkspace('error')
    const result = await runCi(ctx(root, { sarif: 'out.sarif' }))

    expect(result.exitCode).toBe(1)
    expect((result.data as { sarif: string }).sarif).toBe('out.sarif')

    const report = await readReport(root)
    expect(report.version).toBe('2.1.0')
    expect(report.runs[0]?.tool.driver.name).toBe('SpecAtlas')
    expect(report.runs[0]?.tool.driver.version).toBe(cliVersion())
    expect(report.runs[0]?.invocations[0]?.executionSuccessful).toBe(false)

    const first = report.runs[0]?.results[0]
    expect(first?.ruleId).toBe('LINT-BIZ-001')
    expect(first?.level).toBe('error')
    expect(first?.locations?.[0]?.physicalLocation.artifactLocation.uri).toBe('.sdd/specs/altas/spec.md')
    expect(first?.locations?.[0]?.physicalLocation.region?.startLine).toBeGreaterThan(0)
    expect(JSON.stringify(report)).not.toContain(root)
  })

  it('escribe un informe válido y vacío sin hallazgos (REQ-CI-001-S2)', async () => {
    const root = await makeWorkspace('clean')
    const result = await runCi(ctx(root, { sarif: 'out.sarif' }))
    expect(result.exitCode).toBe(0)
    const report = await readReport(root)
    expect(report.runs[0]?.results).toEqual([])
    expect(report.runs[0]?.invocations[0]?.executionSuccessful).toBe(true)
  })

  it('avisa si la ruta no es escribible sin cambiar el veredicto (REQ-CI-001-S4)', async () => {
    const root = await makeWorkspace('clean')
    const result = await runCi(ctx(root, { sarif: '.sdd/config.yaml/out.sarif' }))
    expect(result.exitCode).toBe(0)
    expect(result.diagnostics.some((d) => d.code === 'ATLAS-CI-SARIF-001')).toBe(true)
    expect((result.data as { sarif?: string }).sarif).toBeUndefined()
  })

  it('en modo estricto los avisos bloquean y quedan en el informe (REQ-CI-003-S2, REQ-CI-003-S3)', async () => {
    const root = await makeWorkspace('warning')
    const lax = await runCi(ctx(root, { sarif: 'lax.sarif' }))
    expect(lax.exitCode).toBe(0)
    const laxReport = await readReport(root, 'lax.sarif')
    expect(laxReport.runs[0]?.results.length).toBeGreaterThan(0)
    expect(laxReport.runs[0]?.results.every((r) => r.level === 'warning')).toBe(true)

    const strict = await runCi(ctx(root, { sarif: 'strict.sarif', strict: true }))
    expect(strict.exitCode).toBe(1)
    const strictReport = await readReport(root, 'strict.sarif')
    expect(strictReport.runs[0]?.invocations[0]?.executionSuccessful).toBe(false)
  })

  it('el informe no contiene contenido de archivos ni credenciales (REQ-CI-005-S1)', async () => {
    const secret = 'VALOR-SECRETO-123'
    process.env['SPECATLAS_TEST_SECRET'] = secret
    try {
      const root = await makeWorkspace('error')
      await runCi(ctx(root, { sarif: 'out.sarif' }))
      const text = await fs.readFile(path.join(root, 'out.sarif'), 'utf8')
      expect(text).not.toContain('NOTA-INTERNA-S3CR3T')
      expect(text).not.toContain(secret)
    } finally {
      delete process.env['SPECATLAS_TEST_SECRET']
    }
  })

  it('el veredicto se emite sin usar la red (REQ-CI-005-S3)', async () => {
    const sarifSource = await fs.readFile(new URL('../../core/src/sarif.ts', import.meta.url), 'utf8')
    const ciSource = await fs.readFile(new URL('../src/commands/ci.ts', import.meta.url), 'utf8')
    for (const source of [sarifSource, ciSource]) {
      expect(source).not.toMatch(/\bfetch\s*\(/)
      expect(source).not.toMatch(/node:https?/)
      expect(source).not.toMatch(/XMLHttpRequest/)
    }
    const root = await makeWorkspace('clean')
    const result = await runCi(ctx(root, { sarif: 'out.sarif' }))
    expect(result.exitCode).toBe(0)
  })
})

describe('Action oficial (action.yml)', () => {
  async function loadAction(): Promise<Record<string, unknown>> {
    const raw = await fs.readFile(new URL('../../../action.yml', import.meta.url), 'utf8')
    return parseYaml(raw) as Record<string, unknown>
  }

  it('declara entradas y pasos suficientes para usarse con un solo paso (REQ-CI-004-S1, REQ-CI-004-S2)', async () => {
    const action = await loadAction()
    expect(action['name']).toBe('SpecAtlas CI')
    const inputs = action['inputs'] as Record<string, { default?: string; required?: boolean }>
    expect(Object.keys(inputs).sort()).toEqual(['path', 'sarif-file', 'strict', 'upload', 'version'])
    expect(inputs['version']?.default).toBe('latest')
    expect(inputs['path']?.default).toBe('.')
    expect(inputs['strict']?.default).toBe('false')
    expect(inputs['sarif-file']?.default).toBe('specatlas.sarif')

    const runs = action['runs'] as { using: string; steps: Array<Record<string, unknown>> }
    expect(runs.using).toBe('composite')
    expect(runs.steps).toHaveLength(3)
    const install = String(runs.steps[0]?.['run'])
    expect(install).toContain('npm install -g')
    expect(install).toContain('specatlas@${{ inputs.version }}')
    const ci = String(runs.steps[1]?.['run'])
    expect(ci).toContain('satlas ci --sarif')
    expect(ci).toContain('--strict')
    expect(String(runs.steps[1]?.['working-directory'])).toContain('inputs.path')
  })

  it('publica el informe sin cambiar el veredicto (REQ-CI-001-S3, REQ-CI-005-S2)', async () => {
    const action = await loadAction()
    const runs = action['runs'] as { steps: Array<Record<string, unknown>> }
    const upload = runs.steps[2] ?? {}
    expect(upload['uses']).toBe('github/codeql-action/upload-sarif@v3')
    expect(upload['continue-on-error']).toBe(true)
    expect(String(upload['if'])).toContain('always()')
    expect(String(upload['if'])).toContain("inputs.upload == 'true'")
  })

  it('informa con claridad cuando la herramienta no puede obtenerse (REQ-CI-004-S4)', async () => {
    const action = await loadAction()
    const runs = action['runs'] as { steps: Array<Record<string, unknown>> }
    const install = runs.steps[0] ?? {}
    expect(String(install['run'])).toContain('npm install -g')
    expect(install['continue-on-error']).toBeUndefined()
  })

  it('no exige preparar el proyecto ni pasos previos (REQ-CI-004-S3)', async () => {
    const action = await loadAction()
    const runs = action['runs'] as { steps: Array<Record<string, unknown>> }
    expect(runs.steps.some((step) => String(step['uses'] ?? '').includes('setup-node'))).toBe(false)
    expect(String(runs.steps[1]?.['run'])).toContain('satlas ci')
  })
})
