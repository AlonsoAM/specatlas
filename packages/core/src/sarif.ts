import path from 'node:path'
import type { Diagnostic } from './diagnostics.js'
import { toPosix } from './fsx.js'

export const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json'
export const SARIF_VERSION = '2.1.0'
export const TOOL_NAME = 'SpecAtlas'
export const TOOL_URL = 'https://github.com/AlonsoAM/specatlas'

export interface SarifOptions {
  diagnostics: readonly Diagnostic[]
  root: string
  version: string
  failed?: boolean
}

export interface SarifRule {
  id: string
  shortDescription: { text: string }
  help?: { text: string }
}

export interface SarifLocation {
  physicalLocation: { artifactLocation: { uri: string }; region?: { startLine: number } }
}

export interface SarifResult {
  ruleId: string
  level: 'error' | 'warning' | 'note'
  message: { text: string }
  locations?: SarifLocation[]
}

export interface SarifReport {
  $schema: string
  version: string
  runs: Array<{
    tool: { driver: { name: string; informationUri: string; version: string; rules: SarifRule[] } }
    results: SarifResult[]
    invocations: Array<{ executionSuccessful: boolean }>
  }>
}

const RULE_FAMILIES: Array<[RegExp, string]> = [
  [/^LINT-STR-/, 'Estructura de los artefactos'],
  [/^LINT-BIZ-/, 'Lenguaje de negocio de la especificación'],
  [/^LINT-DLT-/, 'Delta de especificación'],
  [/^LINT-EVD-/, 'Evidencia registrada'],
  [/^LINT-TSK-/, 'Tareas declaradas'],
  [/^LINT-PLN-/, 'Plan técnico'],
  [/^(LINT-MKP|MKP)-/, 'Mockups'],
  [/^TRACE-/, 'Trazabilidad requisito, escenario, tarea y evidencia'],
  [/^PACK-/, 'Pack de cumplimiento'],
  [/^ATLAS-UPGRADE-/, 'Actualización del estado del proyecto'],
  [/^ATLAS-ADAPTERS-/, 'Adaptadores de agente'],
  [/^ATLAS-CI-/, 'Comprobación continua'],
  [/^ATLAS-/, 'Estado del proyecto'],
]

export function ruleDescription(code: string): string {
  for (const [pattern, description] of RULE_FAMILIES) {
    if (pattern.test(code)) return description
  }
  return code
}

export function sarifLevel(severity: Diagnostic['severity']): SarifResult['level'] {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'note'
}

function resultOf(diagnostic: Diagnostic, root: string): SarifResult {
  const result: SarifResult = {
    ruleId: diagnostic.code,
    level: sarifLevel(diagnostic.severity),
    message: { text: diagnostic.message },
  }
  if (diagnostic.path) {
    const rel = path.relative(root, diagnostic.path)
    if (rel !== '') {
      const physicalLocation: SarifLocation['physicalLocation'] = {
        artifactLocation: { uri: toPosix(rel) },
        ...(diagnostic.line ? { region: { startLine: diagnostic.line } } : {}),
      }
      result.locations = [{ physicalLocation }]
    }
  }
  return result
}

export function toSarifReport(opts: SarifOptions): SarifReport {
  const rules = new Map<string, SarifRule>()
  const results: SarifResult[] = []

  for (const diagnostic of opts.diagnostics) {
    let rule = rules.get(diagnostic.code)
    if (!rule) {
      rule = { id: diagnostic.code, shortDescription: { text: ruleDescription(diagnostic.code) } }
      if (diagnostic.suggestion) rule.help = { text: diagnostic.suggestion }
      rules.set(diagnostic.code, rule)
    } else if (!rule.help && diagnostic.suggestion) {
      rule.help = { text: diagnostic.suggestion }
    }
    results.push(resultOf(diagnostic, opts.root))
  }

  return {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            informationUri: TOOL_URL,
            version: opts.version,
            rules: [...rules.values()],
          },
        },
        results,
        invocations: [{ executionSuccessful: !(opts.failed ?? false) }],
      },
    ],
  }
}

export function toSarifText(opts: SarifOptions): string {
  return `${JSON.stringify(toSarifReport(opts), null, 2)}\n`
}
