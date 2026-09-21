# @specatlas/render

Renderizador de documentos de [SpecAtlas](https://github.com/AlonsoAM/specatlas): markdown con código resaltado, diagramas mermaid, tokens de diseño y salida a HTML autocontenido o PDF generado localmente (sin servicios externos).

```bash
npm i @specatlas/render
```

```ts
import { renderDocument, renderPdf } from '@specatlas/render'

const html = renderDocument(markdown, { theme: 'auto', title: 'Documentación técnica' })
const pdf = await renderPdf(markdown, { title: 'Manual de usuario', project: 'Mi proyecto' })
```

Lo usan la extensión de VS Code, la propuesta para el stakeholder y la documentación del cambio.

MIT © SpecAtlas
