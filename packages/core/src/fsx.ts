import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function isDirectory(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p)
    return st.isDirectory()
  } catch {
    return false
  }
}

export async function readText(p: string): Promise<string> {
  return fs.readFile(p, 'utf8')
}

export async function readTextIfExists(p: string): Promise<string | undefined> {
  try {
    return await fs.readFile(p, 'utf8')
  } catch {
    return undefined
  }
}

export async function writeText(p: string, content: string): Promise<void> {
  await ensureDir(path.dirname(p))
  await fs.writeFile(p, content, 'utf8')
}

export async function writeBytes(p: string, content: Uint8Array): Promise<void> {
  await ensureDir(path.dirname(p))
  await fs.writeFile(p, content)
}

export async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

export async function copyFile(from: string, to: string): Promise<void> {
  await ensureDir(path.dirname(to))
  await fs.copyFile(from, to)
}

export async function listDir(p: string): Promise<string[]> {
  try {
    return await fs.readdir(p)
  } catch {
    return []
  }
}

export async function listDirs(p: string): Promise<string[]> {
  const entries = await listDir(p)
  const out: string[] = []
  for (const e of entries) {
    if (await isDirectory(path.join(p, e))) out.push(e)
  }
  return out.sort()
}

export interface WalkEntry {
  path: string
  name: string
}

export async function walkFiles(root: string, opts: { skipDirs?: string[] } = {}): Promise<WalkEntry[]> {
  const skip = new Set(opts.skipDirs ?? ['node_modules', '.git', 'dist', 'coverage', '.sdd'])
  const out: WalkEntry[] = []
  async function rec(dir: string): Promise<void> {
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (skip.has(e.name)) continue
        await rec(path.join(dir, e.name))
      } else if (e.isFile()) {
        out.push({ path: path.join(dir, e.name), name: e.name })
      }
    }
  }
  await rec(root)
  return out
}

export function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}
