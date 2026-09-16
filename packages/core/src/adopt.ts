import path from 'node:path'
import { localDate, localStamp } from './time.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { exists, readTextIfExists, toPosix, walkFiles, writeText } from './fsx.js'
import { loadConfig } from './config.js'
import { detectProfiles, loadProfilesFromDir, type StackProfile } from './profiles.js'

const COMMON_ROOTS = ['src', 'app', 'lib', 'modules', 'services', 'packages', 'api', 'features', 'domain', 'internal', 'components']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', '.git', '.sdd', '.opencode', '.claude', 'test', 'tests', '__tests__', 'e2e', 'docs', 'scripts', 'assets', 'public', 'migrations', 'vendor', 'bin', 'obj'])
const SOURCE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.cs', '.java', '.kt', '.kts', '.go', '.rb', '.php', '.rs',
  '.swift', '.dart', '.vue', '.svelte', '.sql', '.cshtml', '.razor', '.vb', '.fs', '.c', '.cpp', '.h', '.hpp',
  '.scala', '.ex', '.exs', '.clj', '.lua', '.r', '.m', '.mm', '.pl', '.groovy',
])

export interface AdoptOptions {
  root: string
  domains?: string[]
  dryRun?: boolean
  profilesDirs?: string[]
  now?: Date
}

export interface AdoptDomain {
  name: string
  files: number
  samples: string[]
  existingSpec: boolean
}

export interface AdoptResult {
  root: string
  domains: AdoptDomain[]
  createdSpecs: string[]
  reportPath?: string
  stack?: { name: string; score: number }
  diagnostics: Diagnostic[]
  dryRun: boolean
}

export async function adoptWorkspace(opts: AdoptOptions): Promise<AdoptResult> {
  const root = path.resolve(opts.root)
  const dryRun = opts.dryRun ?? false
  const diagnostics: Diagnostic[] = []
  const sddDir = path.join(root, '.sdd')

  if (!(await exists(path.join(sddDir, 'config.yaml')))) {
    return {
      root,
      domains: [],
      createdSpecs: [],
      diagnostics: [diag('ATLAS-ADOPT-001', 'error', 'No hay .sdd/config.yaml: inicializa el proyecto con `satlas init` antes de adoptar', { path: sddDir })],
      dryRun,
    }
  }

  const { config } = await loadConfig(sddDir)
  const files = await walkFiles(root, { skipDirs: [...SKIP_DIRS] })
  const inventoried = files.map((f) => toPosix(path.relative(root, f.path)))
  const relative = inventoried.filter((f) => SOURCE_EXT.has(path.extname(f).toLowerCase()))
  if (relative.length === 0) {
    diagnostics.push(diag('ATLAS-ADOPT-002', 'warning', 'No se encontraron archivos de código para inventariar', { path: root, suggestion: 'Añade el dominio a mano con --domains <nombre>' }))
  }

  const counts = new Map<string, string[]>()
  for (const file of relative) {
    const domain = inferDomain(file)
    if (!domain) continue
    const list = counts.get(domain) ?? []
    list.push(file)
    counts.set(domain, list)
  }

  if (counts.size === 0 && relative.length > 0) {
    const fallback = await fallbackDomainName(root, config.project.name)
    counts.set(fallback, relative)
  }

  const requested = opts.domains?.map((d) => d.toLowerCase())
  let domainNames = [...counts.keys()].filter((name) => (requested ? requested.includes(name) : true))
  if (requested) {
    for (const name of requested) if (!counts.has(name)) domainNames.push(name)
  }
  if (domainNames.length === 0) domainNames = ['general']

  const profiles = await loadProjectProfiles(root, opts.profilesDirs ?? [])
  const detection = profiles.length > 0 ? await detectProfiles(root, profiles) : undefined

  const domains: AdoptDomain[] = []
  const createdSpecs: string[] = []

  for (const name of domainNames.sort()) {
    const domainFiles = (counts.get(name) ?? []).sort()
    const existingSpec = await exists(path.join(sddDir, 'specs', name, 'spec.md'))
    domains.push({ name, files: domainFiles.length, samples: domainFiles.slice(0, 8), existingSpec })
    if (existingSpec) {
      diagnostics.push(diag('ATLAS-ADOPT-003', 'info', `La spec de "${name}" ya existe; se conserva`, { path: path.join(sddDir, 'specs', name, 'spec.md') }))
      continue
    }
    const specPath = path.join(sddDir, 'specs', name, 'spec.md')
    if (!dryRun) {
      await writeText(specPath, baselineSpec(name, domainFiles))
      createdSpecs.push(specPath)
    } else {
      createdSpecs.push(specPath)
    }
  }

  const reportPath = path.join(sddDir, 'adopt-report.md')
  if (!dryRun) {
    await writeText(reportPath, adoptReport({ root, config, domains, detection: detection?.best, language: config.project.language, files: relative.length, inventoried: inventoried.length, now: opts.now ?? new Date() }))
  }

  return {
    root,
    domains,
    createdSpecs,
    reportPath,
    ...(detection?.best ? { stack: { name: detection.best.name, score: detection.best.score } } : {}),
    diagnostics,
    dryRun,
  }
}

async function loadProjectProfiles(root: string, dirs: string[]): Promise<StackProfile[]> {
  const out: StackProfile[] = []
  for (const dir of dirs) {
    if (!(await exists(dir))) continue
    out.push(...(await loadProfilesFromDir(dir)))
  }
  const custom = path.join(root, '.sdd', 'profiles', 'custom')
  if (await exists(custom)) out.push(...(await loadProfilesFromDir(custom)))
  return out
}

async function fallbackDomainName(root: string, projectName: string): Promise<string> {
  const pkg = await readTextIfExists(path.join(root, 'package.json'))
  if (pkg) {
    try {
      const data = JSON.parse(pkg) as { name?: unknown }
      if (typeof data.name === 'string' && data.name.trim() !== '') {
        return slugify(data.name.replace(/^@[^/]+\//, ''))
      }
    } catch {
      // package.json inválido: se usa el nombre del proyecto
    }
  }
  return slugify(projectName) || 'general'
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function inferDomain(file: string): string | undefined {
  const parts = file.split('/')
  if (parts.length < 2) return undefined
  const [first, second] = parts
  if (first && COMMON_ROOTS.includes(first) && second && parts.length > 2) {
    if (isSourceLike(second)) return undefined
    return second.toLowerCase()
  }
  if (parts.length === 2 && first && isSourceLike(first)) return first.replace(/\.[^.]+$/, '').toLowerCase()
  if (parts.length >= 3 && first === 'packages' && second) return second.toLowerCase()
  return undefined
}

function isSourceLike(name: string): boolean {
  return /\.(ts|tsx|js|jsx|py|cs|java|go|rb|php|rs|kt|swift|mjs|cjs)$/i.test(name)
}

function baselineSpec(domain: string, files: string[]): string {
  const title = domain.charAt(0).toUpperCase() + domain.slice(1)
  const anchors = files.slice(0, 40)
  const lines: string[] = []
  lines.push('---')
  lines.push(`domain: ${domain}`)
  lines.push(`title: ${title}`)
  lines.push('version: 1')
  lines.push(`updated: ${localDate()}`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${title}`)
  lines.push('')
  lines.push('> Spec baseline generada por `satlas adopt` a partir del código existente.')
  lines.push('> Los requisitos deben derivarse con el agente y el usuario (fase /satlas-adopt) y plegarse con `satlas archive`.')
  lines.push('')
  lines.push('## Anclas de implementación')
  lines.push('')
  for (const file of anchors) lines.push(`- ${file}`)
  if (files.length > anchors.length) lines.push(`- … (${files.length - anchors.length} archivos más)`)
  lines.push('')
  return lines.join('\n')
}

function adoptReport(input: {
  root: string
  config: { project: { name: string; language: string } }
  domains: AdoptDomain[]
  detection?: { name: string; score: number }
  language: 'es' | 'en'
  files: number
  inventoried: number
  now: Date
}): string {
  const es = input.language !== 'en'
  const lines: string[] = []
  lines.push(es ? '# Adopción (brownfield)' : '# Adoption (brownfield)')
  lines.push('')
  lines.push(es ? `- Proyecto: ${input.config.project.name}` : `- Project: ${input.config.project.name}`)
  lines.push(es ? `- Generado: ${localStamp(input.now)}` : `- Generated: ${localStamp(input.now)}`)
  lines.push(es ? `- Archivos de código inventariados: ${input.files} (de ${input.inventoried} archivos totales)` : `- Inventoried source files: ${input.files} (of ${input.inventoried} total files)`)
  if (input.detection) lines.push(es ? `- Stack detectado: ${input.detection.name} (${input.detection.score} puntos)` : `- Detected stack: ${input.detection.name} (${input.detection.score})`)
  lines.push('')
  lines.push(es ? '## Dominios candidatos' : '## Candidate domains')
  lines.push('')
  lines.push(es ? '| Dominio | Archivos | Spec | Ejemplos |' : '| Domain | Files | Spec | Samples |')
  lines.push('|---|---|---|---|')
  for (const domain of input.domains) {
    lines.push(`| ${domain.name} | ${domain.files} | ${domain.existingSpec ? (es ? 'existente' : 'existing') : (es ? 'creada' : 'created')} | ${domain.samples.slice(0, 3).join('<br>') || '—'} |`)
  }
  lines.push('')
  lines.push(es ? '## Siguiente paso' : '## Next step')
  lines.push('')
  if (es) {
    lines.push('1. Ejecuta la fase `/satlas-adopt` por dominio: el agente lee las anclas y el código, entrevista al usuario y redacta los requisitos AS-IS.')
    lines.push('2. Crea el cambio con `satlas new adopt-<dominio> --domain <dominio>` y escribe el delta con los requisitos y escenarios del comportamiento actual.')
    lines.push('3. `satlas validate --change adopt-<dominio>` hasta quedar sin errores y pliega con `satlas archive adopt-<dominio> --yes`.')
    lines.push('4. Repite por dominio. La adopción documenta lo que existe: no requiere tareas ni verificación.')
  } else {
    lines.push('1. Run the `/satlas-adopt` phase per domain: the agent reads anchors and code, interviews the user and drafts AS-IS requirements.')
    lines.push('2. Create the change with `satlas new adopt-<domain> --domain <domain>` and write the delta with current behaviour.')
    lines.push('3. `satlas validate --change adopt-<domain>` until clean and fold with `satlas archive adopt-<domain> --yes`.')
  }
  lines.push('')
  return lines.join('\n')
}
