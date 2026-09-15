import { createHash } from 'node:crypto'

/**
 * Canonicaliza markdown para hashing estable entre sistemas:
 * - EOL siempre \n (clave en Windows)
 * - sin BOM
 * - sin espacios finales de línea
 * - máximo una línea vacía consecutiva
 * - sin líneas vacías al inicio o al final
 */
export function canonicalizeMarkdown(md: string): string {
  let text = md
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let blankRun = 0
  for (const line of lines) {
    const trimmedEnd = line.replace(/[ \t]+$/g, '')
    if (trimmedEnd.trim() === '') {
      blankRun += 1
      if (blankRun > 1) continue
      out.push('')
    } else {
      blankRun = 0
      out.push(trimmedEnd)
    }
  }
  while (out.length > 0 && out[0] === '') out.shift()
  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return out.join('\n') + '\n'
}

export function sha256(content: string | Uint8Array): string {
  const h = createHash('sha256')
  h.update(content)
  return `sha256:${h.digest('hex')}`
}

export function artifactHash(markdown: string): string {
  return sha256(canonicalizeMarkdown(markdown))
}

export function shortHash(hash: string): string {
  return hash.replace(/^sha256:/, '').slice(0, 8)
}
