export type Severity = 'error' | 'warning' | 'info'

export interface Diagnostic {
  code: string
  severity: Severity
  message: string
  path?: string
  line?: number
  suggestion?: string
}

export function diag(
  code: string,
  severity: Severity,
  message: string,
  opts: { path?: string; line?: number; suggestion?: string } = {},
): Diagnostic {
  const d: Diagnostic = { code, severity, message }
  if (opts.path !== undefined) d.path = opts.path
  if (opts.line !== undefined) d.line = opts.line
  if (opts.suggestion !== undefined) d.suggestion = opts.suggestion
  return d
}

export function countBySeverity(diags: readonly Diagnostic[]): { errors: number; warnings: number; infos: number } {
  let errors = 0
  let warnings = 0
  let infos = 0
  for (const d of diags) {
    if (d.severity === 'error') errors += 1
    else if (d.severity === 'warning') warnings += 1
    else infos += 1
  }
  return { errors, warnings, infos }
}

export function hasErrors(diags: readonly Diagnostic[]): boolean {
  return diags.some((d) => d.severity === 'error')
}
