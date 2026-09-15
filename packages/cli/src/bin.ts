import { main } from './cli.js'

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.stack ?? err.message : String(err)
    process.stderr.write(`satlas: error inesperado\n${message}\n`)
    process.exitCode = 3
  })
