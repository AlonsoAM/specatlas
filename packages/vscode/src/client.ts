import * as vscode from 'vscode'
import path from 'node:path'
import { LanguageClient, TransportKind, type LanguageClientOptions, type ServerOptions } from 'vscode-languageclient/node'

export function startLanguageClient(context: vscode.ExtensionContext, output: vscode.OutputChannel): LanguageClient {
  const serverModule = context.asAbsolutePath(path.join('dist', 'server.cjs'))
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6010'] } },
  }
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', pattern: '**/.sdd/**/*.{md,yaml,yml}' }],
    synchronize: { fileEvents: vscode.workspace.createFileSystemWatcher('**/.sdd/**') },
    outputChannel: output,
  }
  const client = new LanguageClient('specatlas', 'SpecAtlas LSP', serverOptions, clientOptions)
  void client.start()
  return client
}
