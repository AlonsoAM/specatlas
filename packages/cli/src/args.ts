export type FlagValue = string | boolean
export type Flags = Record<string, FlagValue>

export interface ParsedArgs {
  command?: string
  positionals: string[]
  flags: Flags
}

const BOOLEAN_FLAGS = new Set(['json', 'local', 'strict', 'yes', 'dry-run', 'require-evidence', 'require', 'help', 'version'])

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags: Flags = {}
  let command: string | undefined

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? ''
    if (token.startsWith('--')) {
      const eq = token.indexOf('=')
      if (eq >= 0) {
        const key = token.slice(2, eq)
        flags[key] = token.slice(eq + 1)
        continue
      }
      const key = token.slice(2)
      const next = argv[i + 1]
      if (!BOOLEAN_FLAGS.has(key) && next !== undefined && !next.startsWith('--')) {
        flags[key] = next
        i += 1
      } else {
        flags[key] = true
      }
      continue
    }
    if (token.startsWith('-') && token.length > 1) {
      const key = token.slice(1)
      if (key === 'h') {
        flags['help'] = true
        continue
      }
      if (key === 'v') {
        flags['version'] = true
        continue
      }
      flags[key] = true
      continue
    }
    if (command === undefined) {
      command = token
    } else {
      positionals.push(token)
    }
  }

  return command === undefined ? { positionals, flags } : { command, positionals, flags }
}

export function flagString(flags: Flags, key: string): string | undefined {
  const v = flags[key]
  return typeof v === 'string' ? v : undefined
}

export function flagBool(flags: Flags, key: string): boolean {
  return flags[key] === true || flags[key] === 'true'
}
