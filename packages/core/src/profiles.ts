import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { listDir, readText, readTextIfExists, toPosix, walkFiles } from './fsx.js'

export const profileSchema = z.object({
  name: z.string().min(1),
  display_name: z.string().default(''),
  detection: z
    .object({
      files: z.array(z.string()).default([]),
      manifests: z.array(z.object({ file: z.string(), contains: z.array(z.string()).default([]) })).default([]),
      priority: z.number().default(0),
    })
    .default({}),
  domains: z.array(z.string()).default([]),
  commands: z.object({ build: z.string().optional(), lint: z.string().optional(), test: z.string().optional(), format: z.string().optional() }).default({}),
  verify: z.object({ executable: z.array(z.string()).default([]), automatic: z.array(z.string()).default([]), manual: z.array(z.string()).default([]) }).default({}),
  rollback: z.string().default(''),
  antipatterns: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
})

export type StackProfile = z.infer<typeof profileSchema>

export interface ProfileMatch {
  name: string
  displayName: string
  score: number
  domains: string[]
  path: string
}

export interface DetectionResult {
  matches: ProfileMatch[]
  best?: ProfileMatch
}

function globToRegExp(pattern: string): RegExp {
  let re = ''
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i] ?? ''
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        re += '.*'
        i += 1
      } else {
        re += '[^/]*'
      }
    } else if (ch === '?') {
      re += '[^/]'
    } else if ('\\^$.|+()[]{}'.includes(ch)) {
      re += `\\${ch}`
    } else {
      re += ch
    }
  }
  return new RegExp(`^${re}$`, 'i')
}

export function matchGlob(pattern: string, filePath: string): boolean {
  const posix = toPosix(filePath)
  return globToRegExp(pattern).test(posix) || globToRegExp(`**/${pattern}`).test(posix)
}

export async function loadProfileFile(filePath: string): Promise<StackProfile | undefined> {
  const raw = await readTextIfExists(filePath)
  if (raw === undefined) return undefined
  let data: unknown
  try {
    data = parseYaml(raw)
  } catch {
    return undefined
  }
  const parsed = profileSchema.safeParse(data)
  return parsed.success ? parsed.data : undefined
}

export async function loadProfilesFromDir(dir: string): Promise<StackProfile[]> {
  const entries = await listDir(dir)
  const out: StackProfile[] = []
  for (const entry of entries) {
    if (!/\.ya?ml$/i.test(entry)) continue
    const profile = await loadProfileFile(path.join(dir, entry))
    if (profile) out.push(profile)
  }
  return out
}

export async function detectProfiles(root: string, profiles: StackProfile[]): Promise<DetectionResult> {
  const files = await walkFiles(root)
  const matches: ProfileMatch[] = []

  for (const profile of profiles) {
    let score = 0
    for (const pattern of profile.detection.files) {
      if (files.some((f) => matchGlob(pattern, f.path))) score += 2
    }
    for (const manifest of profile.detection.manifests) {
      const found = files.find((f) => matchGlob(manifest.file, f.path) || toPosix(f.path) === toPosix(manifest.file) || f.name === manifest.file)
      if (!found) continue
      const content = (await readTextIfExists(found.path)) ?? ''
      const containsAll = manifest.contains.every((c) => content.toLowerCase().includes(c.toLowerCase()))
      if (containsAll) score += 3
    }
    if (score > 0) {
      const priority = profile.detection.priority ?? 0
      matches.push({
        name: profile.name,
        displayName: profile.display_name || profile.name,
        score: score + Math.min(priority, 0) / 100,
        domains: profile.domains,
        path: profile.name,
      })
    }
  }

  matches.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  const result: DetectionResult = { matches }
  const best = matches[0]
  if (best) result.best = best
  return result
}

export async function loadDetectedBest(sddDir: string): Promise<string | undefined> {
  const raw = await readTextIfExists(path.join(sddDir, 'profiles', 'detected.yaml'))
  if (raw === undefined) return undefined
  try {
    const data = parseYaml(raw) as { best?: unknown }
    return typeof data?.best === 'string' ? data.best : undefined
  } catch {
    return undefined
  }
}

/**
 * Devuelve el perfil activo del proyecto (el "best" de detected.yaml) buscándolo
 * en los directorios de perfiles dados; fallback al perfil genérico si existe.
 */
export async function loadActiveProfile(sddDir: string, dirs: string[]): Promise<StackProfile | undefined> {
  const best = await loadDetectedBest(sddDir)
  const profiles: StackProfile[] = []
  for (const dir of dirs) profiles.push(...(await loadProfilesFromDir(dir)))
  if (best) {
    const found = profiles.find((p) => p.name === best)
    if (found) return found
  }
  return profiles.find((p) => p.name === 'generic')
}

export function detectionToYaml(result: DetectionResult, generatedAt: string): string {
  const lines: string[] = ['# Generado por `satlas init`. Editarlo a mano es válido: no se sobrescribe.', `schema_version: 1`, `generated_at: ${generatedAt}`]
  if (result.best) {
    lines.push(`best: ${result.best.name}`)
  } else {
    lines.push('best: generic')
  }
  lines.push('candidates:')
  if (result.matches.length === 0) {
    lines.push('  - name: generic')
    lines.push('    score: 0')
  } else {
    for (const m of result.matches) {
      lines.push(`  - name: ${m.name}`)
      lines.push(`    score: ${m.score}`)
    }
  }
  return lines.join('\n') + '\n'
}
