import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderDocument } from '../packages/render/src/index'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'docs', 'tutorial', 'TUTORIAL.md')
const outDir = path.join(root, 'docs', 'tutorial')

async function main(): Promise<void> {
  const markdown = await fs.readFile(source, 'utf8')

  let mermaidUri: string | undefined
  const mermaidSource = path.join(root, 'packages', 'vscode', 'media', 'mermaid.min.js')
  try {
    await fs.access(mermaidSource)
    await fs.copyFile(mermaidSource, path.join(outDir, 'mermaid.min.js'))
    mermaidUri = 'mermaid.min.js'
  } catch {
    mermaidUri = undefined
  }

  const html = renderDocument(markdown, {
    title: 'Tutorial de SpecAtlas',
    description: 'Tutorial completo de SpecAtlas: Spec-Driven Development de principio a fin',
    theme: 'auto',
    toc: true,
    tocTitle: 'Índice',
    highlight: true,
    mermaid: mermaidUri ? 'script' : 'code',
    ...(mermaidUri ? { mermaidScriptUri: mermaidUri } : {}),
  })

  await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8')
  console.log(`docs/tutorial/index.html generado (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB${mermaidUri ? ', con mermaid' : ''})`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
