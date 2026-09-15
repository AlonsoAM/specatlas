import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { bin: 'src/bin.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [/^@specatlas\//],
})
