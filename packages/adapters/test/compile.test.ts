import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { artifactHash, defaultConfig, detectProfiles, loadProfilesFromDir, parseConfig, parseFrontmatter } from '@specatlas/core'
import { checkAdapters, compileTargets, loadWorkflow } from '../src/index'

async function write(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content, 'utf8')
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const MINI_WORKFLOW = {
  'phases/specify.md': `---
id: specify
title: Especificar
description: Escribe la spec de negocio.
arguments: true
---

# Especificar

Escribe el delta de {{SLUG}} en {{LANGUAGE_NAME}}.

{{>regla}}
`,
  'snippets/regla.md': `Regla: sin tecnología en la spec.`,
}

describe('loadWorkflow', () => {
  it('carga fases y snippets con hash de fuente estable', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-wf-'))
    for (const [rel, content] of Object.entries(MINI_WORKFLOW)) await write(path.join(dir, rel), content)
    const sources = await loadWorkflow(dir)
    expect(sources.phases).toHaveLength(1)
    expect(sources.phases[0]!.id).toBe('specify')
    expect(sources.snippets.get('regla')).toContain('sin tecnología')
    const again = await loadWorkflow(dir)
    expect(again.sourceHash).toBe(sources.sourceHash)
  })
})

describe('compileTargets (golden mini)', () => {
  it('compila opencode, claude-code y generic de forma determinista', async () => {
    const workflowDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-wf-'))
    for (const [rel, content] of Object.entries(MINI_WORKFLOW)) await write(path.join(workflowDir, rel), content)
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-out-'))

    const report = await compileTargets({ root, workflowDir, targets: ['opencode', 'claude-code', 'generic'] })
    expect(report.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

    const opencodeCommand = await fs.readFile(path.join(root, '.opencode/command/satlas-specify.md'), 'utf8')
    expect(opencodeCommand).toContain('description: Escribe la spec de negocio.')
    expect(opencodeCommand).toContain('$ARGUMENTS')
    expect(opencodeCommand).toContain('español')
    expect(opencodeCommand).toContain('sin tecnología en la spec')

    const skill = await fs.readFile(path.join(root, '.opencode/skills/satlas-specify/SKILL.md'), 'utf8')
    expect(skill).toContain('name: satlas-specify')
    expect(skill).toContain('<slug>')

    const claudeCommand = await fs.readFile(path.join(root, '.claude/commands/satlas/specify.md'), 'utf8')
    expect(claudeCommand).toContain('$ARGUMENTS')

    const agents = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('<!-- BEGIN specatlas -->')
    expect(agents).toContain('prompts/satlas-specify.md')

    const prompt = await fs.readFile(path.join(root, 'prompts/satlas-specify.md'), 'utf8')
    expect(prompt).toContain('Generado por SpecAtlas')

    const manifest = JSON.parse(await fs.readFile(path.join(root, '.sdd/.generated/manifest.json'), 'utf8')) as {
      sourceHash: string
      targets: Record<string, Array<{ path: string; hash: string }>>
    }
    expect(manifest.sourceHash).toMatch(/^sha256:/)
    expect(manifest.targets['opencode']?.length).toBe(2)

    // Segunda pasada: sin cambios
    const second = await compileTargets({ root, workflowDir, targets: ['opencode', 'claude-code', 'generic'] })
    expect(second.written).toHaveLength(0)
    expect(second.stale).toHaveLength(0)

    // Tercera: se modifica una fuente → check detecta desactualización
    await write(path.join(workflowDir, 'snippets/regla.md'), 'Regla cambiada.')
    const check = await checkAdapters({ root, workflowDir, targets: ['opencode', 'claude-code', 'generic'] })
    expect(check.ok).toBe(false)
    expect(check.stale.length).toBeGreaterThan(0)
  })

  it('preserva el contenido de AGENTS.md fuera del bloque gestionado', async () => {
    const workflowDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-wf2-'))
    for (const [rel, content] of Object.entries(MINI_WORKFLOW)) await write(path.join(workflowDir, rel), content)
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-out2-'))
    await write(path.join(root, 'AGENTS.md'), '# Reglas del repo\n\nNo tocar producción.\n')

    await compileTargets({ root, workflowDir, targets: ['generic'] })
    const first = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')
    expect(first).toContain('# Reglas del repo')
    expect(first).toContain('<!-- BEGIN specatlas -->')

    await compileTargets({ root, workflowDir, targets: ['generic'] })
    const second = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')
    expect(second).toBe(first)
    expect(second.match(/<!-- BEGIN specatlas -->/g)).toHaveLength(1)
  })
})

describe('targets adicionales (cursor, copilot, gemini, codex)', () => {
  it('compila artefactos válidos por agente', async () => {
    const workflowDir = path.resolve(__dirname, '..', '..', '..', 'workflow')
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-targets-'))
    const report = await compileTargets({ root, workflowDir, targets: ['cursor', 'copilot', 'gemini', 'codex'] })
    expect(report.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

    const cursorSkill = await fs.readFile(path.join(root, '.cursor/skills/satlas-specify/SKILL.md'), 'utf8')
    expect(cursorSkill).toContain('name: satlas-specify')
    expect(cursorSkill).toContain('disable-model-invocation: true')
    const cursorCommand = await fs.readFile(path.join(root, '.cursor/commands/satlas-plan.md'), 'utf8')
    expect(cursorCommand).toContain('Si al invocar indicaste un slug')

    const copilot = await fs.readFile(path.join(root, '.github/prompts/satlas-verify.prompt.md'), 'utf8')
    expect(copilot).toContain('description: ')
    expect(copilot).toContain('name: satlas-verify')
    const instructions = await fs.readFile(path.join(root, '.github/copilot-instructions.md'), 'utf8')
    expect(instructions).toContain('BEGIN specatlas')

    const gemini = await fs.readFile(path.join(root, '.gemini/commands/satlas/specify.toml'), 'utf8')
    expect(gemini).toContain('description = "')
    expect(gemini).toContain("prompt = '''")
    expect(gemini).toContain('{{args}}')
    const geminiMd = await fs.readFile(path.join(root, 'GEMINI.md'), 'utf8')
    expect(geminiMd).toContain('GEMINI.md')

    const codexPrompt = await fs.readFile(path.join(root, 'prompts/satlas-build.md'), 'utf8')
    expect(codexPrompt).toContain('Generado por SpecAtlas')
    const agents = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('~/.codex/prompts')

    for (const file of report.files) {
      if (!file.path.endsWith('.toml')) {
        expect(file.content.includes('{{SLUG}}'), `${file.path} sin placeholders crudos`).toBe(false)
      }
    }
  })

  it('deduplica archivos compartidos entre targets', async () => {
    const workflowDir = path.resolve(__dirname, '..', '..', '..', 'workflow')
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-targets2-'))
    const report = await compileTargets({ root, workflowDir, targets: ['generic', 'codex'] })
    const paths = report.files.map((f) => f.path)
    expect(paths.filter((p) => p === 'AGENTS.md')).toHaveLength(1)
    expect(paths.filter((p) => p === 'prompts/satlas-specify.md')).toHaveLength(1)
  })
})

describe('frontmatter YAML de los artefactos', () => {
  it('las descripciones con dos puntos se serializan como YAML válido', async () => {
    const workflowDir = path.resolve(__dirname, '..', '..', '..', 'workflow')
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-fm-'))
    const report = await compileTargets({ root, workflowDir, targets: ['opencode', 'claude-code', 'cursor', 'copilot'] })
    const sources = await loadWorkflow(workflowDir)

    const withFrontmatter = report.files.filter((f) => f.content.startsWith('---\n'))
    expect(withFrontmatter.length).toBeGreaterThan(0)
    for (const file of withFrontmatter) {
      const fm = parseFrontmatter(file.content, file.path)
      expect(fm.diagnostics.filter((d) => d.severity === 'error'), `${file.path} con frontmatter válido`).toHaveLength(0)
      expect(typeof fm.data['description'], `${file.path} con description`).toBe('string')
      expect((fm.data['description'] as string).length, `${file.path} description no vacía`).toBeGreaterThan(10)
    }

    const adopt = sources.phases.find((p) => p.id === 'adopt')
    expect(adopt).toBeDefined()
    const skill = await fs.readFile(path.join(root, '.opencode/skills/satlas-adopt/SKILL.md'), 'utf8')
    const fm = parseFrontmatter(skill, 'SKILL.md')
    expect(fm.data['name']).toBe('satlas-adopt')
    expect(fm.data['description']).toBe(adopt!.description)
    expect(fm.data['description']).toContain(': ')

    const command = await fs.readFile(path.join(root, '.opencode/command/satlas-adopt.md'), 'utf8')
    expect(parseFrontmatter(command, 'satlas-adopt.md').data['description']).toBe(adopt!.description)
  })
})

describe('workflow real del repositorio', () => {
  it('compila las fases oficiales a opencode y generic', async () => {
    const workflowDir = path.resolve(__dirname, '..', '..', '..', 'workflow')
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-real-'))
    const report = await compileTargets({ root, workflowDir, targets: ['opencode', 'generic'] })
    expect(report.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
    expect(report.files.length).toBeGreaterThanOrEqual(14)
    for (const phase of ['specify', 'plan', 'build', 'verify', 'review', 'archive', 'fix']) {
      expect(await exists(path.join(root, `.opencode/command/satlas-${phase}.md`))).toBe(true)
      expect(await exists(path.join(root, `prompts/satlas-${phase}.md`))).toBe(true)
    }
    const verifySkill = await fs.readFile(path.join(root, '.opencode/skills/satlas-verify/SKILL.md'), 'utf8')
    expect(verifySkill).toContain('Formato de evidencia')
    expect(verifySkill).not.toContain('{{')
  })
})

describe('perfiles y fixtures multi-stack', () => {
  it('detecta el perfil correcto para cada fixture', async () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..')
    const profiles = await loadProfilesFromDir(path.join(repoRoot, 'profiles'))
    const cases: Array<[string, string]> = [
      ['node-ts-app', 'node-ts'],
      ['python-app', 'python'],
      ['dotnet-sqlserver-app', 'dotnet-sqlserver'],
    ]
    for (const [fixture, expected] of cases) {
      const detection = await detectProfiles(path.join(repoRoot, 'fixtures', fixture), profiles)
      expect(detection.best?.name, `${fixture} debería detectar ${expected}`).toBe(expected)
    }
  })

  it('la configuración por defecto usa español y targets opencode+generic', () => {
    const cfg = defaultConfig()
    expect(cfg.project.language).toBe('es')
    expect(cfg.adapters.targets).toEqual(['opencode', 'generic'])
    const { diagnostics } = parseConfig('adapters:\n  targets: [unknown-agent]\n')
    expect(diagnostics.some((d) => d.code === 'ATLAS-CONFIG-002')).toBe(true)
    const valid = parseConfig('adapters:\n  targets: [cursor, copilot, gemini, codex]\n')
    expect(valid.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
    expect(valid.config.adapters.targets).toEqual(['cursor', 'copilot', 'gemini', 'codex'])
  })

  it('hash de artefacto canónico es estable entre plataformas', () => {
    expect(artifactHash('# Título\n\nTexto\n')).toBe(artifactHash('# Título\r\n\r\nTexto\r\n'))
  })
})
