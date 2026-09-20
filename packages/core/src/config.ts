import path from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { z } from 'zod'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import type { Lane, Language } from './model.js'
import { readTextIfExists, writeText } from './fsx.js'

export const CONFIG_FILE = 'config.yaml'

export const atlasConfigSchema = z.object({
  schema_version: z.number().int().positive().default(1),
  project: z
    .object({
      name: z.string().default('proyecto'),
      language: z.enum(['es', 'en']).default('es'),
    })
    .default({}),
  lanes: z
    .object({
      default: z.enum(['fix', 'standard', 'full']).default('standard'),
      allowed: z.array(z.enum(['fix', 'standard', 'full'])).default(['fix', 'standard', 'full']),
    })
    .default({}),
  gates: z
    .object({
      approval: z.enum(['file', 'none', 'github-label']).default('file'),
      approval_label: z.string().default('spec-approved'),
      analyze: z.object({ mode: z.enum(['off', 'advisory', 'blocking']).default('blocking'), min_severity: z.enum(['low', 'medium', 'high']).default('medium') }).default({}),
      verify: z.object({ mode: z.enum(['off', 'advisory', 'blocking']).default('blocking'), require_evidence: z.boolean().default(true) }).default({}),
      review: z.object({ mode: z.enum(['off', 'advisory', 'blocking']).default('advisory') }).default({}),
      clarify: z.object({ mode: z.enum(['off', 'advisory', 'blocking']).default('advisory') }).default({}),
      docs: z.object({ mode: z.enum(['off', 'advisory', 'blocking']).default('blocking') }).default({}),
      contracts: z.object({ mode: z.enum(['off', 'advisory', 'blocking']).default('advisory') }).default({}),
      mockup: z.object({ require_approval: z.boolean().default(false), compare_in_verify: z.boolean().default(false) }).default({}),
    })
    .default({}),
  trace: z.object({ mode: z.enum(['off', 'advisory', 'blocking']).default('blocking'), prefix: z.string().default('REQ') }).default({}),
  waves: z.object({ max_parallel: z.number().int().min(1).max(8).default(3) }).default({}),
  ci: z.object({ drift: z.enum(['advisory', 'strict']).default('advisory') }).default({}),
  spec: z
    .object({
      language: z.enum(['es', 'en']).default('es'),
      business_only: z.boolean().default(true),
      glossary: z.string().default('.sdd/glossary.md'),
    })
    .default({}),
  syntax: z.object({ headers: z.enum(['es', 'en']).optional() }).default({}),
  mockups: z
    .object({
      level: z.enum(['sketch', 'hifi']).default('hifi'),
      platform: z.enum(['auto', 'web', 'mobile', 'desktop']).default('auto'),
      a11y: z.enum(['off', 'A', 'AA', 'AAA']).default('AA'),
    })
    .default({}),
  editor: z.object({ vscode: z.boolean().default(true), lsp: z.boolean().default(true) }).default({}),
  adapters: z
    .object({
      targets: z.array(z.enum(['opencode', 'claude-code', 'cursor', 'copilot', 'gemini', 'codex', 'generic'])).default(['opencode', 'generic']),
    })
    .default({}),
  packs: z.array(z.string()).default([]),
  integrations: z.object({ tracker: z.enum(['none', 'github', 'jira', 'linear', 'clickup']).default('none') }).default({}),
})

export type AtlasConfig = z.infer<typeof atlasConfigSchema>

export function defaultConfig(overrides: { name?: string; language?: Language } = {}): AtlasConfig {
  return atlasConfigSchema.parse({
    project: { name: overrides.name ?? 'proyecto', language: overrides.language ?? 'es' },
  })
}

export function configToYaml(cfg: AtlasConfig): string {
  const header =
    '# Configuración de SpecAtlas\n' +
    '# language: es por defecto; en solo si el equipo trabaja en inglés.\n' +
    '# Los gates aceptan: off | advisory | blocking\n\n'
  return header + stringifyYaml(cfg, { lineWidth: 120 })
}

export interface LoadedConfig {
  config: AtlasConfig
  diagnostics: Diagnostic[]
}

export function parseConfig(raw: string, configPath = CONFIG_FILE): LoadedConfig {
  let data: unknown
  try {
    data = parseYaml(raw) ?? {}
  } catch (err) {
    return {
      config: defaultConfig(),
      diagnostics: [diag('ATLAS-CONFIG-001', 'error', `YAML inválido en ${configPath}: ${(err as Error).message}`, { path: configPath })],
    }
  }
  const parsed = atlasConfigSchema.safeParse(data)
  if (!parsed.success) {
    return {
      config: defaultConfig(),
      diagnostics: parsed.error.issues.map((issue) =>
        diag('ATLAS-CONFIG-002', 'error', `Configuración inválida en ${issue.path.join('.') || '(raíz)'}: ${issue.message}`, {
          path: configPath,
          suggestion: 'Corrige config.yaml según el esquema documentado',
        }),
      ),
    }
  }
  const cfg = parsed.data
  const diagnostics: Diagnostic[] = []
  if (cfg.spec.language !== cfg.project.language) {
    diagnostics.push(
      diag('ATLAS-CONFIG-003', 'warning', `spec.language (${cfg.spec.language}) difiere de project.language (${cfg.project.language})`, {
        path: configPath,
        suggestion: 'Iguala ambos valores para evitar mezclar idiomas',
      }),
    )
  }
  if (!cfg.lanes.allowed.includes(cfg.lanes.default)) {
    diagnostics.push(
      diag('ATLAS-CONFIG-004', 'error', `El carril por defecto "${cfg.lanes.default}" no está en lanes.allowed`, { path: configPath }),
    )
  }
  return { config: cfg, diagnostics }
}

export async function loadConfig(sddDir: string): Promise<LoadedConfig> {
  const configPath = path.join(sddDir, CONFIG_FILE)
  const raw = await readTextIfExists(configPath)
  if (raw === undefined) {
    return {
      config: defaultConfig(),
      diagnostics: [
        diag('ATLAS-CONFIG-000', 'warning', 'No existe .sdd/config.yaml; se usan valores por defecto (language: es)', {
          path: configPath,
          suggestion: 'Ejecuta `satlas init` para generar la configuración',
        }),
      ],
    }
  }
  return parseConfig(raw, configPath)
}

export async function writeConfig(sddDir: string, cfg: AtlasConfig): Promise<void> {
  await writeText(path.join(sddDir, CONFIG_FILE), configToYaml(cfg))
}

export function laneOrDefault(cfg: AtlasConfig, lane?: string): Lane {
  if (lane === 'fix' || lane === 'standard' || lane === 'full') return lane
  return cfg.lanes.default
}
