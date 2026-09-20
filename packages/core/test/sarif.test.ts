import { describe, expect, it } from 'vitest'
import { diag } from '../src/diagnostics'
import { SARIF_SCHEMA, SARIF_VERSION, TOOL_NAME, ruleDescription, sarifLevel, toSarifReport, toSarifText } from '../src/sarif'

const ROOT = process.platform === 'win32' ? 'C:\\proyecto' : '/proyecto'

describe('conversión a SARIF 2.1.0', () => {
  it('declara cada regla una vez con su descripción y referencia el código (REQ-CI-002-S1)', () => {
    const report = toSarifReport({
      root: ROOT,
      version: '1.2.3',
      diagnostics: [
        diag('LINT-BIZ-001', 'error', 'Jerga técnica en la especificación de negocio: "api"', { path: `${ROOT}/specs/a/spec.md`, line: 4 }),
        diag('LINT-BIZ-001', 'error', 'Jerga técnica en la especificación de negocio: "json"', { path: `${ROOT}/specs/a/spec.md`, line: 9 }),
        diag('TRACE-002', 'error', 'El escenario REQ-A-001-S1 no está cubierto por ninguna tarea', { path: `${ROOT}/changes/x/spec.md`, line: 3 }),
      ],
    })

    expect(report.$schema).toBe(SARIF_SCHEMA)
    expect(report.version).toBe(SARIF_VERSION)
    const driver = report.runs[0]?.tool.driver
    expect(driver?.name).toBe(TOOL_NAME)
    expect(driver?.version).toBe('1.2.3')
    expect(driver?.rules.map((r) => r.id)).toEqual(['LINT-BIZ-001', 'TRACE-002'])
    expect(driver?.rules[0]?.shortDescription.text).toBe('Lenguaje de negocio de la especificación')
    expect(driver?.rules[1]?.shortDescription.text).toBe('Trazabilidad requisito, escenario, tarea y evidencia')
    expect(report.runs[0]?.results).toHaveLength(3)
    expect(report.runs[0]?.results.every((r) => typeof r.ruleId === 'string')).toBe(true)
  })

  it('usa rutas relativas en posix con su línea (REQ-CI-002-S2)', () => {
    const report = toSarifReport({
      root: ROOT,
      version: '1.0.0',
      diagnostics: [diag('LINT-BIZ-001', 'error', 'Jerga técnica', { path: `${ROOT}/specs/a/spec.md`, line: 7 })],
    })
    const location = report.runs[0]?.results[0]?.locations?.[0]?.physicalLocation
    expect(location?.artifactLocation.uri).toBe('specs/a/spec.md')
    expect(location?.region?.startLine).toBe(7)
    expect(JSON.stringify(report)).not.toContain(ROOT)
  })

  it('incluye hallazgos sin archivo en la sección general (REQ-CI-002-S3)', () => {
    const report = toSarifReport({
      root: ROOT,
      version: '1.0.0',
      diagnostics: [diag('ATLAS-LIFECYCLE-001', 'error', 'Plan sin firma vigente')],
    })
    const result = report.runs[0]?.results[0]
    expect(result?.locations).toBeUndefined()
    expect(result?.message.text).toContain('Plan sin firma')
  })

  it('produce un informe válido y vacío sin hallazgos (REQ-CI-001-S2)', () => {
    const text = toSarifText({ root: ROOT, version: '1.0.0', diagnostics: [] })
    const report = JSON.parse(text) as ReturnType<typeof toSarifReport>
    expect(report.runs[0]?.results).toEqual([])
    expect(report.runs[0]?.tool.driver.rules).toEqual([])
    expect(report.runs[0]?.invocations[0]?.executionSuccessful).toBe(true)
  })

  it('mapea severidades a niveles SARIF', () => {
    expect(sarifLevel('error')).toBe('error')
    expect(sarifLevel('warning')).toBe('warning')
    expect(sarifLevel('info')).toBe('note')
  })

  it('declara descripciones por familia y cae al código cuando no hay familia', () => {
    expect(ruleDescription('LINT-STR-003')).toBe('Estructura de los artefactos')
    expect(ruleDescription('MKP-STALE')).toBe('Mockups')
    expect(ruleDescription('ATLAS-UPGRADE-001')).toBe('Actualización del estado del proyecto')
    expect(ruleDescription('PACK-SEGURIDAD-001')).toBe('Pack de cumplimiento')
    expect(ruleDescription('DESCONOCIDO-001')).toBe('DESCONOCIDO-001')
  })

  it('declara el veredicto de la comprobación (fallida o no)', () => {
    const failed = toSarifReport({ root: ROOT, version: '1.0.0', diagnostics: [diag('TRACE-002', 'error', 'x')], failed: true })
    expect(failed.runs[0]?.invocations[0]?.executionSuccessful).toBe(false)
    const ok = toSarifReport({ root: ROOT, version: '1.0.0', diagnostics: [] })
    expect(ok.runs[0]?.invocations[0]?.executionSuccessful).toBe(true)
  })
})
