import path from 'node:path'
import { localStamp } from './time.js'
import type { Diagnostic } from './diagnostics.js'
import { diag } from './diagnostics.js'
import { readTextIfExists, writeText } from './fsx.js'
import { hasShellMetacharacters, isCommandAllowed, runProcess } from './exec.js'
import { sha256 } from './hash.js'
import type { Evidence, EvidenceMethod, EvidenceResult } from './model.js'
import { SCENARIO_ID_RE } from './model.js'

export interface RecordEvidenceOptions {
  root: string
  slug: string
  scenario: string
  command?: string
  method?: EvidenceMethod
  result?: EvidenceResult
  by: string
  notes?: string
  allowCommand?: boolean
  allowedPrefixes?: string[]
  timeoutMs?: number
  now?: Date
  dryRun?: boolean
  file?: 'verify' | 'fix'
}

export interface RecordEvidenceResult {
  evidence?: Evidence
  exitCode: number
  stdout?: string
  stderr?: string
  path: string
  diagnostics: Diagnostic[]
}

const FENCE_RE = /```evidence[ \t]*\r?\n([\s\S]*?)```/g
const SCENARIO_HEAD_RE = /^###\s+(REQ-[A-Z0-9-]+-S\d+)\b/

interface BlockLocation {
  scenario?: string
  start: number
  end: number
  yamlStart: number
  yamlEnd: number
}

function locateBlocks(content: string): BlockLocation[] {
  const normalized = content.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const blocks: BlockLocation[] = []
  let heading: string | undefined
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const head = SCENARIO_HEAD_RE.exec(line)
    if (head) heading = (head[1] ?? '').toUpperCase()
    if (/^```evidence[ \t]*$/.test(line)) {
      const start = i
      let j = i + 1
      while (j < lines.length && !/^```\s*$/.test(lines[j] ?? '')) j += 1
      const yamlLines = lines.slice(i + 1, j)
      const yamlText = yamlLines.join('\n')
      const scenarioInYaml = /scenario:\s*([A-Z0-9-]+)/i.exec(yamlText)?.[1]?.toUpperCase()
      blocks.push({ scenario: scenarioInYaml ?? heading, start, end: j, yamlStart: i + 1, yamlEnd: j })
      i = j
    }
    i += 1
  }
  void normalized
  return blocks
}

function buildEvidenceYaml(evidence: Evidence): string {
  const lines = [`method: ${evidence.method}`]
  if (evidence.command) lines.push(`command: ${evidence.command}`)
  lines.push(`result: ${evidence.result}`)
  if (evidence.outputHash) lines.push(`output_hash: ${evidence.outputHash}`)
  lines.push(`date: ${evidence.date}`)
  lines.push(`by: ${evidence.by}`)
  if (evidence.notes) lines.push(`notes: ${evidence.notes}`)
  return lines.join('\n')
}

export async function recordEvidence(opts: RecordEvidenceOptions): Promise<RecordEvidenceResult> {
  const root = path.resolve(opts.root)
  const slug = opts.slug
  const fileKind = opts.file ?? 'verify'
  const file = path.join(root, '.sdd', 'changes', slug, fileKind === 'fix' ? 'fix.md' : 'verify.md')
  const diagnostics: Diagnostic[] = []
  const scenario = opts.scenario.toUpperCase()

  if (!SCENARIO_ID_RE.test(scenario)) {
    return { exitCode: 2, path: file, diagnostics: [diag('LINT-EVD-002', 'error', `Escenario mal formado: ${opts.scenario}`, { suggestion: 'Formato: REQ-DOMINIO-NNN-S1' })] }
  }
  if (!opts.by.trim()) {
    return { exitCode: 2, path: file, diagnostics: [diag('ATLAS-VERIFY-001', 'error', 'Falta --by <nombre>: la evidencia es nominal')] }
  }

  let method: EvidenceMethod = opts.method ?? (opts.command ? 'executable' : 'manual')
  let result: EvidenceResult = opts.result ?? 'pass'
  let command = opts.command
  let outputHash: string | undefined
  let stdout: string | undefined
  let stderr: string | undefined
  let exitCode = 0

  if (method === 'executable' || method === 'automatic') {
    if (!command) {
      return { exitCode: 2, path: file, diagnostics: [diag('LINT-EVD-001', 'error', `El método ${method} exige --command`)] }
    }
    if (hasShellMetacharacters(command)) {
      return { exitCode: 2, path: file, diagnostics: [diag('ATLAS-EXEC-001', 'error', 'El comando contiene metacaracteres de shell y no se ejecutará', { suggestion: 'Ejecuta un único comando sin tuberías ni redirecciones' })] }
    }
    const allowed = opts.allowedPrefixes ?? []
    if (allowed.length > 0 && !opts.allowCommand && !isCommandAllowed(command, allowed)) {
      return {
        exitCode: 2,
        path: file,
        diagnostics: [
          diag('ATLAS-EXEC-002', 'error', `El comando no está declarado en el perfil: "${command}"`, {
            suggestion: `Comandos permitidos: ${allowed.join(' | ')}. Usa --allow-command si es intencional.`,
          }),
        ],
      }
    }
    const exec = await runProcess(command, { cwd: root, timeoutMs: opts.timeoutMs })
    exitCode = exec.exitCode
    stdout = exec.stdout
    stderr = exec.stderr
    result = opts.result ?? (exec.ok ? 'pass' : 'fail')
    outputHash = sha256(`${exec.stdout}\n${exec.stderr}`)
  } else if (opts.result === undefined) {
    return { exitCode: 2, path: file, diagnostics: [diag('ATLAS-VERIFY-002', 'error', `El método ${method} exige --result pass|fail|skipped`)] }
  }

  const evidence: Evidence = {
    scenario,
    method,
    result,
    date: localStamp(opts.now),
    by: opts.by.trim(),
    line: 0,
  }
  if (command) evidence.command = command
  if (outputHash) evidence.outputHash = outputHash
  if (opts.notes) evidence.notes = opts.notes

  if (!opts.dryRun) {
    const existing = (await readTextIfExists(file)) ?? `# Verificación — ${slug}\n`
    const blocks = locateBlocks(existing)
    const yaml = buildEvidenceYaml(evidence)
    const target = blocks.find((b) => b.scenario === scenario)
    let next: string
    if (target) {
      const normalized = existing.replace(/\r\n?/g, '\n')
      const lines = normalized.split('\n')
      next = [...lines.slice(0, target.yamlStart), ...yaml.split('\n'), ...lines.slice(target.yamlEnd)].join('\n')
    } else {
      const base = existing.replace(/\r\n?/g, '\n').trimEnd()
      next = `${base}\n\n### ${scenario}\n\n\`\`\`evidence\n${yaml}\n\`\`\`\n`
    }
    await writeText(file, next.replace(/\n{3,}/g, '\n\n'))
  }

  const returned: RecordEvidenceResult = { evidence, exitCode: result === 'pass' ? 0 : 1, path: file, diagnostics }
  if (stdout !== undefined) returned.stdout = stdout
  if (stderr !== undefined) returned.stderr = stderr
  return returned
}

export function evidenceSummary(content: string): Map<string, EvidenceResult> {
  const out = new Map<string, EvidenceResult>()
  for (const block of locateBlocks(content)) {
    if (!block.scenario) continue
    const yamlText = content.replace(/\r\n?/g, '\n').split('\n').slice(block.yamlStart, block.yamlEnd).join('\n')
    const result = /result:\s*(\w+)/i.exec(yamlText)?.[1] as EvidenceResult | undefined
    if (result) out.set(block.scenario, result)
  }
  return out
}
