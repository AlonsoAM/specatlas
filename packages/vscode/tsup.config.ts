import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    extension: 'src/extension.ts',
    server: 'src/server-entry.ts',
  },
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  external: ['vscode'],
  noExternal: ['@specatlas/core', '@specatlas/adapters', '@specatlas/lsp', '@specatlas/render', 'vscode-languageclient', 'vscode-languageserver', 'vscode-languageserver-textdocument'],
})
