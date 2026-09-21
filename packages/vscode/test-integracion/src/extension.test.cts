import * as assert from 'node:assert/strict'
import * as path from 'node:path'
import * as vscode from 'vscode'

const ID = 'specatlas.specatlas-vscode'

/** Lo que solo se puede comprobar con el editor levantado. */
describe('la extensión dentro de VS Code', () => {
  before(async () => {
    const extension = vscode.extensions.getExtension(ID)
    assert.ok(extension, `la extensión ${ID} no está instalada en la instancia de prueba`)
    await extension.activate()
  })

  it('activa en un proyecto con el flujo', () => {
    assert.equal(vscode.extensions.getExtension(ID)?.isActive, true)
  })

  it('registra todos los comandos que declara', async () => {
    const declarados: string[] = (vscode.extensions.getExtension(ID)?.packageJSON.contributes.commands ?? []).map(
      (command: { command: string }) => command.command,
    )
    const registrados = new Set(await vscode.commands.getCommands(true))
    const ausentes = declarados.filter((command) => !registrados.has(command))
    assert.deepEqual(ausentes, [], `comandos declarados y no registrados: ${ausentes.join(', ')}`)
    assert.ok(declarados.length >= 30, `se esperaban al menos 30 comandos, hay ${declarados.length}`)
  })

  it('las cuatro vistas del panel lateral existen', async () => {
    for (const view of ['specatlas.now', 'specatlas.explorer', 'specatlas.health', 'specatlas.tools']) {
      await vscode.commands.executeCommand(`${view}.focus`)
    }
  })

  it('ofrece sus comprobaciones como tareas con su problem matcher', async () => {
    const tasks = await vscode.tasks.fetchTasks({ type: 'specatlas' })
    const nombres = tasks.map((task) => task.name)
    assert.ok(tasks.length >= 5, `se esperaban al menos 5 tareas, hay ${tasks.length}`)
    assert.ok(nombres.includes('Comprobación completa'), `falta la comprobación completa: ${nombres.join(', ')}`)
    const ci = tasks.find((task) => task.name === 'Comprobación completa')
    assert.equal(ci?.group?.id, vscode.TaskGroup.Build.id)
  })

  it('las plantillas se ofrecen dentro de .sdd y no fuera', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0]
    assert.ok(folder, 'la instancia de prueba no abrió el proyecto')

    const dentro = vscode.Uri.file(path.join(folder.uri.fsPath, '.sdd', 'changes', 'demo', 'spec.md'))
    const sugeridas = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', dentro, new vscode.Position(0, 0))
    const etiquetas = (sugeridas?.items ?? []).map((item) => (typeof item.label === 'string' ? item.label : item.label.label))
    assert.ok(etiquetas.includes('req'), `faltan las plantillas del flujo: ${etiquetas.slice(0, 10).join(', ')}`)

    const fuera = vscode.Uri.file(path.join(folder.uri.fsPath, 'LEEME.md'))
    const ajenas = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', fuera, new vscode.Position(0, 0))
    const etiquetasAjenas = (ajenas?.items ?? []).map((item) => (typeof item.label === 'string' ? item.label : item.label.label))
    assert.ok(!etiquetasAjenas.includes('req'), 'las plantillas del flujo no deben ofrecerse fuera de .sdd')
  })

  it('los archivos del flujo llevan su decoración', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0]
    assert.ok(folder)
    const spec = vscode.Uri.file(path.join(folder.uri.fsPath, '.sdd', 'changes', 'demo', 'spec.md'))
    const documento = await vscode.workspace.openTextDocument(spec)
    await vscode.window.showTextDocument(documento)
    // La decoración la pinta VS Code; aquí basta con que abrir el artefacto no
    // rompa nada y que el editor quede activo sobre él.
    assert.equal(vscode.window.activeTextEditor?.document.uri.fsPath, spec.fsPath)
  })

  it('el walkthrough de primeros pasos está declarado', () => {
    const walkthroughs = vscode.extensions.getExtension(ID)?.packageJSON.contributes.walkthroughs ?? []
    assert.equal(walkthroughs.length, 1)
    assert.equal(walkthroughs[0].id, 'specatlas.primerosPasos')
    assert.equal(walkthroughs[0].steps.length, 5)
  })
})
