# Identidad de SpecAtlas

## La marca

**SpecAtlas** = *spec* (especificación) + *atlas* (mapa). La metáfora central: las specs son un **mapa** del sistema, y cada requisito es una **ruta trazable** desde la intención hasta la evidencia.

El símbolo combina:

- un **rombo** (hoja de mapa / brújula) que representa el atlas;
- una **ruta con tres nodos** que representa la trazabilidad: requisito → tarea → evidencia.

| Activo | Archivo | Uso |
|---|---|---|
| Símbolo monocromo | `packages/vscode/media/atlas.svg` | barra de actividad de VS Code, favicon, contextos de un solo color |
| Logotipo completo (SVG) | `packages/vscode/media/atlas-logo.svg` | README, presentaciones, documentación |
| Logotipo completo (PNG) | `packages/vscode/media/logo.png` | README del Marketplace (no admite SVG) |
| Icono de aplicación | `packages/vscode/media/icon.png` | Marketplace, `.vsix`, avatares |

## Paleta

| Color | Hex | Rol |
|---|---|---|
| Deep Teal | `#14B8A6` | inicio del degradado, acento de éxito |
| Signal Blue | `#2563EB` | centro del degradado, acento principal |
| Violet | `#7C3AED` | fin del degradado, énfasis |
| Ink | `#0F172A` | texto y fondo del símbolo |
| Slate | `#64748B` | texto secundario |
| Mist | `#F8FAFC` | fondo claro |

En la interfaz, SpecAtlas **hereda los colores del tema del editor** (variables `--vscode-charts-*` y `--vscode-*`) para no romper la coherencia visual de VS Code. La paleta de marca se usa en el degradado del hero, el logotipo y el icono.

## Tipografía

- Interfaz: la del sistema / VS Code (`--vscode-font-family`).
- Código y monospace: `--vscode-editor-font-family`.
- Logotipo: sans-serif del sistema con peso 700 y tracking negativo; el sufijo “Atlas” va en degradado.

## Uso

- No deformar, rotar ni recolorear el símbolo fuera de los colores del tema.
- Espacio libre mínimo: el alto del rombo / 2 alrededor del logotipo.
- El símbolo monocromo debe mantener el rombo al 50 % de opacidad y los nodos rellenos.
- Tamaño mínimo del símbolo: 16 px (barra de actividad). Del logotipo: 120 px de ancho.

## Voz

- Directa, profesional y en español por defecto.
- Habla de **intención, evidencia y gates**, no de “magia de IA”.
- Regla de oro: **el proceso se verifica, no se confía**.
