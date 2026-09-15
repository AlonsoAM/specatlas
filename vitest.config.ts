import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@specatlas/core': path.join(root, 'packages/core/src/index.ts'),
      '@specatlas/render': path.join(root, 'packages/render/src/index.ts'),
      '@specatlas/adapters': path.join(root, 'packages/adapters/src/index.ts'),
      '@specatlas/lsp': path.join(root, 'packages/lsp/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
  },
})
