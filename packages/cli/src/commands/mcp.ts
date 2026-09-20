import type { CliContext, CommandResult } from '../cli.js'
import { runMcpServer } from '../mcp/server.js'

export async function runMcp(ctx: CliContext): Promise<CommandResult> {
  await runMcpServer({
    cwd: ctx.cwd,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  })
  return { exitCode: 0, diagnostics: [], data: { served: true } }
}
