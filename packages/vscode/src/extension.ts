import * as vscode from 'vscode'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import {
  archiveChange,
  checkDrift,
  checkTrace,
  collectMetrics,
  createChange,
  explainDiagnostic,
  impactOfFile,
  impactOfRequirement,
  listExplanations,
  loadAllAnchors,
  loadWorkspace,
  pruneAnchors,
  renderTemplate,
  templatesFor,
  writeText,
  evaluatePacks,
  generatePresentation,
  initWorkspace,
  loadActiveProfile,
  loadChange,
  loadConfig,
  localStamp,
  mockupsReady,
  packFindings,
  parseDelta,
  parseVerifyFile,
  planWaves,
  readMockupManifest,
  readTextIfExists,
  recordEvidence,
  resolvePacks,
  runAnalyze,
  runCiGate,
  runDoctor,
  setMockupRequirement,
  signApproval,
  type CiExtraCheck,
  type Diagnostic as CoreDiagnostic,
} from '@specatlas/core'
import { checkAdapters, compileTargets, type AgentTarget } from '@specatlas/adapters'
import {
  buildMatrix,
  buildSnapshot,
  groupTasksByBlock,
  previewHtml,
  toolGroups,
  type Snapshot,
  type SnapshotArchived,
  type SnapshotChange,
  type SnapshotFile,
  type SnapshotFix,
  type SnapshotSpec,
  type SnapshotSpecItem,
  type SnapshotTaskItem,
  type SnapshotMockupItem,
  type ToolItem,
} from './logic.js'
import { formHtml, type FormField } from './forms.js'
import { PANEL_KEY, PANEL_TITLE, PANEL_VIEW_TYPE, buildPanelPage, isPanelSection, panelNotice, renderPanelHtml, type PanelResources } from './panel/panel.js'
import { buildPanelModel } from './panel/model.js'
import { agentCli } from '@specatlas/core'
import { buildNow, focusChange, statusBarText } from './views/now.js'
import { buildHealth, healthBadge } from './views/health.js'
import { changeForFile, fileBadge, toggleTaskLine } from './views/artefactos.js'
import { laneOf, resolveCommand, stepsForLane } from './actions.js'
import { findLivePanel, refreshLivePanels, updateLivePanel, type LivePanelEntry, type LivePanelSurface } from './live.js'
import { startLanguageClient } from './client.js'
import type { LanguageClient } from 'vscode-languageclient/node'

const VIEW_ID = 'specatlas.explorer'

function pathForScreen(change: SnapshotChange, screen: SnapshotMockupItem): string {
  return path.join(change.dir, 'mockups', screen.file)
}

function panelNonce(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
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
  | { kind: 'taskBlock'; change: SnapshotChange; file: SnapshotFile; block: string; tasks: SnapshotTaskItem[] }
  | { kind: 'task'; change: SnapshotChange; file: SnapshotFile; task: SnapshotTaskItem }
  | { kind: 'mockup'; change: SnapshotChange; screen: SnapshotMockupItem }
  | { kind: 'livingFix'; fix: SnapshotFix }
  | { kind: 'archivedChange'; archived: SnapshotArchived }

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

  all(): Snapshot[] {
    return this.state.snapshots
  }

  /** Todos los cambios del workspace, no solo los de la primera carpeta. */
  changes(): SnapshotChange[] {
    return this.state.snapshots.flatMap((snapshot) => snapshot.changes)
  }

  /** El proyecto al que pertenece un cambio (con varias carpetas abiertas importa). */
  snapshotOfChange(change: SnapshotChange | undefined): Snapshot | undefined {
    if (!change) return this.state.snapshots[0]
    return this.state.snapshots.find((snapshot) => snapshot.changes.some((item) => item.slug === change.slug && item.dir === change.dir)) ?? this.state.snapshots[0]
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
      case 'livingFix': {
        const fix = node.fix
        const item = new vscode.TreeItem(fix.slug, vscode.TreeItemCollapsibleState.None)
        item.description = `${fix.date} · ${fix.domain ?? '—'} · ${fix.result}`
        item.tooltip = new vscode.MarkdownString(
          [
            `**${fix.title ?? fix.slug}**`,
            '',
            `Archivado: ${fix.date} · dominio \`${fix.domain ?? '—'}\` · evidencia \`${fix.result}\``,
            fix.source === 'archive' ? 'Conservado en el histórico (archivado antes de los fixes vivos).' : '',
            fix.covers.length > 0 ? `Cubre: ${fix.covers.map((cover) => `\`${cover}\``).join(', ')}` : '',
            '',
            `\`${vscode.workspace.asRelativePath(fix.path)}\``,
          ]
            .filter((line) => line !== '')
            .join('\n'),
        )
        item.iconPath = new vscode.ThemeIcon('wrench', new vscode.ThemeColor('charts.orange'))
        item.contextValue = 'livingFix'
        item.command = { command: 'specatlas.openPreview', title: 'Abrir fix vivo', arguments: [fix.path] }
        return item
      }
      case 'archivedChange': {
        const archived = node.archived
        const item = new vscode.TreeItem(archived.slug, vscode.TreeItemCollapsibleState.None)
        item.description = `${archived.lane} · ${archived.month}`
        item.tooltip = new vscode.MarkdownString(
          [
            `**${archived.title ?? archived.slug}**`,
            '',
            `Carril \`${archived.lane}\` · cerrado en ${archived.month}`,
            '',
            'Es la **historia del cambio** (qué se propuso, se planificó y se verificó). El comportamiento vigente vive en **Specs vivas**.',
            '',
            `\`${vscode.workspace.asRelativePath(archived.file)}\``,
          ].join('\n'),
        )
        item.iconPath = new vscode.ThemeIcon('archive')
        item.contextValue = 'archivedChange'
        item.command = { command: 'specatlas.openPreview', title: 'Abrir cambio archivado', arguments: [archived.file] }
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
            c.approval ? `Aprobación: **${c.approval.by}** · ${c.approval.at}` : '',
            c.mockups.decision === 'required'
              ? `Mockups: **requeridos**${c.mockups.screens > 0 && !c.mockups.stale ? ' · listos' : ' · pendientes'}`
              : c.mockups.screens > 0
                ? `Mockups: ${c.mockups.screens} pantalla(s)${c.mockups.stale ? ' · desactualizados' : ''}`
                : '',
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
        item.contextValue = `change change-${c.state}`
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
        item.contextValue = `file file-${node.file.kind}`
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
      case 'taskBlock': {
        const done = node.tasks.filter((task) => task.done).length
        const item = new vscode.TreeItem(node.block, vscode.TreeItemCollapsibleState.Expanded)
        item.description = `${done}/${node.tasks.length} tareas`
        item.iconPath = new vscode.ThemeIcon('list-ordered', new vscode.ThemeColor('charts.purple'))
        item.contextValue = 'taskBlock'
        item.tooltip = `${node.change.slug} · ${node.block}`
        return item
      }
      case 'task': {
        const item = new vscode.TreeItem(node.task.title, vscode.TreeItemCollapsibleState.None)
        item.description = `${node.task.id} · ${node.task.block}`
        // La casilla marca la tarea en tasks.md sin abrir el markdown.
        item.checkboxState = node.task.done ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked
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
      for (const group of groupTasksByBlock(node.file.tasks ?? [])) {
        children.push({ kind: 'taskBlock', change: node.change, file: node.file, block: group.block, tasks: group.tasks })
      }
      for (const screen of node.file.screens ?? []) children.push({ kind: 'mockup', change: node.change, screen })
      return children
    }
    if (node.kind === 'taskBlock') {
      return node.tasks.map((task) => ({ kind: 'task' as const, change: node.change, file: node.file, task }))
    }
    return []
  }

  private rootNodes(): Node[] {
    if (this.state.snapshots.length === 0) return []
    // Con un solo workspace no hay nada que desambiguar: los grupos van a la raíz
    // para que lo que importa esté a un clic, no a tres.
    const single = this.state.snapshots.length === 1
    const nodes = this.state.snapshots.map((snapshot) => {
      const groups = groupsFor(snapshot)
      if (single) return groups
      const ready = snapshot.changes.filter((change) => change.state === 'ready').length
      const blocked = snapshot.changes.filter((change) => change.blockedBy.length > 0).length
      return [
        {
          kind: 'group' as const,
          label: snapshot.projectName,
          description: `${snapshot.summary.specs} specs · ${snapshot.summary.changes} cambios${ready > 0 ? ` · ${ready} listos` : ''}${blocked > 0 ? ` · ${blocked} bloqueados` : ''}`,
          icon: 'root-folder',
          tone: 'charts.blue',
          children: groups,
        },
      ]
    })
    return nodes.flat()
  }
}

/** Los cuatro grupos del workspace, en el orden en que se usan. */
function groupsFor(snapshot: Snapshot): Node[] {
  const specs: Node[] = snapshot.specs.map((spec) => ({ kind: 'spec', spec }))
  const changes: Node[] = snapshot.changes.map((change) => ({ kind: 'change', change }))
  const fixes: Node[] = snapshot.fixes.map((fix) => ({ kind: 'livingFix', fix }))
  const archived: Node[] = snapshot.archived.map((entry) => ({ kind: 'archivedChange', archived: entry }))
  const ready = snapshot.changes.filter((change) => change.state === 'ready').length
  const blocked = snapshot.changes.filter((change) => change.blockedBy.length > 0).length

  return [
    {
      kind: 'group',
      label: 'Cambios',
      description: changes.length > 0 ? `${changes.length}${ready > 0 ? ` · ${ready} listo(s)` : ''}${blocked > 0 ? ` · ${blocked} bloqueado(s)` : ''}` : '0 · empieza uno con «Nuevo cambio»',
      icon: 'git-pull-request',
      tone: 'charts.green',
      tooltip: '**Cambios** — el trabajo en curso: propuesta, especificación, plan, tareas y evidencia.\n\nCada uno avanza por fases y se cierra al archivar.',
      children: changes,
    },
    {
      kind: 'group',
      label: 'Specs vivas',
      description: snapshot.summary.specs > 0 ? `${snapshot.summary.specs}` : '0 · se llenan al archivar un cambio',
      icon: 'book',
      tone: 'charts.purple',
      tooltip: '**Specs vivas** — la fuente de verdad del comportamiento actual.\n\nSe llenan al archivar: `satlas archive <slug>` pliega el delta del cambio en `.sdd/specs/<dominio>/spec.md`.',
      children: specs,
    },
    {
      kind: 'group',
      label: 'Fixes',
      description: snapshot.fixes.length > 0 ? `${snapshot.fixes.length}` : '0 · se llenan al archivar un fix',
      icon: 'wrench',
      tone: 'charts.orange',
      tooltip:
        '**Fixes** — las correcciones del carril express, vivas o conservadas del histórico.\n\nSe llenan al archivar: `satlas archive <slug>` conserva el fix en `.sdd/fixes/` con su causa, su cambio y su evidencia.',
      children: fixes,
    },
    {
      kind: 'group',
      label: 'Histórico de cambios',
      description: snapshot.archived.length > 0 ? `${snapshot.archived.length}` : '0 · se llena al archivar',
      icon: 'archive',
      tooltip:
        '**Histórico de cambios** — qué cambios se cerraron, cuándo y con qué evidencia.\n\nEs la **historia**, no el comportamiento vigente: eso vive en **Specs vivas**.',
      children: archived,
    },
  ]
}

function progressGlyphs(percent: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(percent / 20)))
  return `${'▓'.repeat(filled)}${'░'.repeat(5 - filled)}`
}

function stateIcon(state: string): vscode.ThemeIcon {
  switch (state) {
    case 'ready':
      return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('charts.green'))
    case 'paused':
      return new vscode.ThemeIcon('debug-pause', new vscode.ThemeColor('charts.yellow'))
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
    case 'reviewed':
      return new vscode.ThemeIcon('check-all', new vscode.ThemeColor('charts.green'))
    case 'archived':
      return new vscode.ThemeIcon('archive', new vscode.ThemeColor('charts.foreground'))
    default:
      return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.foreground'))
  }
}

const KIND_LABELS: Record<SnapshotFile['kind'], string> = {
  proposal: 'propuesta',
  spec: 'delta',
  clarify: 'aclaraciones',
  plan: 'plan técnico',
  tasks: 'tareas',
  verify: 'verificación',
  review: 'revisión de código',
  docs: 'documentación',
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
    case 'review':
      return new vscode.ThemeIcon('eye', new vscode.ThemeColor('charts.red'))
    case 'clarify':
      return new vscode.ThemeIcon('comment-discussion', new vscode.ThemeColor('charts.blue'))
    case 'docs':
      return new vscode.ThemeIcon('book', new vscode.ThemeColor('charts.orange'))
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

type ToolNode = { kind: 'group'; label: string; icon: string; items: ToolItem[] } | { kind: 'item'; item: ToolItem }

class ToolsProvider implements vscode.TreeDataProvider<ToolNode> {
  private initialized = false
  private readonly emitter = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this.emitter.event

  setInitialized(value: boolean): void {
    if (this.initialized === value) return
    this.initialized = value
    this.emitter.fire()
  }

  getChildren(node?: ToolNode): ToolNode[] {
    if (!node) {
      return toolGroups(this.initialized).map((group) => ({ kind: 'group' as const, label: group.label, icon: group.icon, items: group.items }))
    }
    if (node.kind === 'group') return node.items.map((item) => ({ kind: 'item' as const, item }))
    return []
  }

  getTreeItem(node: ToolNode): vscode.TreeItem {
    if (node.kind === 'group') {
      const group = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded)
      group.iconPath = new vscode.ThemeIcon(node.icon, new vscode.ThemeColor('charts.blue'))
      group.contextValue = 'toolGroup'
      group.description = `${node.items.length}`
      return group
    }
    const item = new vscode.TreeItem(node.item.label, vscode.TreeItemCollapsibleState.None)
    item.description = node.item.description
    item.iconPath = new vscode.ThemeIcon(node.item.icon)
    item.command = { command: node.item.command, title: node.item.label }
    item.contextValue = 'tool'
    return item
  }
}

/** Nodo de las vistas «Ahora» y «Salud»: mismo contrato, dos modelos puros. */
interface PanelTreeNode {
  id: string
  label: string
  description?: string
  tooltip?: string
  icon: string
  tone?: string
  command?: { command: string; args: unknown[] }
  contextValue?: string
  children?: PanelTreeNode[]
  expanded?: boolean
}

class ModelTreeProvider implements vscode.TreeDataProvider<PanelTreeNode> {
  private nodes: PanelTreeNode[] = []
  private readonly emitter = new vscode.EventEmitter<PanelTreeNode | undefined>()
  readonly onDidChangeTreeData = this.emitter.event

  update(nodes: PanelTreeNode[]): void {
    this.nodes = nodes
    this.emitter.fire(undefined)
  }

  getChildren(node?: PanelTreeNode): PanelTreeNode[] {
    return node ? (node.children ?? []) : this.nodes
  }

  getTreeItem(node: PanelTreeNode): vscode.TreeItem {
    const collapsible =
      (node.children?.length ?? 0) === 0
        ? vscode.TreeItemCollapsibleState.None
        : node.expanded
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
    const item = new vscode.TreeItem(node.label, collapsible)
    if (node.description !== undefined) item.description = node.description
    if (node.tooltip !== undefined) item.tooltip = new vscode.MarkdownString(node.tooltip)
    item.iconPath = new vscode.ThemeIcon(node.icon, node.tone ? new vscode.ThemeColor(node.tone) : undefined)
    if (node.contextValue !== undefined) item.contextValue = node.contextValue
    if (node.command) item.command = { command: node.command.command, title: node.label, arguments: node.command.args }
    item.id = node.id
    return item
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new AtlasTreeProvider()
  const treeView = vscode.window.createTreeView(VIEW_ID, { treeDataProvider: provider, showCollapseAll: true })
  const nowProvider = new ModelTreeProvider()
  const nowView = vscode.window.createTreeView('specatlas.now', { treeDataProvider: nowProvider })
  const healthProvider = new ModelTreeProvider()
  const healthView = vscode.window.createTreeView('specatlas.health', { treeDataProvider: healthProvider })
  const tools = new ToolsProvider()
  vscode.window.createTreeView('specatlas.tools', { treeDataProvider: tools })
  const problems = vscode.languages.createDiagnosticCollection('specatlas')
  const output = vscode.window.createOutputChannel('SpecAtlas')
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 40)
  status.command = 'specatlas.focusNow'
  status.show()
  const panelIcon = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png')

  treeView.onDidChangeSelection((event) => {
    const node = event.selection[0]
    if (node && (node.kind === 'change' || node.kind === 'action')) provider.setSelected(node.change)
  })

  // Marcar la casilla de una tarea escribe la `x` en tasks.md.
  treeView.onDidChangeCheckboxState(async (event) => {
    for (const [node, state] of event.items) {
      if (node.kind !== 'task') continue
      const done = state === vscode.TreeItemCheckboxState.Checked
      const file = node.file.path
      try {
        const raw = await fsp.readFile(file, 'utf8')
        const next = toggleTaskLine(raw, node.task.line, done)
        if (!next) {
          void vscode.window.showWarningMessage(`SpecAtlas: no se pudo marcar ${node.task.id}; abre tasks.md y revisa la línea.`)
          continue
        }
        await fsp.writeFile(file, next, 'utf8')
      } catch (error) {
        void vscode.window.showWarningMessage(`SpecAtlas: no se pudo escribir en tasks.md (${(error as Error).message}).`)
      }
    }
    await refresh()
  })

  // El panel lateral sigue al archivo abierto: al entrar en un artefacto, su
  // cambio queda seleccionado y las acciones apuntan a él.
  const followEditor = (editor: vscode.TextEditor | undefined): void => {
    const ref = changeForFile(provider.all(), editor?.document.uri.fsPath)
    if (!ref) return
    if (provider.getSelected()?.slug === ref.change.slug) return
    provider.setSelected(ref.change)
    nowProvider.update(buildNow(provider.all()))
  }

  // Decoración sobre los propios archivos de `.sdd/`: hallazgos y fase.
  const decorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>()
  const decorationProvider = vscode.window.registerFileDecorationProvider({
    onDidChangeFileDecorations: decorations.event,
    provideFileDecoration(uri) {
      const badge = fileBadge(provider.all(), uri.fsPath)
      if (!badge) return undefined
      return {
        badge: badge.badge,
        tooltip: badge.tooltip,
        ...(badge.color !== undefined ? { color: new vscode.ThemeColor(badge.color) } : {}),
        propagate: badge.propagate,
      }
    },
  })

  let refreshTimer: NodeJS.Timeout | undefined
  const livePanels = new Set<LivePanelEntry<vscode.WebviewPanel>>()

  function surfaceOf(panel: vscode.WebviewPanel): LivePanelSurface {
    return {
      get visible() {
        return panel.visible
      },
      get title() {
        return panel.title
      },
      set title(value: string) {
        panel.title = value
      },
      setHtml(html: string) {
        panel.webview.html = html
      },
    }
  }

  function openLivePanel(opts: {
    key: string
    viewType: string
    title: string
    viewColumn: vscode.ViewColumn
    options: vscode.WebviewPanelOptions & vscode.WebviewOptions
    build: (panel: vscode.WebviewPanel) => Promise<{ title?: string; html: string } | undefined>
  }): vscode.WebviewPanel {
    const existing = findLivePanel(livePanels, opts.key)
    if (existing) {
      existing.target.reveal(opts.viewColumn)
      void updateLivePanel(existing, (message) => output.appendLine(`[paneles] ${message}`))
      return existing.target
    }
    const panel = vscode.window.createWebviewPanel(opts.viewType, opts.title, opts.viewColumn, opts.options)
    panel.iconPath = panelIcon
    const entry: LivePanelEntry<vscode.WebviewPanel> = { key: opts.key, target: panel, surface: surfaceOf(panel), build: opts.build }
    livePanels.add(entry)
    panel.onDidDispose(() => livePanels.delete(entry))
    let wasVisible = panel.visible
    panel.onDidChangeViewState(() => {
      if (panel.visible && !wasVisible) void updateLivePanel(entry, (message) => output.appendLine(`[paneles] ${message}`))
      wasVisible = panel.visible
    })
    void updateLivePanel(entry, (message) => output.appendLine(`[paneles] ${message}`))
    return panel
  }

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

    decorations.fire(undefined)
    followEditor(vscode.window.activeTextEditor)

    await refreshLivePanels(livePanels, (message) => output.appendLine(`[paneles] ${message}`))
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
    nowView,
    healthView,
    decorationProvider,
    vscode.window.onDidChangeActiveTextEditor((editor) => followEditor(editor)),
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

  const openForm = async (id: string, title: string, html: string, onSubmit: (values: Record<string, string>) => Promise<void>): Promise<void> => {
    const panel = vscode.window.createWebviewPanel(id, title, vscode.ViewColumn.Active, { enableScripts: true })
    panel.iconPath = panelIcon
    panel.webview.html = html
    panel.webview.onDidReceiveMessage(async (message: { type?: string; values?: Record<string, string> }) => {
      if (message.type === 'cancel') {
        panel.dispose()
        return
      }
      if (message.type !== 'submit' || !message.values) return
      panel.dispose()
      await onSubmit(message.values)
    })
  }

  const workspaceRoot = (): string | undefined => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  const openOpencode = async (instruction: string, change?: SnapshotChange): Promise<void> => {
    const snapshot = provider.snapshotOfChange(change)
    const root = snapshot?.root ?? workspaceRoot()
    const cli = agentCli(snapshot?.agent)
    try {
      const terminal = vscode.window.createTerminal({ name: cli, cwd: root })
      terminal.show(true)
      terminal.sendText(`${cli} "${instruction.replace(/"/g, '\\"')}"`)
    } catch (error) {
      await vscode.env.clipboard.writeText(instruction)
      void vscode.window.showWarningMessage(`SpecAtlas: no se pudo abrir el asistente (${(error as Error).message}); la instrucción quedó copiada al portapapeles.`)
    }
  }

  const instructionForStep = (change: SnapshotChange, stepId: string): string | undefined => {
    const step = stepsForLane(laneOf(change)).find((item) => item.id === stepId)
    // La invocación depende del agente configurado en el proyecto, no del que suponga la extensión.
    return step ? resolveCommand(step.command, change.slug, provider.snapshotOfChange(change)?.agent) : undefined
  }

  const mockupGateBlocked = async (change: SnapshotChange): Promise<boolean> => {
    const root = workspaceRoot()
    if (!root) return false
    const parsed = await loadChange(root, change.slug)
    return !(await mockupsReady(root, change.slug, parsed))
  }

  const ensureMockupsDecision = async (change: SnapshotChange): Promise<boolean | undefined> => {
    if (change.mockups.decision === 'required') return true
    if (change.mockups.decision === 'skip') return false
    const root = workspaceRoot()
    if (!root) return undefined
    const pick = await vscode.window.showQuickPick(
      [
        { label: '$(device-mobile) Sí, lleva mockups', description: 'No se podrá aprobar hasta que los mockups estén listos; se incluirán en la propuesta', value: 'required' as const },
        { label: '$(circle-slash) No, sin mockups', description: 'Se aprueba sin contrato visual', value: 'skip' as const },
      ],
      { title: `Mockups — ${change.slug}`, placeHolder: '¿Este cambio lleva mockups?', ignoreFocusOut: true },
    )
    if (!pick) return undefined
    await setMockupRequirement(root, change.slug, pick.value)
    await refresh()
    return pick.value === 'required'
  }

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

  const runInTerminal = async (command: string, cwd: string): Promise<void> => {
    const terminal = vscode.window.createTerminal({ name: 'SpecAtlas', cwd })
    terminal.show(true)
    terminal.sendText(command)
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
    const snapshots = provider.all()
    if (snapshots.length === 0) return
    const errors = snapshots.reduce((total, snapshot) => total + snapshot.summary.errors, 0)
    const warnings = snapshots.reduce((total, snapshot) => total + snapshot.summary.warnings, 0)
    output.appendLine(`[validate] ${localStamp()} — ${errors} errores, ${warnings} avisos`)
    for (const snapshot of snapshots) {
      for (const flat of snapshot.diagnostics) output.appendLine(`  ${flat.severity.toUpperCase()} ${flat.code} ${flat.file}:${flat.line} — ${flat.message}`)
    }
    output.show(true)
    void vscode.window.showInformationMessage(`SpecAtlas: ${errors} errores, ${warnings} avisos`)
  })

  register('specatlas.doctor', async () => {
    const root = workspaceRoot()
    if (!root) return
    const report = await runDoctor(root)
    output.appendLine(`[doctor] ${localStamp()}`)
    for (const finding of report.findings) output.appendLine(`  ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}`)
    output.show(true)
    publishExtraDiagnostics(problems, report.findings)
    void vscode.window.showInformationMessage(`SpecAtlas doctor: ${report.summary.errors} errores, ${report.summary.warnings} avisos`)
  })

  register('specatlas.trace', async (arg?: unknown) => {
    const change = selectedChange(arg)
    const snapshot = provider.snapshotOfChange(change)
    if (!change || !snapshot) return
    const result = await traceFor(snapshot.root, change.slug)
    output.appendLine(`[trace] ${change.slug} — ${result.summary.errors} errores, ${result.summary.warnings} avisos`)
    for (const finding of result.findings) output.appendLine(`  ${finding.severity.toUpperCase()} ${finding.code} — ${finding.message}`)
    output.show(true)
  })

  register('specatlas.waves', async (arg?: unknown) => {
    const change = selectedChange(arg)
    const snapshot = provider.snapshotOfChange(change)
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
    const required = await ensureMockupsDecision(change)
    if (required === undefined) return
    if (required && (await mockupGateBlocked(change))) {
      void vscode.window.showWarningMessage(`SpecAtlas: "${change.slug}" exige mockups y aún no están listos. Genera el contrato visual con /satlas-mockup ${change.slug} y vuelve a presentar.`)
      return
    }
    const result = await generatePresentation({ root, slug: change.slug })
    if (result.path) {
      await vscode.env.openExternal(vscode.Uri.file(result.path))
      void vscode.window.showInformationMessage('SpecAtlas: propuesta generada y abierta en el navegador.')
    } else {
      void vscode.window.showErrorMessage(result.diagnostics.map((d) => d.message).join('; ') || 'No se pudo generar la propuesta.')
    }
    await refresh()
  })

  register('specatlas.mockups.decide', async (arg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) return
    const pick = await vscode.window.showQuickPick(
      [
        { label: '$(device-mobile) Requerir mockups', description: 'Bloquea la aprobación hasta que estén listos', value: 'required' as const },
        { label: '$(circle-slash) No requiere mockups', description: 'Se aprueba sin contrato visual', value: 'skip' as const },
      ],
      { title: `Mockups — ${change.slug}`, placeHolder: 'Decisión de mockups para este cambio' },
    )
    if (!pick) return
    await setMockupRequirement(root, change.slug, pick.value)
    await refresh()
    void vscode.window.showInformationMessage(
      pick.value === 'required'
        ? `SpecAtlas: "${change.slug}" exigirá mockups antes de aprobar (siguiente: /satlas-mockup ${change.slug}).`
        : `SpecAtlas: "${change.slug}" no requiere mockups.`,
    )
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

  register('specatlas.new', async () => {
    const root = workspaceRoot()
    if (!root) {
      void vscode.window.showWarningMessage('SpecAtlas: abre una carpeta de proyecto para crear un cambio.')
      return
    }
    // Los dominios conocidos son los del proyecto donde se crea el cambio.
    const workspaceSnapshot = provider.all().find((snapshot) => snapshot.root === root) ?? provider.snapshotOf(0)
    const knownDomains = [
      ...new Set([
        ...(workspaceSnapshot?.specs.map((spec) => spec.domain) ?? []),
        ...(workspaceSnapshot?.changes.map((change) => change.domain).filter((domain): domain is string => Boolean(domain)) ?? []),
      ]),
    ].sort()
    const fields: FormField[] = [
      {
        name: 'lane',
        label: 'Carril',
        type: 'radio',
        value: 'standard',
        options: [
          { value: 'fix', label: 'fix', description: 'Incidente express: fix.md con causa raíz, cambio mínimo y evidencia' },
          { value: 'standard', label: 'standard', description: 'Feature o mejora: delta, aprobación, plan y evidencia' },
          { value: 'full', label: 'full', description: 'Cambio grande o sensible: standard + revisión de código' },
        ],
      },
      { name: 'title', label: 'Título', type: 'text', required: true, placeholder: 'Completar tareas', hint: 'Título corto en lenguaje de negocio' },
      { name: 'slug', label: 'Slug (carpeta)', type: 'text', mono: true, deriveFrom: 'title', placeholder: 'se genera del título', hint: 'Se genera del título; puedes editarlo (minúsculas, números y guiones)' },
      {
        name: 'domain',
        label: 'Dominio',
        type: 'text',
        required: true,
        value: knownDomains[0] ?? 'general',
        options: knownDomains.map((domain) => ({ value: domain, label: domain })),
        hint: `Elige uno existente o escribe uno nuevo (se creará). Existentes: ${knownDomains.join(', ') || 'ninguno'}.`,
      },
    ]
    await openForm(
      'specatlas.form.new',
      'Nuevo cambio',
      formHtml({
        title: 'Nuevo cambio',
        intro: 'Elige el carril, escribe el título y el dominio; el slug se propone del título.',
        submitLabel: 'Crear cambio',
        nonce: panelNonce(),
        fields,
      }),
      async (values) => {
        const title = (values['title'] ?? '').trim()
        let domain = (values['domain'] ?? '').trim() || 'general'
        const lane = values['lane'] === 'fix' || values['lane'] === 'full' ? values['lane'] : 'standard'
        const slug = (values['slug'] ?? '').trim() || slugify(title)
        const similar = knownDomains.find((known) => known !== domain && (known.replace(/s$/, '') === domain.replace(/s$/, '') || known.startsWith(domain) || domain.startsWith(known)))
        if (similar) {
          const choice = await vscode.window.showWarningMessage(`Existe un dominio similar: "${similar}". Usar dominios distintos divide las specs vivas.`, { modal: true }, `Usar "${similar}"`)
          if (choice === `Usar "${similar}"`) domain = similar
        }
        const result = await createChange({ root, slug, lane, domain, title })
        const errors = result.diagnostics.filter((d) => d.severity === 'error')
        if (errors.length > 0) {
          void vscode.window.showErrorMessage(`SpecAtlas: ${errors.map((d) => d.message).join('; ')}`)
          return
        }
        await refresh()
        const target = lane === 'fix' ? path.join(result.dir, 'fix.md') : path.join(result.dir, 'spec.md')
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(target))
        await vscode.window.showTextDocument(document)
        void vscode.window.showInformationMessage(
          lane === 'fix'
            ? `SpecAtlas: fix "${slug}" creado. Completa causa raíz y cambio mínimo, registra la evidencia y archívalo.`
            : `SpecAtlas: cambio "${slug}" creado (${lane}). Escribe la spec con el agente o a mano y valida.`,
        )
      },
    )
  })

  register('specatlas.verify', async (arg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) {
      void vscode.window.showWarningMessage('SpecAtlas: selecciona un cambio para registrar evidencia.')
      return
    }
    const isFix = change.lane === 'fix'
    const deltaRaw = isFix ? undefined : await readTextIfExists(path.join(change.dir, 'spec.md'))
    const delta = deltaRaw ? parseDelta(deltaRaw, 'spec.md') : undefined
    const scenarioOptions = [...(delta?.added ?? []), ...(delta?.modified ?? [])].flatMap((requirement) =>
      requirement.scenarios.map((scenario) => ({ value: scenario.id, label: scenario.id, description: scenario.title })),
    )
    const recordedFile = isFix ? 'fix.md' : 'verify.md'
    const recorded = parseVerifyFile((await readTextIfExists(path.join(change.dir, recordedFile))) ?? '', recordedFile).evidence
    const options = [
      ...scenarioOptions,
      ...recorded
        .filter((entry) => !scenarioOptions.some((scenario) => scenario.value === entry.scenario))
        .map((entry) => ({ value: entry.scenario, label: entry.scenario, description: `registrada: ${entry.result}` })),
      { value: '__other', label: 'Otro escenario…', description: 'escribir el id a mano' },
    ]
    const fields: FormField[] = [
      { name: 'scenario', label: 'Escenario', type: 'select', required: true, options },
      { name: 'scenarioOther', label: 'Id del escenario', type: 'text', mono: true, placeholder: 'REQ-TAREA-001-S1', required: true, showWhen: { field: 'scenario', equals: '__other' } },
      {
        name: 'method',
        label: 'Método',
        type: 'radio',
        value: 'executable',
        options: [
          { value: 'executable', label: 'Ejecutar un comando', description: 'Registra comando, salida y hash (evidencia fuerte)' },
          { value: 'manual', label: 'Manual', description: 'Comprobación a mano, con notas' },
        ],
      },
      { name: 'command', label: 'Comando', type: 'text', mono: true, value: 'npm test', required: true, showWhen: { field: 'method', equals: 'executable' }, hint: 'Se ejecuta en la raíz del proyecto' },
      { name: 'notes', label: 'Notas', type: 'textarea', required: true, showWhen: { field: 'method', equals: 'manual' }, hint: '¿Cómo lo comprobaste?' },
      { name: 'by', label: 'Quién verifica', type: 'text', required: true, value: context.globalState.get<string>('specatlas.by') ?? '', hint: 'Queda auditado junto a la evidencia' },
    ]
    await openForm(
      'specatlas.form.verify',
      `Evidencia — ${change.slug}`,
      formHtml({
        title: `Registrar evidencia — ${change.slug}`,
        intro: isFix ? 'El fix exige evidencia para poder archivarse.' : 'Registra el resultado real de un escenario (comando o manual).',
        submitLabel: 'Registrar evidencia',
        nonce: panelNonce(),
        fields,
      }),
      async (values) => {
        const scenario = values['scenario'] === '__other' ? (values['scenarioOther'] ?? '').trim() : (values['scenario'] ?? '')
        const method = values['method'] === 'manual' ? ('manual' as const) : ('executable' as const)
        const command = method === 'executable' ? (values['command'] ?? '').trim() : undefined
        const notes = method === 'manual' ? (values['notes'] ?? '').trim() : undefined
        const by = (values['by'] ?? '').trim()
        await context.globalState.update('specatlas.by', by)

        const profile = await loadActiveProfile(path.join(root, '.sdd'), [path.join(root, '.sdd', 'profiles', 'custom')])
        const allowed = profile?.verify.executable ?? []
        let allowCommand = false
        if (command && allowed.length > 0 && !allowed.some((prefix) => command.startsWith(prefix))) {
          const confirm = await vscode.window.showWarningMessage(`El comando no está en la lista permitida del perfil (${allowed.join(', ')}). ¿Registrar la evidencia igualmente?`, { modal: true }, 'Registrar')
          if (confirm !== 'Registrar') return
          allowCommand = true
        }

        const record = await recordEvidence({
          root,
          slug: change.slug,
          scenario,
          method,
          by,
          file: isFix ? 'fix' : 'verify',
          allowedPrefixes: allowed,
          allowCommand,
          ...(command !== undefined ? { command } : {}),
          ...(notes !== undefined ? { notes } : {}),
        })
        if (!record.evidence) {
          void vscode.window.showErrorMessage(`SpecAtlas: ${record.diagnostics.map((d) => d.message).join('; ') || 'no se pudo registrar la evidencia'}`)
          return
        }
        const ok = record.evidence.result === 'pass'
        void vscode.window
          .showInformationMessage(`SpecAtlas: evidencia de ${scenario} registrada (${record.evidence.result})${record.evidence.method === 'executable' ? ` · ${record.evidence.method}` : ''}.`, ...(ok ? [] : ['Ver salida']))
          .then(async (action) => {
            if (action === 'Ver salida') {
              output.clear()
              output.appendLine(`Evidencia — ${scenario} (${record.evidence?.result})`)
              if (record.stdout) output.appendLine(record.stdout)
              if (record.stderr) output.appendLine(record.stderr)
              output.show()
            }
          })
        await refresh()
      },
    )
  })

  register('specatlas.packs', async (arg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) return
    const loaded = await loadConfig(path.join(root, '.sdd'))
    if (loaded.config.packs.length === 0) {
      void vscode.window.showInformationMessage('SpecAtlas: no hay packs activos. Actívalos en .sdd/config.yaml → packs: [seguridad, datos, auditoria, accesibilidad].')
      return
    }
    const resolved = await resolvePacks(path.join(root, '.sdd'), loaded.config)
    const parsed = await loadChange(root, change.slug)
    const findings = packFindings(evaluatePacks(resolved.packs, parsed, loaded.config), parsed)
    const errors = findings.filter((f) => f.severity === 'error')
    if (findings.length === 0) {
      void vscode.window.showInformationMessage(`SpecAtlas: los packs activos (${resolved.packs.map((pack) => pack.id).join(', ')}) pasan en ${change.slug}.`)
      return
    }
    output.clear()
    output.appendLine(`Packs — ${change.slug}`)
    output.appendLine('')
    for (const finding of findings) output.appendLine(`  ${finding.severity === 'error' ? 'ERROR' : 'AVISO'} ${finding.code}: ${finding.message}${finding.suggestion ? ` — ${finding.suggestion}` : ''}`)
    const action = await vscode.window.showWarningMessage(`SpecAtlas: packs con ${errors.length} error(es) y ${findings.length - errors.length} aviso(s) en ${change.slug}.`, 'Ver informe')
    if (action === 'Ver informe') output.show()
  })

  register('specatlas.focusNow', async () => {
    await vscode.commands.executeCommand('specatlas.now.focus')
  })

  register('specatlas.focusHealth', async () => {
    await vscode.commands.executeCommand('specatlas.health.focus')
  })

  register('specatlas.drift', async () => {
    const root = workspaceRoot()
    if (!root) return
    const loaded = await loadConfig(path.join(root, '.sdd'))
    const anchors = await loadAllAnchors(root)
    const report = await checkDrift({ root, config: loaded.config, anchors })
    output.clear()
    output.appendLine('Anclas y deriva del código')
    output.appendLine('')
    output.appendLine(`  modo: ${report.mode === 'strict' ? 'estricto (bloquea)' : 'aviso'}`)
    output.appendLine(`  dominios con anclas: ${report.domains}`)
    output.appendLine(`  anclas comprobadas: ${report.checked}`)
    output.appendLine(`  anclas rotas: ${report.drifted.length}`)
    for (const item of report.drifted) {
      output.appendLine(`  ${item.domain} · ${item.requirement} — ${item.anchor} (${item.kind === 'missing-file' ? 'el archivo ya no existe' : 'el símbolo ya no está'})`)
    }
    output.show(true)

    if (report.drifted.length === 0) {
      void vscode.window.showInformationMessage(`SpecAtlas: ${report.checked} ancla(s) al día; las specs vivas y el código siguen de acuerdo.`)
      return
    }
    const choice = await vscode.window.showWarningMessage(
      `SpecAtlas: ${report.drifted.length} ancla(s) apuntan a código que ya no existe.`,
      { modal: false },
      'Depurar anclas rotas',
    )
    if (choice !== 'Depurar anclas rotas') return
    const confirm = await vscode.window.showWarningMessage(
      'Se quitarán las anclas rotas de las specs vivas. Si lo que cambió es el comportamiento, lo que corresponde es especificar un cambio.',
      { modal: true },
      'Depurar',
    )
    if (confirm !== 'Depurar') return
    const pruned = await pruneAnchors(root, report.drifted, anchors, loaded.config.project.language)
    const removed = pruned.reduce((total, entry) => total + entry.removed.length, 0)
    void vscode.window.showInformationMessage(`SpecAtlas: ${removed} ancla(s) retiradas.`)
    await refresh()
  })

  register('specatlas.impact', async (arg?: unknown) => {
    const root = workspaceRoot()
    if (!root) return
    const fromArg = typeof arg === 'string' ? arg : undefined
    const target =
      fromArg ??
      (await vscode.window.showInputBox({
        title: 'SpecAtlas: impacto',
        prompt: 'Requisito (REQ-…) o ruta de archivo',
        value: vscode.window.activeTextEditor ? vscode.workspace.asRelativePath(vscode.window.activeTextEditor.document.uri) : '',
      }))
    if (!target) return

    const { workspace } = await loadWorkspace(root)
    const anchors = await loadAllAnchors(root)
    const report = /^REQ-[A-Z0-9-]+$/i.test(target)
      ? impactOfRequirement(workspace, target.toUpperCase().replace(/-S\d+$/, ''), anchors)
      : impactOfFile(workspace, target, anchors)

    output.clear()
    output.appendLine(`Impacto — ${target}`)
    output.appendLine('')
    if (!report.exists) {
      output.appendLine('  Sin relaciones registradas.')
    } else {
      if (report.requirements.length > 0) output.appendLine(`  requisitos: ${report.requirements.join(', ')}`)
      if (report.changes.length > 0) output.appendLine(`  cambios: ${report.changes.join(', ')}`)
      for (const anchor of report.anchors ?? []) {
        for (const file of anchor.files) output.appendLine(`  ancla: ${anchor.requirement} · ${anchor.domain} — ${file}`)
      }
      for (const task of report.tasks) output.appendLine(`  tarea: ${task.change} · ${task.id} — ${task.text}`)
      for (const evidence of report.evidence) output.appendLine(`  evidencia: ${evidence.scenario} — ${evidence.result}`)
    }
    output.show(true)
  })

  register('specatlas.review', async (arg?: unknown) => {
    const change = selectedChange(arg)
    if (!change) return
    const file = path.join(change.dir, 'review.md')
    const fs = await import('node:fs')
    if (!fs.existsSync(file)) {
      const loaded = await loadConfig(path.join(workspaceRoot() ?? '', '.sdd'))
      const templates = templatesFor(loaded.config.project.language)
      await writeText(file, renderTemplate(templates.review, { TITLE: change.title ?? change.slug, SLUG: change.slug }))
      void vscode.window.showInformationMessage('SpecAtlas: review.md creado. La revisión la hace el agente o una persona.')
    }
    await vscode.window.showTextDocument(vscode.Uri.file(file))
  })

  register('specatlas.explain', async (arg?: unknown) => {
    const fromContext = typeof arg === 'string' && arg.includes(':') ? arg.split(':').slice(1).join(':') : undefined
    const code =
      fromContext ??
      (await vscode.window.showQuickPick(
        listExplanations().map((item) => ({ label: item.code, description: item.title })),
        { title: 'SpecAtlas: explicar un código', placeHolder: 'Elige el código del hallazgo' },
      ))?.label
    if (!code) return
    const { explanation, family } = explainDiagnostic(code)
    const lines = explanation
      ? [`**${explanation.code}** — ${explanation.title}`, '', `**Por qué importa:** ${explanation.why}`, '', `**Cómo se cierra:** ${explanation.fix}`]
      : [`**${code}**`, '', `Sin ficha propia; pertenece a la familia ${family?.prefix ?? '—'}.`]
    if (family) lines.push('', `_${family.title}: ${family.description}_`)
    output.clear()
    output.appendLine(lines.join('\n').replace(/\*\*/g, ''))
    output.show(true)
  })

  register('specatlas.adopt', async () => {
    const root = workspaceRoot()
    if (!root) return
    await runInTerminal('satlas adopt', root)
  })

  register('specatlas.watch', async () => {
    const root = workspaceRoot()
    if (!root) return
    await runInTerminal('satlas watch', root)
  })

  register('specatlas.ci', async () => {
    const root = workspaceRoot()
    if (!root) return
    const loaded = await loadConfig(path.join(root, '.sdd'))
    const extra: CiExtraCheck[] = []
    const fs = await import('node:fs')
    const workflowDir = context.asAbsolutePath('workflow')
    if (fs.existsSync(path.join(workflowDir, 'phases'))) {
      const health = await checkAdapters({ root, workflowDir, targets: loaded.config.adapters.targets, language: loaded.config.project.language })
      extra.push({
        name: 'adaptadores',
        diagnostics:
          health.manifest && !health.ok
            ? [{ code: 'ATLAS-ADAPTERS-001', severity: 'warning', message: 'Los adaptadores de agente están desactualizados respecto a workflow/', suggestion: 'Ejecuta «Compilar adaptadores»' }]
            : [],
      })
    }
    const gate = await runCiGate({ root, extra })
    output.clear()
    output.appendLine('CI de SpecAtlas')
    output.appendLine('')
    for (const check of gate.checks) output.appendLine(`  ${check.errors === 0 && check.warnings === 0 ? 'OK  ' : 'FALLA'} ${check.name}: ${check.errors} errores, ${check.warnings} avisos`)
    output.appendLine('')
    output.appendLine(gate.failed ? 'Resultado: BLOQUEADO' : 'Resultado: OK')
    if (gate.diagnostics.length > 0) {
      output.appendLine('')
      for (const diagnostic of gate.diagnostics) output.appendLine(`  ${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`)
    }
    if (gate.failed) {
      const action = await vscode.window.showErrorMessage(`SpecAtlas CI: BLOQUEADO (${gate.errors} error(es), ${gate.warnings} aviso(s)).`, 'Ver informe')
      if (action === 'Ver informe') output.show()
    } else {
      void vscode.window.showInformationMessage(`SpecAtlas CI: OK${gate.warnings > 0 ? ` (${gate.warnings} aviso(s))` : ''}.`)
    }
    await refresh()
  })

  register('specatlas.approve', async (arg?: unknown) => {
    const root = workspaceRoot()
    const change = selectedChange(arg)
    if (!root || !change) return
    const required = await ensureMockupsDecision(change)
    if (required === undefined) return
    if (required && (await mockupGateBlocked(change))) {
      void vscode.window.showErrorMessage(`SpecAtlas: "${change.slug}" exige mockups (meta.yaml: mockups: required) y no están listos. Genera el contrato visual con /satlas-mockup ${change.slug} y vuelve a aprobar.`)
      return
    }
    const name = await vscode.window.showInputBox({ title: 'Aprobar spec', prompt: 'Nombre de quien aprueba (queda auditado con hash y fecha)' })
    if (!name) return
    const result = await signApproval({ root, artifact: path.posix.join('changes', change.slug, 'spec.md'), by: name, channel: 'editor' })
    if (result.approval) {
      const hasPresentation = change.files.some((file) => file.kind === 'presentation' && file.exists)
      let extra = ''
      if (hasPresentation) {
        const regenerated = await generatePresentation({ root, slug: change.slug })
        extra = regenerated.path ? ' La presentación se regeneró con la firma.' : ''
      }
      void vscode.window.showInformationMessage(`SpecAtlas: spec de ${change.slug} aprobada por ${name}.${extra}`)
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
    let result: Awaited<ReturnType<typeof archiveChange>>
    try {
      result = await archiveChange({ root, slug: change.slug })
    } catch (error) {
      void vscode.window.showErrorMessage(
        `SpecAtlas: no se pudo archivar ${change.slug}: ${(error as Error).message}. Cierra las pestañas con archivos de este cambio (y espera si OneDrive está sincronizando) y reintenta.`,
      )
      return
    }
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
      openLivePanel({
        key: `preview:${target}`,
        viewType: 'specatlas.preview',
        title: path.basename(target),
        viewColumn: vscode.ViewColumn.Beside,
        options: {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(path.dirname(target))],
        },
        build: async (panel) => ({ html: await rewriteLocalHtml(panel, target) }),
      })
      return
    }
    if (target.endsWith('.md')) {
      const insideSdd = target.includes(`${path.sep}.sdd${path.sep}`)
      if (!insideSdd) {
        try {
          await vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(target))
          return
        } catch {
          // continúa con la vista previa propia
        }
      }
      {
        const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media')
        openLivePanel({
          key: `preview:${target}`,
          viewType: 'specatlas.preview',
          title: path.basename(target),
          viewColumn: vscode.ViewColumn.Beside,
          options: { enableScripts: true, localResourceRoots: [mediaRoot] },
          build: async (panel) => {
            const content = await readTextIfExists(target)
            if (content === undefined) return undefined
            const mermaidAsset = vscode.Uri.joinPath(mediaRoot, 'mermaid.min.js')
            let mermaidUri: string | undefined
            try {
              await vscode.workspace.fs.stat(mermaidAsset)
              mermaidUri = panel.webview.asWebviewUri(mermaidAsset).toString()
            } catch {
              mermaidUri = undefined
            }
            return {
              html: previewHtml(path.basename(target), content, {
                cspSource: panel.webview.cspSource,
                nonce: panelNonce(),
                ...(mermaidUri ? { mermaidUri } : {}),
              }),
            }
          },
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

    // La fase del agente abre el asistente configurado en el proyecto.
    if (change.requiresAgent || command.startsWith('/')) {
      await openOpencode(command)
      return
    }

    // Lo que firma una persona no se dispara solo: se abre su comando y se avisa.
    const human = /^satlas (approve|archive|amend|pause|resume)/.exec(command)
    if (human) {
      const mapping: Record<string, string> = { approve: 'specatlas.approve', archive: 'specatlas.archive' }
      const target = mapping[human[1] ?? '']
      if (target) {
        await vscode.commands.executeCommand(target, change.slug)
        return
      }
      await vscode.env.clipboard.writeText(command)
      void vscode.window.showInformationMessage(`SpecAtlas: «${command}» la firma una persona; el comando quedó copiado.`)
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
      verify: 'specatlas.verify',
      review: 'specatlas.review',
      packs: 'specatlas.packs',
      mockup: 'specatlas.mockup.open',
      ci: 'specatlas.ci',
      drift: 'specatlas.drift',
    }
    const target = mapping[sub]
    if (target) {
      await vscode.commands.executeCommand(target, change.slug)
      return
    }
    const root = workspaceRoot()
    if (root) {
      await runInTerminal(command, root)
      return
    }
    await vscode.env.clipboard.writeText(command)
    void vscode.window.showInformationMessage(`SpecAtlas: copiado "${command}" — ejecútalo en la terminal.`)
  })

  const wiredPanels = new WeakSet<vscode.WebviewPanel>()

  const handlePanelMessage = async (panel: vscode.WebviewPanel, message: { type?: string; value?: string; step?: string }): Promise<void> => {
    if (message.type === 'run-step') {
      const change = selectedChange(message.value)
      if (!change || !message.step) return
      const instruction = instructionForStep(change, message.step)
      if (instruction) await openOpencode(instruction)
      return
    }
    if (message.type === 'copy-command' && message.value) {
      await vscode.env.clipboard.writeText(message.value)
      void vscode.window.showInformationMessage(`SpecAtlas: copiado "${message.value}"`)
      return
    }
    if (message.type === 'open-artifact') {
      const change = selectedChange(message.value)
      const file = change?.files.find((item) => item.kind === message.value)
      if (change && file?.exists) await vscode.commands.executeCommand('specatlas.openPreview', file.path, change.slug, file.kind)
      return
    }
    if (message.type === 'mockup-html' && message.value) {
      const root = workspaceRoot()
      const target = path.resolve(message.value)
      if (!root || !target.toLowerCase().startsWith(path.resolve(root).toLowerCase())) return
      const content = await readTextIfExists(target)
      if (content === undefined) return
      await panel.webview.postMessage({ type: 'mockup-html', value: message.value, data: Buffer.from(content, 'utf8').toString('base64') })
    }
  }

  register('specatlas.panel', async (arg?: unknown) => {
    const root = workspaceRoot()
    const section = isPanelSection(arg) ? arg : 'resumen'
    const panel = openLivePanel({
      key: PANEL_KEY,
      viewType: PANEL_VIEW_TYPE,
      title: PANEL_TITLE,
      viewColumn: vscode.ViewColumn.Active,
      options: {
        enableScripts: true,
        enableCommandUris: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri, ...(root ? [vscode.Uri.file(root)] : [])],
      },
      build: async (panel) => {
        if (!root) return { title: PANEL_TITLE, html: panelNotice('no-workspace', 'Abre una carpeta con SpecAtlas inicializado para ver el panel principal.') }
        const model = await buildPanelModel(root)
        if (!model) return { title: PANEL_TITLE, html: panelNotice('not-initialized', 'Inicializar crea .sdd/ y los comandos del agente; después el panel muestra el estado real.') }
        const mermaidUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'mermaid.min.js')).toString()
        const resources: PanelResources = {}
        const change = model.change
        if (change) {
          const presentation = change.files.find((file) => file.kind === 'presentation' && file.exists)
          if (presentation) {
            const raw = await readTextIfExists(presentation.path)
            if (raw !== undefined) resources.presentationBase64 = Buffer.from(raw, 'utf8').toString('base64')
          }
          const mockupFile = change.files.find((file) => file.kind === 'mockup' && file.exists)
          if (mockupFile && mockupFile.screens && mockupFile.screens.length > 0) {
            resources.mockups = []
            for (const [index, screen] of mockupFile.screens.entries()) {
              const screenPath = pathForScreen(change, screen)
              const entry: { file: string; title: string; path: string; base64?: string } = { file: screen.file, title: screen.title, path: screenPath }
              if (index === 0) {
                const rawScreen = await readTextIfExists(screenPath)
                if (rawScreen !== undefined) entry.base64 = Buffer.from(rawScreen, 'utf8').toString('base64')
              }
              resources.mockups.push(entry)
            }
          }
        }
        return { title: `${PANEL_TITLE} — ${model.snapshot.projectName}`, html: renderPanelHtml(model, section, panelNonce(), { mermaidUri, cspSource: panel.webview.cspSource, resources }) }
      },
    })
    if (!wiredPanels.has(panel)) {
      wiredPanels.add(panel)
      panel.webview.onDidReceiveMessage((message: { type?: string; value?: string; step?: string }) => {
        void handlePanelMessage(panel, message)
      })
    }
    void panel.webview.postMessage({ type: 'show-section', value: section })
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
    linked: fsx.linkedTraceInput(workspace),
  })
  return { summary: result.summary, findings: result.findings }
}

function providerSnapshot(provider: AtlasTreeProvider): SnapshotChange[] {
  return provider.changes()
}
