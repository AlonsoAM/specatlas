import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node20',
    clean: true,
    dts: true,
  },
  {
    entry: { server: 'src/server.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node20',
    clean: false,
    dts: false,
  },
])
