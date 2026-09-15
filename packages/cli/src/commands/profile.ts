import path from 'node:path'
import { detectProfiles, exists, loadProfilesFromDir, writeText, type StackProfile } from '@specatlas/core'
import { requireWorkspace, type CliContext, type CommandResult } from '../cli.js'
import { resolveProfilesDir } from '../paths.js'

export async function runProfile(ctx: CliContext): Promise<CommandResult> {
  const action = ctx.positionals[0] ?? 'detect'
  const { root, workspace } = await requireWorkspace(ctx)
  const officialDir = await resolveProfilesDir()
  const customDir = path.join(workspace.sddDir, 'profiles', 'custom')
  const profiles: StackProfile[] = [...(officialDir ? await loadProfilesFromDir(officialDir) : []), ...(await loadProfilesFromDir(customDir))]

  if (action === 'detect') {
    const result = await detectProfiles(root, profiles)
    const lines = ['Detección de stack', '']
    if (result.matches.length === 0) {
      lines.push('  Sin coincidencias: se usa el perfil genérico.')
      lines.push('  Crea un perfil propio con `satlas profile create <nombre>`.')
    }
    for (const match of result.matches) {
      const best = result.best?.name === match.name ? ' (mejor)' : ''
      lines.push(`  ${match.name} — ${match.score} puntos${best}`)
    }
    return { exitCode: 0, diagnostics: [], data: result, text: lines }
  }

  if (action === 'list') {
    const lines = ['Perfiles disponibles', '']
    for (const profile of profiles) {
      const origin = officialDir && (await isInside(officialDir, profile.name)) ? 'oficial' : 'proyecto'
      lines.push(`  ${profile.name} — ${profile.display_name || profile.name} [${origin}] dominios: ${profile.domains.join(', ') || '—'}`)
    }
    if (profiles.length === 0) lines.push('  No hay perfiles cargados.')
    return { exitCode: 0, diagnostics: [], data: profiles.map((p) => ({ name: p.name, displayName: p.display_name, domains: p.domains })), text: lines }
  }

  if (action === 'create') {
    const name = ctx.positionals[1]
    if (!name) {
      return { exitCode: 2, diagnostics: [{ code: 'ATLAS-PROFILE-001', severity: 'error', message: 'Falta el nombre del perfil: satlas profile create <nombre>' }] }
    }
    const file = path.join(customDir, `${name}.yaml`)
    if (await exists(file)) {
      return { exitCode: 2, diagnostics: [{ code: 'ATLAS-PROFILE-002', severity: 'error', message: `El perfil ya existe: ${file}` }] }
    }
    await writeText(file, profileTemplate(name))
    return {
      exitCode: 0,
      diagnostics: [],
      data: { file },
      text: [`Perfil creado: ${path.relative(ctx.cwd, file)}`, '', 'Edítalo con los comandos reales de tu stack (build/lint/test) y tus anti-patrones.'],
    }
  }

  return {
    exitCode: 2,
    diagnostics: [{ code: 'ATLAS-PROFILE-000', severity: 'error', message: `Acción desconocida: ${action}`, suggestion: 'Usa: satlas profile detect | list | create <nombre>' }],
  }
}

async function isInside(dir: string, name: string): Promise<boolean> {
  return exists(path.join(dir, `${name}.yaml`))
}

function profileTemplate(name: string): string {
  return `name: ${name}
display_name: ${name}
detection:
  files: []
  manifests: []
  priority: 0
domains:
  - other
commands:
  build: ''
  lint: ''
  test: ''
  format: ''
verify:
  executable: []
  automatic: []
  manual:
    - Confirmación humana del resultado observado
rollback: Cómo revertir este tipo de cambio.
antipatterns: []
assumptions: []
`
}
