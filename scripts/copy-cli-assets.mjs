import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assets = ['workflow', 'profiles']

for (const name of assets) {
  const from = path.join(root, name)
  const to = path.join(root, 'packages', 'cli', name)
  if (!existsSync(from)) {
    console.error(`[copy-cli-assets] falta ${from}`)
    process.exitCode = 1
    continue
  }
  rmSync(to, { recursive: true, force: true })
  mkdirSync(path.dirname(to), { recursive: true })
  cpSync(from, to, { recursive: true })
  console.log(`[copy-cli-assets] ${name} -> packages/cli/${name}`)
}
