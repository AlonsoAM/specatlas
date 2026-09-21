# Publicar SpecAtlas

## Requisitos previos (una vez)

| Recurso | Qué crear | Credencial |
|---|---|---|
| npm | Organización `specatlas` (paquetes con scope `@specatlas`) | **Trusted publishing (OIDC)** — sin secretos; ver abajo |
| VS Code Marketplace | Publisher `specatlas` (Azure DevOps PAT con *Marketplace → Manage*) | `VSCE_PAT` |
| Open VSX | Namespace `specatlas` + **Publisher Agreement** de Eclipse Foundation (perfil de Open VSX → *Log in with Eclipse* → *Show Publisher Agreement* → *Agree*; no es la ECA) | `OVSX_PAT` |

### Publicar en npm sin tokens (trusted publishing)

npm emite la credencial en el momento de publicar a partir de la identidad del workflow (OIDC): no hay token que rotar ni que se pueda filtrar. El job `npm` de `release.yml` ya declara `id-token: write` y actualiza el CLI (el intercambio exige npm ≥ 11.5.1).

**Hay que declararlo una vez por paquete** en npmjs.com — son cinco: `specatlas`, `@specatlas/core`, `@specatlas/render`, `@specatlas/adapters`, `@specatlas/lsp`.

1. npmjs.com → el paquete → **Settings** → sección **Trusted Publisher** → botón **GitHub Actions**.
2. Rellenar:
   - *Organization or user*: `AlonsoAM`
   - *Repository*: `specatlas`
   - *Workflow filename*: `release.yml`
   - *Environment*: vacío
3. **Permisos de la configuración**: cada una nace con `allow-stage-publish` (encolar) y **sin** `allow-publish` (publicar directo). Con el default, `npm publish` responde `403 — OIDC permission denied for this action`; el workflow lo detecta y encola la versión con `npm stage publish`, dejando un aviso en el resumen del job. Si quieres que el release quede publicado sin intervención, activa la publicación directa en la configuración del paquete. Para aprobar lo encolado:

```bash
npm stage list                        # versiones en cola
npm stage approve <stage-id> --otp <código>
npm stage reject <stage-id>           # descartar
```

> Los subcomandos `npm stage` exigen **npm ≥ 11.15**; con uno anterior responde `Unknown command: "stage"`. Actualiza con `npm i -g npm@latest` o aprueba desde la ficha del paquete en npmjs.com. El id de la versión encolada aparece en el log del release (`staged with id …`) y en el resumen del job.

Con OIDC, npm además **firma la procedencia** de cada publicación (attestation verificable desde la ficha del paquete).

> `NPM_TOKEN` sigue funcionando como respaldo: si el job no tiene OIDC disponible, usa el secreto. Un token de tipo *granular* con alcance **Read and write (stage only)** deja que el pipeline encole versiones sin poder publicarlas directamente.

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

## Si el release termina en verde y no publicó nada

Ya pasó (v0.1.33 a v0.1.41): los pasos usaban `if: ${{ env.NPM_TOKEN != '' }}` y **GitHub enmascara los secretos en las expresiones `if`**, así que la condición era siempre falsa y el paso se saltaba sin ruido. La comprobación de credenciales vive ahora dentro del script. Al revisar un release, mira que el paso diga *«Publicando con…»* y no *«no se publica»*:

```bash
gh api repos/AlonsoAM/specatlas/actions/runs/<run-id>/jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
gh run view <run-id> --log --job <job-id> | grep -iE "publicando|no se publica|ya está publicado"
```

Y confirma en el registro, no en el log:

```bash
curl -s https://registry.npmjs.org/specatlas | python -c "import json,sys; print(json.load(sys.stdin)['dist-tags']['latest'])"
curl -s -o /dev/null -w '%{http_code}
' https://open-vsx.org/api/specatlas/specatlas-vscode/<version>
```

## Notas

- El CLI **bundlea** `@specatlas/core` y `@specatlas/adapters` en `dist/`, pero los declara como dependencias: publica siempre `core`/`render`/`adapters` antes que `specatlas`.
- El paquete del CLI publica también `workflow/` y `profiles/` (el script `prepack` los copia desde la raíz del repo); la extensión publica `workflow/` (lo copia `scripts/copy-assets.mjs` en `build`). Sin ellos no se generan los comandos del agente.
- La extensión no se publica en npm; solo `.vsix` (Marketplace + Open VSX).
- `packages/vscode/README.md` no admite SVG (restricción de `vsce`); usa `media/logo.png` (las rutas base del monorepo las fijan los scripts `package`/`publish:vsce`).
- Publicar en Open VSX exige firmar el **Publisher Agreement** desde el perfil de Open VSX (vinculando la cuenta Eclipse); la ECA no aplica.
- Los `.vsix` y `.tgz` no se versionan (están en `.gitignore`).
- La numeración de las etiquetas del repositorio es **independiente** de la versión de los paquetes: `v0.1.42` publicó `specatlas@0.1.33`.
- Los paquetes npm publican su propio `README.md` (npm lo incluye siempre, aunque `files` no lo liste); sin él la ficha del paquete sale vacía.
