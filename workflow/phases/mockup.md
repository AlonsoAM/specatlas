---
id: mockup
title: Mockups
description: >-
  Genera mockups profesionales (web/mobile) como contrato visual de la propuesta: alta fidelidad, estados, responsive y accesibles.
  Usar cuando el usuario pide mockups, prototipos visuales o la propuesta visual del cambio.
requires:
  - changes/<slug>/spec.md
produces:
  - changes/<slug>/mockups/*.html
arguments: true
agent:
  mode: primary
---

# Fase: Mockups (contrato visual)

El contenido se escribe en **{{LANGUAGE_NAME}}**.

## Pasos

1. Prepara el plan y el manifiesto:

```
satlas mockup {{SLUG}}
```

2. Lee el plan (`changes/{{SLUG}}/mockups/plan.yaml`), la spec, el glosario y, si existen, `design/tokens.json` o `DESIGN.md` (sistema de diseño del proyecto).
3. Genera **un HTML autocontenido por pantalla** (`changes/{{SLUG}}/mockups/<id>.html`) con calidad de producto:
   - banner fijo visible: `MOCKUP · NO FUNCIONAL · vX · fecha`;
   - datos reales del dominio (prohibido Lorem ipsum, "Item 1" o textos de relleno);
   - estados completos conmutables (`data-state`): default, loading, vacío, error; en mobile también offline;
   - responsive real (390 / 768 / 1440) y tema claro/oscuro si el proyecto lo define;
   - accesibilidad: contraste AA, foco visible, áreas táctiles ≥ 44 px, jerarquía semántica;
   - navegación entre pantallas con enlaces relativos entre archivos;
   - sin recursos externos: sin CDN, sin fuentes remotas, sin `http(s)://`; embebe lo necesario.
4. Valida y corrige hasta que no haya errores:

```
satlas mockup {{SLUG}} --check
```

5. Opcional (si hay Playwright instalado): captura de pantallas por breakpoint.

```
satlas mockup {{SLUG}} --capture
```

6. Reporta las pantallas generadas, los escenarios que ilustra cada una y el resultado de la validación.

## Prohibido

- Aprobar mockups sin estados ni responsive, o que no sigan los tokens del proyecto cuando existen.
- Añadir lógica real o datos personales reales en el mockup.
