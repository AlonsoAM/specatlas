import * as vscode from 'vscode'
import path from 'node:path'
import {
  archiveChange,
  checkTrace,
  collectMetrics,
  generatePresentation,
  initWorkspace,
  loadConfig,
  planWaves,
  readMockupManifest,
  readTextIfExists,
  runAnalyze,
  runDoctor,
  signApproval,
  type Diagnostic as CoreDiagnostic,
} from '@specatlas/core'
import { compileTargets, type AgentTarget } from '@specatlas/adapters'
import {
  buildMatrix,
  buildSnapshot,
  previewHtml,
  toolItems,
  type Snapshot,
  type SnapshotChange,
  type SnapshotFile,
  type SnapshotSpec,
  type SnapshotSpecItem,
  type SnapshotTaskItem,
  type SnapshotMockupItem,
  type ToolItem,
} from './logic.js'
import { boardHtml, matrixHtml, metricsHtml } from './panels.js'
import { startLanguageClient } from './client.js'
import type { LanguageClient } from 'vscode-languageclient/node'

const VIEW_ID = 'specatlas.explorer'

function pathForScreen(change: SnapshotChange, screen: SnapshotMockupItem): string {
  return path.join(change.dir, 'mockups', screen.file)
}

async function rewriteLocalHtml(panel: vscode.WebviewPanel, target: string): Promise<string> {
  const content = (await readTextIfExists(target)) ?? ''
  const baseDir = path.dirname(target)
  const fs = await import('node:fs')
  return content.replace(/(src|href)\s*=\s*"([^"]+)"/g, (match, attr: string, value: string) => {
    if (!value || /^(https?:|data:|#|mailto:|command:|vscode-)/i.test(value)) return match
    const clean = value.split('?')[0] ?? value
    const abs = path.resolve(baseDir, clean)
    if (!fs.existsSync(abs)) return match
    const uri = panel.webview.asWebviewUri(vscode.Uri.file(abs)).toString()
    return `${attr}="${uri}"`
  })
}

let languageClient: LanguageClient | undefined

type Node =
  | { kind: 'group'; label: string; description?: string; icon?: string; tone?: string; tooltip?: string; children: Node[] }
  | { kind: 'spec'; spec: SnapshotSpec }
  | { kind: 'specItem'; spec: SnapshotSpec; item: SnapshotSpecItem }
  | { kind: 'change'; change: SnapshotChange }
  | { kind: 'action'; change: SnapshotChange }
  | { kind: 'file'; change: SnapshotChange; file: SnapshotFile }
  | { kind: 'task'; change: SnapshotChange; file: SnapshotFile; task: SnapshotTaskItem }
  | { kind: 'mockup'; change: SnapshotChange; screen: SnapshotMockupItem }

interface AtlasExtensionState {
  snapshots: Snapshot[]
  selected?: SnapshotChange
}

class AtlasTreeProvider implements vscode.TreeDataProvider<Node> {
  private state: AtlasExtensionState = { snapshots: [] }
  private readonly emitter = new vscode.EventEmitter<Node | undefined>()
  readonly onDidChangeTreeData = this.emitter.event

  update(snapshots: Snapshot[]): void {
    this.state.snapshots = snapshots
    this.emitter.fire(undefined)
  }

  setSelected(change: SnapshotChange | undefined): void {
    this.state.selected = change
  }

  getSelected(): SnapshotChange | undefined {
    return this.state.selected
  }

  snapshotOf(index: number): Snapshot | undefined {
    return this.state.snapshots[index]
  }

  getTreeItem(node: Node): vscode.TreeItem {
    switch (node.kind) {
      case 'group': {
        const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded)
        if (node.description) item.description = node.description
        if (node.tooltip) item.tooltip = new vscode.MarkdownString(node.tooltip)
        item.iconPath = new vscode.ThemeIcon(node.icon ?? 'library', node.tone ? new vscode.ThemeColor(node.tone) : undefined)
        item.contextValue = 'group'
        return item
      }
      case 'spec': {
        const spec = node.spec
        const collapsible = spec.items.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        const item = new vscode.TreeItem(spec.domain, collapsible)
        item.description = `${spec.requirements} req · ${spec.scenarios} esc`
        item.tooltip = new vscode.MarkdownString(
          [`**${spec.title ?? spec.domain}**`, '', `Requisitos: ${spec.requirements} · Escenarios: ${spec.scenarios}`, '', `\`${vscode.workspace.asRelativePath(spec.path)}\``, '', 'Expande para ver los requisitos (clic abre en la línea).'].join('\n'),
        )
        item.iconPath = new vscode.ThemeIcon('book', new vscode.ThemeColor('charts.purple'))
        item.contextValue = 'spec'
        item.command = { command: 'specatlas.openPreview', title: 'Abrir spec', arguments: [spec.path] }
        return item
      }
      case 'specItem': {
        const item = new vscode.TreeItem(node.item.id, vscode.TreeItemCollapsibleState.None)
        item.description = `${node.item.title}`
        item.tooltip = new vscode.MarkdownString([`**${node.item.id}** — ${node.item.title}`, '', `${node.item.scenarios} escenario(s) · \`${vscode.workspace.asRelativePath(node.spec.path)}:${node.item.line}\``].join('\n'))
        item.iconPath = new vscode.ThemeIcon('symbol-interface', new vscode.ThemeColor('charts.blue'))
        item.contextValue = 'specItem'
        item.command = { command: 'specatlas.openAt', title: 'Abrir en el requisito', arguments: [node.spec.path, node.item.line] }
        return item
      }
      case 'change': {
        const c = node.change
        const item = new vscode.TreeItem(c.slug, vscode.TreeItemCollapsibleState.Expanded)
        const percent = c.progress.tasksTotal > 0 ? (c.progress.tasksDone / c.progress.tasksTotal) * 100 : c.state === 'ready' ? 100 : 0
        const progress = c.progress.tasksTotal > 0 ? `${progressGlyphs(percent)} ${c.progress.tasksDone}/${c.progress.tasksTotal}` : progressGlyphs(percent)
        item.description = `${c.stateLabel} · ${progress}`
        item.tooltip = new vscode.MarkdownString(
          [
            `**${c.title ?? c.slug}**`,
            '',
            `Estado: ${c.stateLabel} · carril \`${c.lane}\`${c.domain ? ` · dominio \`${c.domain}\`` : ''}`,
            `Tareas: ${c.progress.tasksDone}/${c.progress.tasksTotal} · evidencia: ${c.progress.scenariosDone}/${c.progress.scenariosTotal}`,
            c.blocking > 0 ? `Hallazgos bloqueantes: ${c.blocking}` : '',
            c.blockedBy.length > 0 ? `Bloqueado: ${c.blockedBy.join('; ')}` : '',
            '',
            `Siguiente: \`${c.next}\` — ${c.nextDescription}`,
            '',
            'Clic derecho para aprobar, analizar, presentar, ver mockups o archivar.',
          ]
            .filter((line) => line !== '')
            .join('\n'),
        )
        item.iconPath = stateIcon(c.state)
        item.contextValue = 'change'
        return item
      }
      case 'action': {
        const c = node.change
        const item = new vscode.TreeItem(c.next, vscode.TreeItemCollapsibleState.None)
        item.description = c.requiresAgent ? `${c.nextDescription} · con agente` : c.nextDescription
        item.iconPath = c.requiresAgent
          ? new vscode.ThemeIcon('sparkle', new vscode.ThemeColor('charts.blue'))
          : new vscode.ThemeIcon('play', new vscode.ThemeColor('charts.green'))
        item.tooltip = c.requiresAgent ? 'Acción con agente: se copia al portapapeles para el chat' : 'Ejecutar acción'
        item.contextValue = 'action'
        item.command = { command: 'specatlas.runNext', title: 'Ejecutar siguiente acción', arguments: [c.slug] }
        return item
      }
      case 'file': {
        const tasks = node.file.tasks ?? []
        const screens = node.file.screens ?? []
        const collapsible = tasks.length > 0 || screens.length > 0
        const item = new vscode.TreeItem(node.file.label, collapsible ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
        const parts: string[] = []
        if (!node.file.exists) {
          parts.push('no existe')
        } else {
          if (tasks.length > 0) parts.push(`${tasks.filter((t) => t.done).length}/${tasks.length} tareas`)
          if (screens.length > 0) parts.push(`${screens.length} pantalla(s)${node.change.mockups.stale ? ' · desactualizado' : ''}`)
          if (parts.length === 0) parts.push(node.file.description ?? KIND_LABELS[node.file.kind])
        }
        item.description = parts.join(' · ')
        item.iconPath = node.file.exists ? fileIcon(node.file.kind) : new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('disabledForeground'))
        item.contextValue = 'file'
        item.tooltip = `${node.change.slug} · ${vscode.workspace.asRelativePath(node.file.path)}`
        if (node.file.exists) {
          if (node.file.kind === 'presentation') {
            item.command = { command: 'vscode.open', title: 'Abrir', arguments: [vscode.Uri.file(node.file.path)] }
          } else if (node.file.kind === 'mockup' && node.file.screens && node.file.screens.length > 0) {
            item.command = { command: 'vscode.open', title: 'Abrir', arguments: [vscode.Uri.file(pathForScreen(node.change, node.file.screens[0]!))] }
          } else {
            item.command = { command: 'specatlas.openPreview', title: 'Abrir', arguments: [node.file.path, node.change.slug, node.file.kind] }
          }
        }
        return item
      }
      case 'task': {
        const item = new vscode.TreeItem(node.task.title, vscode.TreeItemCollapsibleState.None)
        item.description = `${node.task.id} · ${node.task.block}`
        item.iconPath = node.task.done
          ? new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'))
          : new vscode.ThemeIcon('circle-large-outline', new vscode.ThemeColor('charts.foreground'))
        item.contextValue = 'task'
        item.tooltip = new vscode.MarkdownString(
          [
            `**${node.task.id}** — ${node.task.title}`,
            '',
            `Bloque: ${node.task.block} · cubre ${node.task.covers} escenario(s) · ${node.task.done ? 'hecha' : 'pendiente'}`,
            '',
            `\`${vscode.workspace.asRelativePath(node.file.path)}:${node.task.line}\``,
          ].join('\n'),
        )
        item.command = { command: 'specatlas.openAt', title: 'Abrir tarea', arguments: [node.file.path, node.task.line] }
        return item
      }
      case 'mockup': {
        const item = new vscode.TreeItem(node.screen.title, vscode.TreeItemCollapsibleState.None)
        item.description = node.screen.file
        item.iconPath = new vscode.ThemeIcon('device-mobile', new vscode.ThemeColor('charts.purple'))
        item.contextValue = 'mockup'
        item.tooltip = `${node.change.slug} · pantalla ${node.screen.id}`
        item.command = { command: 'vscode.open', title: 'Ver mockup', arguments: [vscode.Uri.file(pathForScreen(node.change, node.screen))] }
        return item
      }
    }
  }

  getChildren(node?: Node): Node[] {
    if (!node) return this.rootNodes()
    if (node.kind === 'group') return node.children
    if (node.kind === 'spec') {
      return node.spec.items.map((item) => ({ kind: 'specItem' as const, spec: node.spec, item }))
    }
    if (node.kind === 'change') {
      const children: Node[] = [{ kind: 'action', change: node.change }]
      for (const file of node.change.files) {
        if (file.exists || file.kind === 'spec' || file.kind === 'fix') children.push({ kind: 'file', change: node.change, file })
      }
      return children
    }
    if (node.kind === 'file') {
      const children: Node[] = []
      for (const task of node.file.tasks ?? []) children.push({ kind: 'task', change: node.change, file: node.file, task })
      for (const screen of node.file.screens ?? []) children.push({ kind: 'mockup', change: node.change, screen })
      return children
    }
    return []
  }

  private rootNodes(): Node[] {
    if (this.state.snapshots.length === 0) return []
    return this.state.snapshots.map((snapshot) => {
      const specs: Node[] = snapshot.specs.map((spec) => ({ kind: 'spec', spec }))
      const changes: Node[] = snapshot.changes.map((change) => ({ kind: 'change', change }))
      const ready = snapshot.changes.filter((change) => change.state === 'ready').length
      const blocked = snapshot.changes.filter((change) => change.blockedBy.length > 0).length
      return {
        kind: 'group',
        label: snapshot.projectName,
        description: `${snapshot.summary.specs} specs · ${snapshot.summary.changes} cambios${ready > 0 ? ` · ${ready} listos` : ''}${blocked > 0 ? ` · ${blocked} bloqueados` : ''}`,
        icon: 'root-folder',
        tone: 'charts.blue',
        children: [
          {
            kind: 'group',
            label: 'Specs vivas',
            description: snapshot.summary.specs > 0 ? `${snapshot.summary.specs}` : '0 · se llenan al archivar un cambio',
            icon: 'book',
            tone: 'charts.purple',
            tooltip: '**Specs vivas** — la fuente de verdad del comportamiento actual.\n\nSe llenan al archivar: `satlas archive <slug>` pliega el delta del cambio en `.sdd/specs/<dominio>/spec.md`.',
            children: specs,
          },
          { kind: 'group', label: 'Cambios', description: `${snapshot.summary.changes}`, icon: 'git-pull-request', tone: 'charts.green', children: changes },
        ],
      }
    })
  }
}

function progressGlyphs(percent: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(percent / 20)))
  return `${'▓'.repeat(filled)}${'░'.repeat(5 - filled)}`
}

function stateIcon(state: string): vscode.ThemeIcon {
  switch (state) {
    case 'ready':
      return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('charts.green'))
    case 'spec_draft':
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.orange'))
    case 'awaiting_approval':
      return new vscode.ThemeIcon('watch', new vscode.ThemeColor('charts.purple'))
    case 'building':
      return new vscode.ThemeIcon('tools', new vscode.ThemeColor('charts.blue'))
    case 'built':
      return new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.yellow'))
    case 'verified':
      return new vscode.ThemeIcon('verified-filled', new vscode.ThemeColor('charts.green'))
    case 'archived':
      return new vscode.ThemeIcon('archive', new vscode.ThemeColor('charts.foreground'))
    default:
      return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.foreground'))
  }
}

const KIND_LABELS: Record<SnapshotFile['kind'], string> = {
  proposal: 'propuesta',
  spec: 'delta',
  plan: 'plan técnico',
  tasks: 'tareas',
  verify: 'verificación',
  fix: 'fix',
  analyze: 'análisis',
  presentation: 'propuesta HTML',
  mockup: 'mockups',
}

function fileIcon(kind: SnapshotFile['kind']): vscode.ThemeIcon {
  switch (kind) {
    case 'spec':
      return new vscode.ThemeIcon('book', new vscode.ThemeColor('charts.blue'))
    case 'plan':
      return new vscode.ThemeIcon('project', new vscode.ThemeColor('charts.purple'))
    case 'tasks':
      return new vscode.ThemeIcon('checklist', new vscode.ThemeColor('charts.green'))
    case 'verify':
      return new vscode.ThemeIcon('beaker', new vscode.ThemeColor('charts.yellow'))
    case 'fix':
      return new vscode.ThemeIcon('wrench', new vscode.ThemeColor('charts.orange'))
    case 'analyze':
      return new vscode.ThemeIcon('search', new vscode.ThemeColor('charts.foreground'))
    case 'presentation':
      return new vscode.ThemeIcon('globe', new vscode.ThemeColor('charts.blue'))
    case 'mockup':
      return new vscode.ThemeIcon('device-mobile', new vscode.ThemeColor('charts.purple'))
    default:
      return new vscode.ThemeIcon('file', new vscode.ThemeColor('charts.foreground'))
  }
}

class ToolsProvider implements vscode.TreeDataProvider<ToolItem> {
  private initialized = false
  private readonly emitter = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this.emitter.event

  setInitialized(value: boolean): void {
    if (this.initialized === value) return
    this.initialized = value
    this.emitter.fire()
  }

  getChildren(): ToolItem[] {
    return toolItems(this.initialized)
  }

  getTreeItem(item: ToolItem): vscode.TreeItem {
    const node = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None)
    node.description = item.description
    node.iconPath = new vscode.ThemeIcon(item.icon)
    node.command = { command: item.command, title: item.label }
    node.contextValue = 'tool'
    return node
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new AtlasTreeProvider()
  const treeView = vscode.window.createTreeView(VIEW_ID, { treeDataProvider: provider, showCollapseAll: true })
  const tools = new ToolsProvider()
  vscode.window.createTreeView('specatlas.tools', { treeDataProvider: tools })
  const problems = vscode.languages.createDiagnosticCollection('specatlas')
  const output = vscode.window.createOutputChannel('SpecAtlas')
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 40)
  status.command = 'specatlas.refresh'
  status.show()
  const panelIcon = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png')

  treeView.onDidChangeSelection((event) => {
    const node = event.selection[0]
    if (node && (node.kind === 'change' || node.kind === 'action')) provider.setSelected(node.change)
  })

  let refreshTimer: NodeJS.Timeout | undefined
  const refresh = async (): Promise<void> => {
    const folders = vscode.workspace.workspaceFolders ?? []
    const snapshots: Snapshot[] = []
    for (const folder of folders) {
      const snapshot = await buildSnapshot(folder.uri.fsPath)
      if (snapshot) snapshots.push(snapshot)
    }
    provider.update(snapshots)
    void vscode.commands.executeCommand('setContext', 'specatlas.initialized', snapshots.length > 0)
    tools.setInitialized(snapshots.length > 0)

    const diagnostics = new Map<string, vscode.Diagnostic[]>()
    for (const snapshot of snapshots) {
      for (const flat of snapshot.diagnostics) {
        if (!flat.file) continue
        const list = diagnostics.get(flat.file) ?? []
        const range = new vscode.Range(Math.max(0, flat.line - 1), 0, Math.max(0, flat.line - 1), 200)
        const diag = new vscode.Diagnostic(range, `${flat.code}: ${flat.message}${flat.suggestion ? ` — ${flat.suggestion}` : ''}`, severityFor(flat.severity))
        diag.source = 'SpecAtlas'
        diag.code = flat.code
        list.push(diag)
        diagnostics.set(flat.file, list)
      }
    }
    problems.clear()
    for (const [file, list] of diagnostics) problems.set(vscode.Uri.file(file), list)

    const first = snapshots[0]
    if (first) {
      const ready = first.changes.filter((change) => change.state === 'ready').length
      const blocked = first.changes.filter((change) => change.blockedBy.length > 0).length
      status.text = `$(book) SpecAtlas: ${first.summary.changes} cambios · ${first.summary.errors} errores`
      status.tooltip = new vscode.MarkdownString(
        [`**${first.projectName}**`, '', `Specs vivas: ${first.summary.specs}`, `Cambios activos: ${first.summary.changes}`, `Listos para archivar: ${ready}`, `Bloqueados: ${blocked}`].join('\n'),
      )
      treeView.badge =
        first.summary.errors > 0
          ? { value: first.summary.errors, tooltip: `${first.summary.errors} hallazgo(s) bloqueante(s)` }
          : undefined
    } else {
      status.text = '$(book) SpecAtlas: sin workspace'
      status.tooltip = 'Inicializa el proyecto con el botón de la vista SpecAtlas'
      treeView.badge = undefined
    }
  }

  const debouncedRefresh = (): void => {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      void refresh()
    }, 300)
  }

  const watcher = vscode.workspace.createFileSystemWatcher('**/.sdd/**')
  watcher.onDidChange(debouncedRefresh)
  watcher.onDidCreate(debouncedRefresh)
  watcher.onDidDelete(debouncedRefresh)

  context.subscriptions.push(
    treeView,
    problems,
    output,
    status,
    watcher,
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const auto = vscode.workspace.getConfiguration('specatlas').get<boolean>('autoValidate', true)
      if (auto && doc.uri.fsPath.includes('.sdd')) debouncedRefresh()
    }),
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) debouncedRefresh()
    }),
  )

  const workspaceRoot = (): string | undefined => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  const compileAdapters = async (root: string): Promise<{ written: string[]; error?: string }> => {
    const fs = await import('node:fs')
    const workflowDir = context.asAbsolutePath('workflow')
    if (!fs.existsSync(path.join(workflowDir, 'phases'))) {
      return { written: [], error: 'no se encontró workflow/phases en la extensión; ejecuta `satlas adapters` en la terminal' }
    }
    const sddDir = path.join(root, '.sdd')
    if (!fs.existsSync(path.join(sddDir, 'config.yaml'))) {
      return { written: [], error: 'no hay .sdd/config.yaml; inicializa el workspace primero' }
    }
    const loaded = await loadConfig(sddDir)
    const report = await compileTargets({
      root,
      workflowDir,
      targets: loaded.config.adapters.targets as AgentTarget[],
      language: loaded.config.project.language,
    })
    return { written: report.written }
  }

  const resolveArgSlug = (arg: unknown): string | undefined => {
    if (typeof arg === 'string') return arg
    if (arg && typeof arg === 'object') {
      const candidate = arg as { change?: { slug?: string }; slug?: string }
      if (candidate.change?.slug) return candidate.change.slug
      if (candidate.slug) return candidate.slug
    }
    return undefined
  }

  const resolveArgPath = (arg: unknown): string | undefined => {
    if (typeof arg === 'string') return arg
    if (arg && typeof arg === 'object') {
      const candidate = arg as { file?: { path?: string }; spec?: { path?: string }; path?: string }
      if (candidate.file?.path) return candidate.file.path
      if (candidate.spec?.path) return candidate.spec.path
      if (candidate.path) return candidate.path
    }
    return undefined
  }

  const selectedChange = (arg?: unknown): SnapshotChange | undefined => {
    const slug = resolveArgSlug(arg)
    const selected = provider.getSelected()
    if (slug) return providerSnapshot(provider).find((c) => c.slug === slug) ?? selected
    return selected ?? providerSnapshot(provider)[0]
  }

  const register = (id: string, handler: (...args: unknown[]) => Promise<void> | void): void => {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler))
  }

  register('specatlas.refresh', async () => {
    await refresh()
  })

  register('specatlas.adapters', async () => {
    const root = workspaceRoot()
    if (!root) {
      void vscode.window.showWarningMessage('SpecAtlas: abre una carpeta de proyecto para compilar los adaptadores.')
      return
    }
    const result = await compileAdapters(root)
    if (result.error) {
      void vscode.window.showErrorMessage(`SpecAtlas: ${result.error}.`)
      return
    }
    if (result.written.length === 0) {
      void vscode.window.showInformationMessage('SpecAtlas: los adaptadores ya están actualizados.')
    } else {
      void vscode.window.showInformationMessage(
        `SpecAtlas: adaptadores compilados (${result.written.length} archivos). Reinicia la sesión de tu agente para ver los comandos.`,
      )
    }
    await refresh()
  })

  register('specatlas.init', async () => {
    let root = workspaceRoot()
    if (!root) {
      const picked = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: 'Elegir la carpeta del proyecto' })
      root = picked?.[0]?.fsPath
    }
    if (!root) return
    const fs = await import('node:fs')
    const profilesDir = context.asAbsolutePath(path.join('media', 'profiles'))
    const result = await initWorkspace({
      root,
      name: path.basename(root),
      language: 'es',
      ...(fs.existsSync(profilesDir) ? { profilesDir } : {}),
    })
    const errors = result.diagnostics.filter((d) => d.severity === 'error')
    if (errors.length > 0) {
      void vscode.window.showErrorMessage(`SpecAtlas: ${errors.map((d) => d.message).join('; ')}`)
      return
    }
    const best = result.detected?.best?.name
    const adapters = await compileAdapters(root)
    const suffix = adapters.error
      ? ` Ejecuta \`satlas adapters\` en la terminal (${adapters.error}).`
      : adapters.written.length > 0
        ? ` Adaptadores compilados (${adapters.written.length} archivos): reinicia la sesión de tu agente para ver los comandos.`
        : ' Adaptadores ya actualizados.'
    void vscode.window.showInformationMessage(`SpecAtlas: workspace inicializado${best ? ` (stack detectado: ${best})` : ''}.${suffix}`)
    await refresh()
  })

  register('specatlas.openAt', async (fileArg: unknown, line?: unknown) => {
    const target = resolveArgPath(fileArg)
    if (!target) return
    const lineNumber = typeof line === 'number' ? Math.max(1, Math.floor(line)) : 1
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(target))
    const editor = await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preview: false })
    const position = new vscode.Position(lineNumber - 1, 0)
    editor.selection = new vscode.Selection(position, position)
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter)
  })

  register('specatlas.validate', async () => {
    await refresh()
    const snapshot = provider.snapshotOf(0)
    if (!snapshot) return
    output.appendLine(`[validate] ${new Date().toISOString()} — ${snapshot.summary.errors} errores, ${snapshot.summary.warnings} avisos`)
    for (const flat of snapshot.diagnostics) output.appendLine(`  ${flat.severity.toUpperCase()} ${flat.code} ${flat.file}:${flat.line} — ${flat.message}`)
    output.show(true)
    void vscode.window.showInformationMessage(`SpecAtlas: ${snapshot.summary.errors} errores, ${snapshot.summary.warnings} avisos`)
  })

  register('specatlas.doctor', async () => {
    const root = workspaceRoot()
    if (!root) return
    const report = await runDoctor(root)
    output.appendLine(`[doctor] ${new Date().toISOString()}`)
    for (const finding of report.findings) output.appendLine(`  ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}`)
    output.show(true)
    publishExtraDiagnostics(problems, report.findings)
    void vscode.window.showInformationMessage(`SpecAtlas doctor: ${report.summary.errors} errores, ${report.summary.warnings} avisos`)
  })

  register('specatlas.trace', async (arg?: unknown) => {
    const change = selectedChange(arg)
    const snapshot = provider.snapshotOf(0)
    if (!change || !snapshot) return
    const result = await traceFor(snapshot.root, change.slug)
    output.appendLine(`[trace] ${change.slug} — ${result.summary.errors} errores, ${result.summary.warnings} avisos`)
    for (const finding of result.findings) output.appendLine(`  ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}`)
    output.show(true)
  })

  register('specatlas.waves', async (arg?: unknown) => {
    const change = selectedChange(arg)
    const snapshot = provider.snapshotOf(0)
    if (!change || !snapshot) return
    const fsx = await import('@specatlas/core')
    const changeData = await fsx.loadChange(snapshot.root, change.slug)
    if (!changeData.tasks || changeData.tasks.counts.total === 0) {
      void vscode.window.showInformationMessage(`SpecAtlas: ${change.slug} no tiene tareas.`)
      return
    }
    const plan = planWaves(changeData.tasks, { maxParallel: 3 })
    output.appendLine(`[waves] ${change.slug}`)
    for (const block of plan.blocks) {
      block.waves.forEach((wave, i) => output.appendLine(`  Bloque ${block.block} · ola ${i + 1}: ${wave.map((t) => t.id).join(', ')}`))
    }
    output.show(true)
  })

  register('specatlas.analyze', async (arg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) return
    const result = await runAnalyze({ root, slug: change.slug })
    output.appendLine(`[analyze] ${change.slug} — ${result.status} (${result.summary.errors} errores, ${result.summary.warnings} avisos)`)
    output.show(true)
    void vscode.window.showInformationMessage(`SpecAtlas analyze: ${result.status}`)
    await refresh()
  })

  register('specatlas.present', async (arg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) return
    const result = await generatePresentation({ root, slug: change.slug })
    if (result.path) {
      await vscode.env.openExternal(vscode.Uri.file(result.path))
      void vscode.window.showInformationMessage('SpecAtlas: propuesta generada y abierta en el navegador.')
    } else {
      void vscode.window.showErrorMessage(result.diagnostics.map((d) => d.message).join('; ') || 'No se pudo generar la propuesta.')
    }
    await refresh()
  })

  register('specatlas.mockup.open', async (arg?: unknown, screenArg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) return
    const { manifest } = await readMockupManifest(root, change.slug)
    const screens = manifest?.screens ?? []
    if (screens.length === 0) {
      void vscode.window.showInformationMessage(`SpecAtlas: ${change.slug} no tiene mockups. Ejecuta \`satlas mockup ${change.slug}\`.`)
      return
    }
    const requested = typeof screenArg === 'string' ? screens.find((s) => s.id === screenArg) : undefined
    const screen = requested ?? screens[0]!
    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(change.dir, 'mockups', screen.file)))
  })

  register('specatlas.approve', async (arg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) return
    const name = await vscode.window.showInputBox({ title: 'Aprobar spec', prompt: 'Nombre de quien aprueba (queda auditado con hash y fecha)' })
    if (!name) return
    const result = await signApproval({ root, artifact: path.posix.join('changes', change.slug, 'spec.md'), by: name, channel: 'editor' })
    if (result.approval) {
      void vscode.window.showInformationMessage(`SpecAtlas: spec de ${change.slug} aprobada por ${name}.`)
    } else {
      void vscode.window.showErrorMessage(result.diagnostics.map((d) => d.message).join('; '))
    }
    await refresh()
  })

  register('specatlas.archive', async (arg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) return
    const confirm = await vscode.window.showWarningMessage(`¿Archivar ${change.slug}? Se pliegan los deltas en la spec viva.`, { modal: true }, 'Archivar')
    if (confirm !== 'Archivar') return
    const result = await archiveChange({ root, slug: change.slug })
    const errors = result.diagnostics.filter((d) => d.severity === 'error')
    if (errors.length > 0) {
      void vscode.window.showErrorMessage(errors.map((d) => d.message).join('; '))
    } else {
      void vscode.window.showInformationMessage(`SpecAtlas: ${change.slug} archivado.`)
    }
    await refresh()
  })

  register('specatlas.openPreview', async (fileArg: unknown, slugArg?: unknown, kindArg?: unknown) => {
    const target = resolveArgPath(fileArg)
    if (!target) return
    if (kindArg === 'mockup') {
      await vscode.commands.executeCommand('specatlas.mockup.open', typeof slugArg === 'string' ? slugArg : undefined)
      return
    }
    if (target.endsWith('.html') || target.endsWith('.htm')) {
      const panel = vscode.window.createWebviewPanel('specatlas.preview', path.basename(target), vscode.ViewColumn.Beside, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.dirname(target))],
      })
      panel.iconPath = panelIcon
      panel.webview.html = await rewriteLocalHtml(panel, target)
      return
    }
    if (target.endsWith('.md')) {
      try {
        await vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(target))
        return
      } catch {
        const content = (await readTextIfExists(target)) ?? ''
        const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media')
        const panel = vscode.window.createWebviewPanel('specatlas.preview', path.basename(target), vscode.ViewColumn.Beside, {
          enableScripts: true,
          localResourceRoots: [mediaRoot],
        })
        panel.iconPath = panelIcon
        const mermaidAsset = vscode.Uri.joinPath(mediaRoot, 'mermaid.min.js')
        let mermaidUri: string | undefined
        try {
          await vscode.workspace.fs.stat(mermaidAsset)
          mermaidUri = panel.webview.asWebviewUri(mermaidAsset).toString()
        } catch {
          mermaidUri = undefined
        }
        panel.webview.html = previewHtml(path.basename(target), content, {
          cspSource: panel.webview.cspSource,
          nonce: String(Date.now()),
          ...(mermaidUri ? { mermaidUri } : {}),
        })
        return
      }
    }
    if (target.endsWith('.html')) {
      await vscode.env.openExternal(vscode.Uri.file(target))
      return
    }
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(target))
    await vscode.window.showTextDocument(doc)
  })

  register('specatlas.copyNext', async (arg?: unknown) => {
    const change = selectedChange(arg)
    if (!change) return
    await vscode.env.clipboard.writeText(change.next)
    void vscode.window.showInformationMessage(`SpecAtlas: copiado "${change.next}"`)
  })

  register('specatlas.runNext', async (arg?: unknown) => {
    const change = selectedChange(arg)
    if (!change) return
    const command = change.next
    if (!command.startsWith('satlas ')) {
      await vscode.env.clipboard.writeText(command)
      void vscode.window.showInformationMessage(`SpecAtlas: acción con agente copiada al portapapeles: ${command}`)
      return
    }
    const sub = command.split(' ')[1] ?? ''
    const mapping: Record<string, string> = {
      validate: 'specatlas.validate',
      doctor: 'specatlas.doctor',
      trace: 'specatlas.trace',
      waves: 'specatlas.waves',
      analyze: 'specatlas.analyze',
      present: 'specatlas.present',
      approve: 'specatlas.approve',
      archive: 'specatlas.archive',
    }
    const target = mapping[sub]
    if (target) {
      await vscode.commands.executeCommand(target)
    } else {
      await vscode.env.clipboard.writeText(command)
      void vscode.window.showInformationMessage(`SpecAtlas: copiado "${command}" — ejecútalo en la terminal.`)
    }
  })

  register('specatlas.matrix', async () => {
    const root = workspaceRoot()
    if (!root) return
    const model = await buildMatrix(root)
    const panel = vscode.window.createWebviewPanel('specatlas.matrix', 'Matriz de trazabilidad', vscode.ViewColumn.Active, {
      enableScripts: false,
      enableCommandUris: true,
    })
    panel.iconPath = panelIcon
    panel.webview.html = matrixHtml(model)
  })

  register('specatlas.board', async () => {
    await refresh()
    const snapshot = provider.snapshotOf(0)
    if (!snapshot) return
    const panel = vscode.window.createWebviewPanel('specatlas.board', `Tablero — ${snapshot.projectName}`, vscode.ViewColumn.Active, {
      enableScripts: false,
      enableCommandUris: true,
    })
    panel.iconPath = panelIcon
    panel.webview.html = boardHtml(snapshot)
  })

  register('specatlas.metrics', async () => {
    const root = workspaceRoot()
    if (!root) return
    const metrics = await collectMetrics(root)
    const panel = vscode.window.createWebviewPanel('specatlas.metrics', `Métricas — ${metrics.project}`, vscode.ViewColumn.Active, {
      enableScripts: false,
      enableCommandUris: true,
    })
    panel.iconPath = panelIcon
    panel.webview.html = metricsHtml(metrics)
  })

  void refresh()

  const lspEnabled = vscode.workspace.getConfiguration('specatlas').get<boolean>('lsp', true)
  if (lspEnabled) {
    try {
      languageClient = startLanguageClient(context, output)
    } catch (error) {
      output.appendLine(`[lsp] no se pudo iniciar el servidor de lenguaje: ${(error as Error).message}`)
    }
  }
}

export function deactivate(): void {
  void languageClient?.stop()
  languageClient = undefined
}

function severityFor(severity: 'error' | 'warning' | 'info'): vscode.DiagnosticSeverity {
  if (severity === 'error') return vscode.DiagnosticSeverity.Error
  if (severity === 'warning') return vscode.DiagnosticSeverity.Warning
  return vscode.DiagnosticSeverity.Information
}

function publishExtraDiagnostics(collection: vscode.DiagnosticCollection, findings: CoreDiagnostic[]): void {
  const byFile = new Map<string, vscode.Diagnostic[]>()
  for (const finding of findings) {
    if (!finding.path) continue
    const list = byFile.get(finding.path) ?? []
    const line = Math.max(0, (finding.line ?? 1) - 1)
    const diag = new vscode.Diagnostic(new vscode.Range(line, 0, line, 200), `${finding.code}: ${finding.message}`, severityFor(finding.severity))
    diag.source = 'SpecAtlas (doctor)'
    list.push(diag)
    byFile.set(finding.path, list)
  }
  for (const [file, list] of byFile) {
    const existing = collection.get(vscode.Uri.file(file)) ?? []
    collection.set(vscode.Uri.file(file), [...existing, ...list])
  }
}

async function traceFor(root: string, slug: string): Promise<{ summary: { errors: number; warnings: number; infos: number }; findings: CoreDiagnostic[] }> {
  const fsx = await import('@specatlas/core')
  const { workspace, config } = await fsx.loadWorkspace(root)
  const change = await fsx.loadChange(root, slug)
  const result = checkTrace({
    specs: workspace.specs,
    change,
    requireEvidence: config.gates.verify.mode !== 'off' && config.gates.verify.require_evidence,
  })
  return { summary: result.summary, findings: result.findings }
}

function providerSnapshot(provider: AtlasTreeProvider): SnapshotChange[] {
  return provider.snapshotOf(0)?.changes ?? []
}
