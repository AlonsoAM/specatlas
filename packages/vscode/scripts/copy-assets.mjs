import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(here, '..')

async function copyMermaid() {
  const target = path.join(packageRoot, 'media', 'mermaid.min.js')
  const candidates = [path.join(packageRoot, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')]
  for (const candidate of candidates) {
    try {
      await stat(candidate)
      await mkdir(path.dirname(target), { recursive: true })
      await copyFile(candidate, target)
      console.log('mermaid.min.js copiado a media/')
      return
    } catch {
      // siguiente candidato
    }
  }
  console.log('mermaid no está instalado: los diagramas se mostrarán como código (sin script de render)')
}

async function copyProfiles() {
  const source = path.resolve(packageRoot, '..', '..', 'profiles')
  const targetDir = path.join(packageRoot, 'media', 'profiles')
  try {
    await stat(source)
  } catch {
    console.log('profiles/ no encontrado: la extensión inicializará sin detección de stack')
    return
  }
  await mkdir(targetDir, { recursive: true })
  const entries = await readdir(source)
  let copied = 0
  for (const entry of entries) {
    if (!/\.ya?ml$/i.test(entry)) continue
    await copyFile(path.join(source, entry), path.join(targetDir, entry))
    copied += 1
  }
  console.log(`${copied} perfil(es) copiados a media/profiles/`)
}

await copyMermaid()
await copyProfiles()
