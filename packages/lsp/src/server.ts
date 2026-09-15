import {
  CodeActionKind,
  createConnection,
  MarkupKind,
  ProposedFeatures,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
  type CodeAction,
  type CodeLens,
  type Diagnostic as LspDiagnostic,
  type DocumentSymbol,
  type Hover,
  type InitializeResult,
  type Location,
  type Range,
  type SymbolInformation,
  type TextEdit,
} from 'vscode-languageserver/node'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { findWorkspaceRoot, type Diagnostic } from '@specatlas/core'
import {
  buildIndex,
  codeLenses,
  documentSymbols,
  findOccurrences,
  hoverFor,
  locationOf,
  quickFixes,
  tokenAtPosition,
  type AtlasIndex,
} from './index.js'

const connection = createConnection(ProposedFeatures.all)
const documents = new TextDocuments(TextDocument)

let root: string | undefined
let index: AtlasIndex | undefined
let dirty = true
let rebuilding: Promise<AtlasIndex | undefined> | undefined

async function resolveRoot(): Promise<string | undefined> {
  if (root) return root
  const folders = await connection.workspace.getWorkspaceFolders()
  const first = folders?.[0]?.uri
  if (first) {
    const fsPath = uriToPath(first)
    root = (await findWorkspaceRoot(fsPath)) ?? fsPath
    return root
  }
  return undefined
}

function uriToPath(uri: string): string {
  let value = uri.replace(/^file:\/\//, '')
  value = decodeURIComponent(value)
  if (/^\/[A-Za-z]:/.test(value)) value = value.slice(1)
  return value.split('/').join(process.platform === 'win32' ? '\\' : '/')
}

function pathToUri(file: string): string {
  const normalized = file.split('\\').join('/')
  const prefix = normalized.startsWith('/') ? 'file://' : 'file:///'
  return prefix + encodeURI(normalized).replace(/#/g, '%23')
}

async function ensureIndex(): Promise<AtlasIndex | undefined> {
  const workspaceRoot = await resolveRoot()
  if (!workspaceRoot) return undefined
  if (!index || dirty) {
    if (!rebuilding) {
      rebuilding = buildIndex(workspaceRoot)
        .then((built) => {
          index = built
          dirty = false
          return built
        })
        .catch(() => undefined)
        .finally(() => {
          rebuilding = undefined
        })
    }
    return rebuilding
  }
  return index
}

let debounce: NodeJS.Timeout | undefined
function scheduleRebuild(): void {
  dirty = true
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    void revalidateAll()
  }, 400)
}

async function diagnosticsForFile(uri: string): Promise<LspDiagnostic[]> {
  const current = await ensureIndex()
  if (!current) return []
  const file = uriToPath(uri)
  return current.diagnostics.filter((d) => d.path === file).map(toLspDiagnostic)
}

async function revalidateAll(): Promise<void> {
  dirty = true
  await ensureIndex()
  for (const document of documents.all()) {
    const diagnostics = await diagnosticsForFile(document.uri)
    void connection.sendDiagnostics({ uri: document.uri, diagnostics })
  }
}

function toLspDiagnostic(diagnostic: Diagnostic): LspDiagnostic {
  const line = Math.max(0, (diagnostic.line ?? 1) - 1)
  const message = diagnostic.suggestion ? `${diagnostic.message} â€” ${diagnostic.suggestion}` : diagnostic.message
  return {
    range: { start: { line, character: 0 }, end: { line, character: 200 } },
    severity: diagnostic.severity === 'error' ? 1 : diagnostic.severity === 'warning' ? 2 : 3,
    code: diagnostic.code,
    source: 'SpecAtlas',
    message,
  }
}

function symbolKindFor(kind: string): SymbolKind {
  switch (kind) {
    case 'requirement':
      return SymbolKind.Interface
    case 'scenario':
      return SymbolKind.Event
    case 'task':
      return SymbolKind.Boolean
    case 'block':
      return SymbolKind.Module
    default:
      return SymbolKind.Key
  }
}

function lineRange(line: number, text: string): Range {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const length = (lines[line] ?? '').length
  return { start: { line, character: 0 }, end: { line, character: length } }
}

connection.onInitialize((): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeLensProvider: { resolveProvider: false },
      codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
    },
    serverInfo: { name: 'SpecAtlas LSP', version: '0.0.1' },
  }
})

connection.onInitialized(() => {
  void revalidateAll()
})

connection.onHover(async (params): Promise<Hover | undefined> => {
  const current = await ensureIndex()
  if (!current) return undefined
  const document = documents.get(params.textDocument.uri)
  if (!document) return undefined
  const line = document.getText(lineRange(params.position.line, document.getText()))
  const token = tokenAtPosition(line, params.position.character)
  if (!token) return undefined
  const details = hoverFor(current, token.token)
  if (!details) return undefined
  return { contents: { kind: MarkupKind.Markdown, value: details.markdown } }
})

connection.onDefinition(async (params): Promise<Location | undefined> => {
  const current = await ensureIndex()
  if (!current) return undefined
  const document = documents.get(params.textDocument.uri)
  if (!document) return undefined
  const line = document.getText(lineRange(params.position.line, document.getText()))
  const token = tokenAtPosition(line, params.position.character)
  if (!token) return undefined
  const target = locationOf(current, token.token)
  if (!target) return undefined
  return { uri: pathToUri(target.file), range: { start: { line: target.line, character: 0 }, end: { line: target.line, character: 200 } } }
})

connection.onReferences(async (params): Promise<Location[]> => {
  const current = await ensureIndex()
  if (!current) return []
  const document = documents.get(params.textDocument.uri)
  if (!document) return []
  const line = document.getText(lineRange(params.position.line, document.getText()))
  const token = tokenAtPosition(line, params.position.character)
  if (!token) return []
  return findOccurrences(current, token.token).map((occurrence) => ({
    uri: pathToUri(occurrence.file),
    range: { start: { line: occurrence.line, character: occurrence.character }, end: { line: occurrence.line, character: occurrence.character + occurrence.length } },
  }))
})

connection.onDocumentSymbol(async (params): Promise<DocumentSymbol[]> => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return []
  const flat = documentSymbols(document.getText(), uriToPath(params.textDocument.uri))
  const out: DocumentSymbol[] = []
  const flatten = (symbols: ReturnType<typeof documentSymbols>, parent?: string): void => {
    for (const symbol of symbols) {
      const line = Math.max(0, symbol.line - 1)
      out.push({
        name: symbol.name,
        detail: symbol.detail ?? '',
        kind: symbolKindFor(symbol.kind),
        range: lineRange(line, document.getText()),
        selectionRange: lineRange(line, document.getText()),
      })
      void parent
      if (symbol.children.length > 0) flatten(symbol.children, symbol.name)
    }
  }
  flatten(flat)
  return out
})

connection.onWorkspaceSymbol(async (params): Promise<SymbolInformation[]> => {
  const current = await ensureIndex()
  if (!current) return []
  const query = (params.query ?? '').toLowerCase()
  const out: SymbolInformation[] = []
  for (const requirement of current.requirements.values()) {
    if (query && !requirement.id.toLowerCase().includes(query) && !requirement.title.toLowerCase().includes(query)) continue
    out.push({
      name: `${requirement.id} â€” ${requirement.title}`,
      kind: SymbolKind.Interface,
      location: { uri: pathToUri(requirement.file), range: lineRange(requirement.line - 1, current.files.get(requirement.file) ?? '') },
    })
  }
  for (const task of current.tasks.values()) {
    if (query && !task.id.toLowerCase().includes(query) && !task.text.toLowerCase().includes(query)) continue
    out.push({
      name: `${task.id} â€” ${task.text}`,
      kind: SymbolKind.Boolean,
      location: { uri: pathToUri(task.file), range: lineRange(task.line - 1, current.files.get(task.file) ?? '') },
    })
  }
  return out.slice(0, 200)
})

connection.onCodeLens(async (params): Promise<CodeLens[]> => {
  const current = await ensureIndex()
  if (!current) return []
  const document = documents.get(params.textDocument.uri)
  if (!document) return []
  const text = document.getText()
  return codeLenses(current, uriToPath(params.textDocument.uri), text).map((lens) => ({
    range: lineRange(lens.line, text),
    data: lens,
  }))
})

connection.onCodeAction(async (params): Promise<CodeAction[]> => {
  const current = await ensureIndex()
  if (!current) return []
  const document = documents.get(params.textDocument.uri)
  if (!document) return []
  const filePath = uriToPath(params.textDocument.uri)
  const line = params.range.start.line
  const diagnostics = await diagnosticsForFile(params.textDocument.uri)
  return quickFixes(current, filePath, line, document.getText(), current.diagnostics.filter((d) => d.path === filePath)).map((action) => {
    const codeAction: CodeAction = { title: action.title, kind: CodeActionKind.QuickFix }
    if (action.edit) {
      const edit: TextEdit = {
        range: {
          start: { line: action.edit.line, character: action.edit.startCharacter },
          end: { line: action.edit.endLine, character: action.edit.endCharacter },
        },
        newText: action.edit.newText,
      }
      codeAction.edit = { changes: { [params.textDocument.uri]: [edit] } }
    }
    const diagnostic = diagnostics.find((d) => d.range.start.line === (action.diagnosticLine ?? -1) - 1)
    if (diagnostic) codeAction.diagnostics = [diagnostic]
    return codeAction
  })
})

documents.onDidChangeContent((change) => {
  scheduleRebuild()
  void diagnosticsForFile(change.document.uri).then((diagnostics) => {
    void connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
  })
})

documents.onDidClose((event) => {
  void connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] })
})

connection.onDidChangeWatchedFiles(() => {
  scheduleRebuild()
})

connection.onShutdown(() => {
  index = undefined
})

documents.listen(connection)
connection.listen()
