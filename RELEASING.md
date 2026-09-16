# Publicar SpecAtlas

## Requisitos previos (una vez)

| Recurso | Qué crear | Token / secreto |
|---|---|---|
| npm | Organización `specatlas` (paquetes con scope `@specatlas`) | `NPM_TOKEN` (automation, con permiso de publicación) |
| VS Code Marketplace | Publisher `specatlas` (Azure DevOps PAT con *Marketplace → Manage*) | `VSCE_PAT` |
| Open VSX | Namespace `specatlas` + **Publisher Agreement** de Eclipse Foundation (perfil de Open VSX → *Log in with Eclipse* → *Show Publisher Agreement* → *Agree*; no es la ECA) | `OVSX_PAT` |

Los paquetes npm se publican con **pnpm** (reescribe `workspace:*` a la versión real). Orden topológico obligatorio: `@specatlas/render` → `@specatlas/core` → `@specatlas/adapters` → `@specatlas/lsp` → `specatlas`.

## Checklist de release

```bash
# 1. Calidad
pnpm install
pnpm -r typecheck
pnpm test
pnpm -r build

# 2. Versiones y changelog
#    subir "version" en packages/{core,render,adapters,lsp,cli}/package.json
#    y packages/vscode/package.json; anotar en CHANGELOG.md

# 3. Verificar el artefacto del CLI antes de publicar
node packages/cli/dist/bin.js version
node packages/cli/dist/bin.js --help

# 4. Publicar librerías y CLI (topológico)
pnpm -r --filter './packages/core' --filter './packages/render' --filter './packages/adapters' --filter './packages/lsp' --filter './packages/cli' publish --access public --no-git-checks

# 5. Extensión (los scripts ya fijan las rutas base del monorepo)
pnpm --filter specatlas-vscode build
pnpm --filter specatlas-vscode run package
pnpm --filter specatlas-vscode exec vsce publish --packagePath specatlas-vscode-0.0.10.vsix -p "$VSCE_PAT"
pnpm --filter specatlas-vscode exec ovsx publish specatlas-vscode-0.0.10.vsix -p "$OVSX_PAT"

# 6. Etiquetar
git tag v0.1.0 && git push --tags
```

El workflow `.github/workflows/release.yml` ejecuta los pasos 1, 4 y 5 automáticamente al empujar una etiqueta `v*` (omite los pasos cuyo token no esté configurado y **salta versiones ya publicadas** en npm, Marketplace u Open VSX).

## Verificación post-publicación

```bash
npx specatlas@latest version
npx specatlas@latest init --name prueba-en-vacio
code --install-extension specatlas.specatlas-vscode
```

## Notas

- El CLI **bundlea** `@specatlas/core` y `@specatlas/adapters` en `dist/`, pero los declara como dependencias: publica siempre `core`/`render`/`adapters` antes que `specatlas`.
- La extensión no se publica en npm; solo `.vsix` (Marketplace + Open VSX).
- `packages/vscode/README.md` no admite SVG (restricción de `vsce`); usa `media/logo.png` (las rutas base del monorepo las fijan los scripts `package`/`publish:vsce`).
- Publicar en Open VSX exige firmar el **Publisher Agreement** desde el perfil de Open VSX (vinculando la cuenta Eclipse); la ECA no aplica.
- Los `.vsix` y `.tgz` no se versionan (están en `.gitignore`).
