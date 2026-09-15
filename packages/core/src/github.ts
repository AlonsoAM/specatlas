import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { readTextIfExists, writeText } from './fsx.js'
import { runProcess, type ExecOptions, type ExecResult } from './exec.js'
import { loadChange } from './workspace.js'
import type { Change } from './model.js'

export type GhRunner = (command: string, opts?: ExecOptions) => Promise<ExecResult>

export interface GitHubRepo {
  owner: string
  name: string
}

export function parseGitHubRemote(url: string): GitHubRepo | undefined {
  const trimmed = url.trim()
  const ssh = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/.exec(trimmed)
  if (ssh) return { owner: ssh[1] ?? '', name: ssh[2] ?? '' }
  const https = /^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/.exec(trimmed)
  if (https) return { owner: https[1] ?? '', name: https[2] ?? '' }
  const shorthand = /^([\w.-]+)\/([\w.-]+)$/.exec(trimmed)
  if (shorthand) return { owner: shorthand[1] ?? '', name: shorthand[2] ?? '' }
  return undefined
}

export function changeMarker(slug: string): string {
  return `<!-- specatlas:change=${slug} -->`
}

const defaultRunner: GhRunner = (command, opts) => runProcess(command, opts)

export async function ghAvailable(runner: GhRunner = defaultRunner): Promise<boolean> {
  const result = await runner('gh --version')
  return result.ok
}

export async function ghAuthStatus(runner: GhRunner = defaultRunner): Promise<boolean> {
  const result = await runner('gh auth status')
  return result.ok
}

export async function detectRepo(root: string, runner: GhRunner = defaultRunner): Promise<GitHubRepo | undefined> {
  const remote = await runner('git remote get-url origin', { cwd: root })
  if (remote.ok) {
    const parsed = parseGitHubRemote(remote.stdout.trim())
    if (parsed) return parsed
  }
  const view = await runner('gh repo view --json nameWithOwner -q .nameWithOwner', { cwd: root })
  if (view.ok) {
    const parsed = parseGitHubRemote(view.stdout.trim())
    if (parsed) return parsed
  }
  return undefined
}

export interface IssueBodyInput {
  change: Change
  next: string
  nextDescription: string
  scenarios: number
}

export function issueBody(input: IssueBodyInput): string {
  const { change } = input
  const lines: string[] = []
  lines.push(`## ${change.meta?.title ?? change.slug}`)
  lines.push('')
  lines.push(`- Cambio: \`${change.slug}\` · dominio \`${change.meta?.domain ?? '—'}\` · carril \`${change.meta?.lane ?? 'standard'}\``)
  lines.push(`- Estado: ${change.meta?.paused ? 'pausado' : 'en curso'}`)
  lines.push(`- Escenarios: ${input.scenarios}`)
  lines.push(`- Siguiente: \`${input.next}\` — ${input.nextDescription}`)
  lines.push('')
  lines.push('### Artefactos')
  lines.push(`- Spec: \`${path.posix.join('.sdd', 'changes', change.slug, 'spec.md')}\``)
  if (change.planPath) lines.push(`- Plan: \`${path.posix.join('.sdd', 'changes', change.slug, 'plan.md')}\``)
  if (change.tasks) lines.push(`- Tareas: ${change.tasks.counts.done}/${change.tasks.counts.total}`)
  if (change.verify) lines.push(`- Evidencia registrada: ${change.verify.evidence.length}`)
  lines.push('')
  lines.push('---')
  lines.push(changeMarker(change.slug))
  return lines.join('\n')
}

export interface LinkedIssue {
  number: number
  url: string
  title: string
  state: string
}

interface GhIssueJson {
  number?: number
  url?: string
  title?: string
  state?: string
  labels?: Array<{ name?: string }>
}

function parseIssue(stdout: string): LinkedIssue | undefined {
  let data: GhIssueJson
  try {
    data = JSON.parse(stdout) as GhIssueJson
  } catch {
    return undefined
  }
  if (typeof data.number !== 'number') return undefined
  return { number: data.number, url: data.url ?? '', title: data.title ?? '', state: data.state ?? 'OPEN' }
}

export async function findLinkedIssue(root: string, slug: string, runner: GhRunner = defaultRunner): Promise<LinkedIssue | undefined> {
  const result = await runner(`gh issue list --state all --limit 10 --search "specatlas:change=${slug} in:body" --json number,url,title,state`, { cwd: root })
  if (!result.ok) return undefined
  try {
    const list = JSON.parse(result.stdout) as GhIssueJson[]
    const first = list[0]
    if (!first || typeof first.number !== 'number') return undefined
    return { number: first.number, url: first.url ?? '', title: first.title ?? '', state: first.state ?? 'OPEN' }
  } catch {
    return undefined
  }
}

export function parseIssueUrl(url: string): LinkedIssue | undefined {
  const match = /https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/.exec(url)
  if (!match) return undefined
  return { number: Number.parseInt(match[1] ?? '0', 10), url: url.trim(), title: '', state: 'OPEN' }
}

export async function createIssue(root: string, opts: { title: string; body: string; labels?: string[] }, runner: GhRunner = defaultRunner): Promise<{ issue?: LinkedIssue; diagnostics: Diagnostic[] }> {
  const labels = (opts.labels ?? []).map((label) => ` --label "${label}"`).join('')
  const result = await runner(`gh issue create --title "${opts.title.replace(/"/g, '\\"')}" --body-file -${labels}`, { cwd: root, input: opts.body })
  if (!result.ok) {
    return {
      diagnostics: [
        diag('ATLAS-GH-002', 'error', `No se pudo crear el issue: ${(result.stderr || result.stdout).trim().slice(0, 300)}`, {
          suggestion: 'Verifica `gh auth status` y los permisos del repositorio',
        }),
      ],
    }
  }
  const url = result.stdout.split('\n').map((line) => line.trim()).find((line) => /github\.com\/.+\/issues\/\d+/.test(line))
  const issue = url ? parseIssueUrl(url) : undefined
  return issue ? { issue, diagnostics: [] } : { diagnostics: [diag('ATLAS-GH-003', 'error', 'GitHub no devolvió la URL del issue creado', { path: undefined })] }
}

export async function editIssue(root: string, number: number, opts: { title?: string; body?: string }, runner: GhRunner = defaultRunner): Promise<Diagnostic[]> {
  const parts = [`gh issue edit ${number}`]
  if (opts.title) parts.push(`--title "${opts.title.replace(/"/g, '\\"')}"`)
  if (opts.body !== undefined) parts.push('--body-file -')
  const result = await runner(parts.join(' '), { cwd: root, ...(opts.body !== undefined ? { input: opts.body } : {}) })
  if (!result.ok) {
    return [diag('ATLAS-GH-004', 'error', `No se pudo actualizar el issue #${number}: ${(result.stderr || result.stdout).trim().slice(0, 300)}`)]
  }
  return []
}

export async function issueLabels(root: string, number: number, runner: GhRunner = defaultRunner): Promise<{ labels: string[]; diagnostics: Diagnostic[] }> {
  const result = await runner(`gh issue view ${number} --json labels`, { cwd: root })
  if (!result.ok) {
    return { labels: [], diagnostics: [diag('ATLAS-GH-005', 'error', `No se pudo leer el issue #${number}: ${(result.stderr || result.stdout).trim().slice(0, 300)}`)] }
  }
  try {
    const data = JSON.parse(result.stdout) as { labels?: Array<{ name?: string }> }
    return { labels: (data.labels ?? []).map((label) => label.name ?? '').filter((name) => name !== ''), diagnostics: [] }
  } catch {
    return { labels: [], diagnostics: [diag('ATLAS-GH-005', 'error', `Respuesta inesperada de gh para el issue #${number}`)] }
  }
}

export async function commentIssue(root: string, number: number, body: string, runner: GhRunner = defaultRunner): Promise<Diagnostic[]> {
  const result = await runner(`gh issue comment ${number} --body-file -`, { cwd: root, input: body })
  return result.ok ? [] : [diag('ATLAS-GH-006', 'error', `No se pudo comentar el issue #${number}: ${(result.stderr || result.stdout).trim().slice(0, 300)}`)]
}

export async function patchChangeMeta(root: string, slug: string, patch: Record<string, unknown>): Promise<{ path: string; diagnostics: Diagnostic[] }> {
  const file = path.join(path.resolve(root), '.sdd', 'changes', slug, 'meta.yaml')
  const raw = await readTextIfExists(file)
  if (raw === undefined) {
    return { path: file, diagnostics: [diag('ATLAS-GH-007', 'error', `No existe ${path.relative(root, file)}`)] }
  }
  let data: Record<string, unknown>
  try {
    data = (parseYaml(raw) ?? {}) as Record<string, unknown>
  } catch (err) {
    return { path: file, diagnostics: [diag('ATLAS-GH-007', 'error', `meta.yaml inválido: ${(err as Error).message}`)] }
  }
  const { stringify } = await import('yaml')
  await writeText(file, stringify({ ...data, ...patch }, { lineWidth: 120 }))
  return { path: file, diagnostics: [] }
}

export interface ApproveFromGithubOptions {
  root: string
  slug: string
  label?: string
  by?: string
  runner?: GhRunner
}

export interface ApproveFromGithubResult {
  approved: boolean
  label: string
  issueNumber?: number
  approvedBy?: string
  diagnostics: Diagnostic[]
}

export async function approveFromGithub(opts: ApproveFromGithubOptions): Promise<ApproveFromGithubResult> {
  const runner = opts.runner ?? defaultRunner
  const label = opts.label ?? 'spec-approved'
  const change = await loadChange(opts.root, opts.slug)
  const tracker = change.meta?.tracker
  if (!tracker || tracker.provider !== 'github' || !tracker.id) {
    return {
      approved: false,
      label,
      diagnostics: [
        diag('ATLAS-GH-009', 'error', `El cambio "${opts.slug}" no tiene un issue de GitHub vinculado`, {
          suggestion: `Ejecuta \`satlas issue sync ${opts.slug}\` primero`,
        }),
      ],
    }
  }
  const number = Number.parseInt(tracker.id, 10)
  const { labels, diagnostics } = await issueLabels(opts.root, number, runner)
  if (diagnostics.length > 0) return { approved: false, label, issueNumber: number, diagnostics }
  if (!labels.includes(label)) {
    return {
      approved: false,
      label,
      issueNumber: number,
      diagnostics: [
        diag('ATLAS-GH-010', 'warning', `El issue #${number} no tiene la etiqueta "${label}"`, {
          suggestion: `Pide a quien aprueba que aplique la etiqueta "${label}" en el issue y vuelve a intentarlo`,
        }),
      ],
    }
  }

  let by = opts.by?.trim()
  if (!by) {
    const me = await runner('gh api user -q .login', { cwd: opts.root })
    by = me.ok ? me.stdout.trim() : ''
  }
  if (!by) {
    return { approved: false, label, issueNumber: number, diagnostics: [diag('ATLAS-GH-011', 'error', 'No se pudo determinar quién aprueba (--by ni `gh api user`)')] }
  }

  const { signApproval } = await import('./approvals.js')
  const signed = await signApproval({
    root: opts.root,
    artifact: path.posix.join('changes', opts.slug, 'spec.md'),
    by,
    channel: 'tracker',
    note: `Aprobado vía GitHub issue #${number} (etiqueta "${label}")`,
  })
  return {
    approved: signed.approval !== undefined,
    label,
    issueNumber: number,
    approvedBy: by,
    diagnostics: signed.diagnostics,
  }
}

export interface SyncGithubOptions {
  labels?: string[]
  next?: { command: string; description: string }
  runner?: GhRunner
}

export interface SyncGithubResult {
  slug: string
  created: boolean
  issue?: LinkedIssue
  diagnostics: Diagnostic[]
}

export async function syncGithubIssue(root: string, slug: string, opts: SyncGithubOptions = {}): Promise<SyncGithubResult> {
  const runner = opts.runner ?? defaultRunner
  const diagnostics: Diagnostic[] = []

  if (!(await ghAvailable(runner))) {
    return {
      slug,
      created: false,
      diagnostics: [
        diag('ATLAS-GH-001', 'error', 'GitHub CLI (`gh`) no está disponible', {
          suggestion: 'Instala gh (https://cli.github.com) y ejecuta `gh auth login`',
        }),
      ],
    }
  }
  if (!(await ghAuthStatus(runner))) {
    return { slug, created: false, diagnostics: [diag('ATLAS-GH-001', 'error', 'gh no está autenticado', { suggestion: 'Ejecuta `gh auth login`' })] }
  }
  const repo = await detectRepo(root, runner)
  if (!repo) {
    return {
      slug,
      created: false,
      diagnostics: [diag('ATLAS-GH-008', 'error', 'No se detectó un repositorio de GitHub (remoto origin o `gh repo view`)')],
    }
  }

  const change = await loadChange(root, slug)
  const deltaScenarios = [...(change.delta?.added ?? []), ...(change.delta?.modified ?? [])].flatMap((r) => r.scenarios)
  const next = opts.next ?? { command: `satlas next ${slug}`, description: 'Consulta la siguiente acción' }
  const body = issueBody({ change, next: next.command, nextDescription: next.description, scenarios: deltaScenarios.length })
  const title = `${change.meta?.title ?? slug} (${slug})`

  const linked = change.meta?.tracker?.provider === 'github' && change.meta.tracker.id
    ? { number: Number.parseInt(change.meta.tracker.id, 10), url: change.meta.tracker.url ?? '', title, state: 'OPEN' }
    : await findLinkedIssue(root, slug, runner)

  if (linked && Number.isFinite(linked.number)) {
    diagnostics.push(...(await editIssue(root, linked.number, { title, body }, runner)))
    if (change.meta?.tracker?.url !== linked.url && linked.url) {
      diagnostics.push(...(await patchChangeMeta(root, slug, { tracker: { provider: 'github', id: String(linked.number), url: linked.url } })).diagnostics)
    }
    return { slug, created: false, issue: linked, diagnostics }
  }

  const created = await createIssue(root, { title, body, ...(opts.labels ? { labels: opts.labels } : {}) }, runner)
  diagnostics.push(...created.diagnostics)
  if (created.issue) {
    diagnostics.push(...(await patchChangeMeta(root, slug, { tracker: { provider: 'github', id: String(created.issue.number), url: created.issue.url } })).diagnostics)
  }
  return { slug, created: true, ...(created.issue ? { issue: created.issue } : {}), diagnostics }
}
