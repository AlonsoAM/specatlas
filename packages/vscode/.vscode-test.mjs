import { defineConfig } from '@vscode/test-cli'

// Pruebas que arrancan VS Code de verdad: comprueban que la extensión activa,
// que sus comandos existen y que sus vistas y tareas están declaradas. La
// lógica se prueba aparte con vitest; esto cubre lo que solo se ve en el editor.
export default defineConfig({
  label: 'integracion',
  files: 'test-integracion/suite/**/*.test.cjs',
  workspaceFolder: './test-integracion/proyecto',
  version: 'stable',
  mocha: { timeout: 60_000, ui: 'bdd' },
  launchArgs: ['--disable-extensions', '--disable-gpu'],
})
