import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createChange, initWorkspace } from '../src/index'
import {
  approveFromGithub,
  changeMarker,
  detectRepo,
  findLinkedIssue,
  issueBody,
  parseGitHubRemote,
  parseIssueUrl,
  syncGithubIssue,
  type GhRunner,
} from '../src/github'
import { loadChange } from '../src/workspace'
import { parseApprovals } from '../src/parse/meta'
import type { ExecResult } from '../src/exec'

const DELTA = `# Delta — Reset

## Requisitos agregados

### Requisito: REQ-AUTH-001 — Reset
Prosa.

#### Escenario: REQ-AUTH-001-S1 — Caso
- **CUANDO** a
- **ENTONCES** b
`

interface Call {
  command: string
  input?: string
}

function makeRunner(responses: Array<{ match: RegExp; result: Partial<ExecResult> }>): { runner: GhRunner; calls: Call[] } {
  const calls: Call[] = []
  const runner: GhRunner = async (command, opts) => {
    calls.push(opts?.input !== undefined ? { command, input: opts.input } : { command })
    const found = responses.find((response) => response.match.test(command))
    const base: ExecResult = { ok: true, exitCode: 0, stdout: '', stderr: '', durationMs: 1, command, resolvedBinary: '' }
    return found ? { ...base, ...found.result } : base
  }
  return { runner, calls }
}

async function makeWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'atlas-gh-'))
  await initWorkspace({ root, name: 'gh-demo', language: 'es' })
  await createChange({ root, slug: 'reset-password', lane: 'standard', domain: 'auth', title: 'Reset' })
  await fs.writeFile(path.join(root, '.sdd', 'changes', 'reset-password', 'spec.md'), DELTA, 'utf8')
  return root
}

describe('helpers de GitHub', () => {
  it('parsea remotos y URLs de issues', () => {
    expect(parseGitHubRemote('git@github.com:acme/app.git')).toEqual({ owner: 'acme', name: 'app' })
    expect(parseGitHubRemote('https://github.com/acme/app.git')).toEqual({ owner: 'acme', name: 'app' })
    expect(parseGitHubRemote('acme/app')).toEqual({ owner: 'acme', name: 'app' })
    expect(parseGitHubRemote('gitlab.com/acme/app')).toBeUndefined()
    expect(parseIssueUrl('https://github.com/acme/app/issues/42')?.number).toBe(42)
  })

  it('detectRepo usa el remoto origin', async () => {
    const { runner } = makeRunner([{ match: /git remote get-url origin/, result: { stdout: 'git@github.com:acme/app.git\n' } }])
    expect(await detectRepo(process.cwd(), runner)).toEqual({ owner: 'acme', name: 'app' })
  })

  it('issueBody incluye marcador, siguiente acción y artefactos', async () => {
    const root = await makeWorkspace()
    const change = await loadChange(root, 'reset-password')
    const body = issueBody({ change, next: 'satlas archive reset-password', nextDescription: 'Archivar', scenarios: 1 })
    expect(body).toContain(changeMarker('reset-password'))
    expect(body).toContain('satlas archive reset-password')
    expect(body).toContain('.sdd/changes/reset-password/spec.md')
  })
})

describe('syncGithubIssue', () => {
  it('crea el issue, lo vincula en meta.yaml y es idempotente', async () => {
    const root = await makeWorkspace()
    const responses = [
      { match: /gh --version/, result: { stdout: 'gh version 2.60.0' } },
      { match: /gh auth status/, result: { stdout: 'Logged in' } },
      { match: /git remote get-url origin/, result: { stdout: 'https://github.com/acme/app.git\n' } },
      { match: /gh issue list/, result: { stdout: '[]' } },
      { match: /gh issue create/, result: { stdout: 'https://github.com/acme/app/issues/7\n' } },
    ]
    const { runner, calls } = makeRunner(responses)
    const result = await syncGithubIssue(root, 'reset-password', { labels: ['specatlas'], runner })
    expect(result.created).toBe(true)
    expect(result.issue?.number).toBe(7)
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

    const createCall = calls.find((c) => c.command.startsWith('gh issue create'))
    expect(createCall?.command).toContain('--label "specatlas"')
    expect(createCall?.input).toContain(changeMarker('reset-password'))

    const meta = await fs.readFile(path.join(root, '.sdd', 'changes', 'reset-password', 'meta.yaml'), 'utf8')
    expect(meta).toContain('provider: github')
    expect(meta).toMatch(/id:\s*['"]?7['"]?/)
    expect(meta).toContain('url: https://github.com/acme/app/issues/7')

    const { runner: runner2, calls: calls2 } = makeRunner([
      ...responses.filter((r) => !/gh issue list/.test(r.match.source)),
      { match: /gh issue create/, result: { stdout: 'https://github.com/acme/app/issues/7\n' } },
      { match: /gh issue edit/, result: { stdout: '' } },
    ])
    const again = await syncGithubIssue(root, 'reset-password', { runner: runner2 })
    expect(again.created).toBe(false)
    expect(again.issue?.number).toBe(7)
    expect(calls2.some((c) => c.command.startsWith('gh issue edit 7'))).toBe(true)
  })

  it('falla claro sin gh o sin remoto', async () => {
    const root = await makeWorkspace()
    const noGh = makeRunner([{ match: /gh --version/, result: { ok: false, exitCode: 127, stderr: 'ENOENT' } }])
    const withoutGh = await syncGithubIssue(root, 'reset-password', { runner: noGh.runner })
    expect(withoutGh.diagnostics[0]!.code).toBe('ATLAS-GH-001')

    const noRemote = makeRunner([
      { match: /gh --version/, result: { stdout: 'ok' } },
      { match: /gh auth status/, result: { stdout: 'ok' } },
      { match: /git remote get-url origin/, result: { ok: false, exitCode: 128, stderr: 'no remote' } },
      { match: /gh repo view/, result: { ok: false, exitCode: 1, stderr: 'no repo' } },
    ])
    const withoutRemote = await syncGithubIssue(root, 'reset-password', { runner: noRemote.runner })
    expect(withoutRemote.diagnostics[0]!.code).toBe('ATLAS-GH-008')
  })

  it('encuentra el issue por marcador cuando meta no lo tiene', async () => {
    const root = await makeWorkspace()
    const { runner } = makeRunner([
      { match: /gh --version/, result: { stdout: 'ok' } },
      { match: /gh auth status/, result: { stdout: 'ok' } },
      { match: /git remote get-url origin/, result: { stdout: 'https://github.com/acme/app.git' } },
      { match: /gh issue list/, result: { stdout: JSON.stringify([{ number: 3, url: 'https://github.com/acme/app/issues/3', title: 'x', state: 'OPEN' }]) } },
      { match: /gh issue edit/, result: { stdout: '' } },
    ])
    const found = await findLinkedIssue(root, 'reset-password', runner)
    expect(found?.number).toBe(3)
    const result = await syncGithubIssue(root, 'reset-password', { runner })
    expect(result.created).toBe(false)
    expect(result.issue?.number).toBe(3)
  })
})

describe('approve --from-github', () => {
  it('firma con la etiqueta presente', async () => {
    const root = await makeWorkspace()
    const { runner } = makeRunner([
      { match: /gh issue view 7 --json labels/, result: { stdout: JSON.stringify({ labels: [{ name: 'spec-approved' }] }) } },
      { match: /gh api user/, result: { stdout: 'maria\n' } },
    ])
    const first = await syncGithubIssue(root, 'reset-password', {
      runner: makeRunner([
        { match: /gh --version/, result: { stdout: 'ok' } },
        { match: /gh auth status/, result: { stdout: 'ok' } },
        { match: /git remote get-url origin/, result: { stdout: 'https://github.com/acme/app.git' } },
        { match: /gh issue list/, result: { stdout: '[]' } },
        { match: /gh issue create/, result: { stdout: 'https://github.com/acme/app/issues/7' } },
      ]).runner,
    })
    expect(first.issue?.number).toBe(7)

    const result = await approveFromGithub({ root, slug: 'reset-password', runner })
    expect(result.approved).toBe(true)
    expect(result.approvedBy).toBe('maria')
    const approvals = await fs.readFile(path.join(root, '.sdd', 'approvals.yaml'), 'utf8')
    const parsed = parseApprovals(approvals, 'approvals.yaml')
    expect(parsed.approvals?.approvals[0]?.channel).toBe('tracker')
    expect(parsed.approvals?.approvals[0]?.note).toContain('#7')
  })

  it('sin la etiqueta no firma y explica qué falta', async () => {
    const root = await makeWorkspace()
    await syncGithubIssue(root, 'reset-password', {
      runner: makeRunner([
        { match: /gh --version/, result: { stdout: 'ok' } },
        { match: /gh auth status/, result: { stdout: 'ok' } },
        { match: /git remote get-url origin/, result: { stdout: 'https://github.com/acme/app.git' } },
        { match: /gh issue list/, result: { stdout: '[]' } },
        { match: /gh issue create/, result: { stdout: 'https://github.com/acme/app/issues/9' } },
      ]).runner,
    })
    const { runner } = makeRunner([{ match: /gh issue view 9/, result: { stdout: JSON.stringify({ labels: [{ name: 'bug' }] }) } }])
    const result = await approveFromGithub({ root, slug: 'reset-password', runner, by: 'Ana' })
    expect(result.approved).toBe(false)
    expect(result.diagnostics[0]!.code).toBe('ATLAS-GH-010')
  })
})
