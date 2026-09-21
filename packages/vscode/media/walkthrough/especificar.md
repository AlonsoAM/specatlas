## Especificar en lenguaje de negocio

La especificación se escribe para quien usa el sistema, no para quien lo programa: **qué** y **por qué**, nunca **cómo**. Lo técnico vive en el plan, que cambia sin volver a firmar nada.

Cada requisito declara sus reglas y sus escenarios, y cada escenario tiene un resultado observable:

```markdown
### Requisito: REQ-VENTAS-001 — Devolver un pedido recibido
El comprador recupera su dinero sin llamar a atención al cliente.

- Regla BR-VENTAS-001: la devolución se acepta dentro de los 30 días desde la entrega

#### Escenario: REQ-VENTAS-001-S1 — Devolución dentro del plazo
- **CUANDO** el comprador solicita devolver un pedido entregado hace 10 días
- **ENTONCES** la solicitud queda aceptada y recibe la guía de envío
```

Escribiendo dentro de `.sdd/` tienes las plantillas a mano: teclea `req`, `esc`, `regla`, `tarea` o `evidencia` y completa lo que sale.

La herramienta no acepta tecnología, adjetivos sin medida ni el texto de plantilla sin completar: la validación te lo dirá con el archivo y la línea.
