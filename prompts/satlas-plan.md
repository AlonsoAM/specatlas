<!-- Generado por SpecAtlas. No editar a mano: satlas adapters lo recompila. -->

# Planificar

# Fase: Planificar (técnico)

El contenido se escribe en **español**. El plan es interno: puede (y debe) hablar de tecnología; la spec no se toca.

## Precondición

- La spec del cambio debe estar aprobada (`satlas status` no debe decir "esperando aprobación").
- Si no lo está, detente y pide la aprobación.

## Pasos

1. Lee `.sdd/changes/<slug>/spec.md`, `.sdd/constitution.md`, `.sdd/profiles/detected.yaml`, `.sdd/profiles/custom/*` y el código real que vayas a tocar (anclas AS-IS: existe / no existe / blast radius).
2. Escribe `plan.md` con las secciones canónicas:
   1. Contexto AS-IS · 2. Enfoque técnico (con alternativas descartadas) · 3. **Diagramas** · 4. Diseño por capa/módulos · 5. Matriz de trazabilidad (REQ → tareas) · 6. Matriz de paridad AS-IS → TO-BE (solo refactors sustitutivos) · 7. Tareas (referencia) · 8. Riesgos y mitigaciones · 9. Rollback · 10. Dependencias y supuestos.
3. En `## 3. Diagramas` incluye los diagramas mermaid que el cambio necesite: `erDiagram` si toca datos, `sequenceDiagram` si hay integración/API/jobs, `flowchart` si hay proceso o validaciones, `stateDiagram-v2` si hay estados, `classDiagram` si el dominio no es trivial, diagrama de arquitectura si hay módulos nuevos.
4. Escribe `tasks.md` con la gramática canónica (separador ` · `):
   - `## Bloque N — Título` y `- [ ] T<N>.<seq> Acción · Archivos: ruta · Cubre: REQ-…-S1 · Depende de: T<N>.<seq> · Reversión: cómo revertir`
   - Tareas atómicas (una acción por tarea). Trabajo de infraestructura sin requisito: `· Infra`.
5. Valida y planifica olas:

```
satlas trace --change <slug>
satlas waves --change <slug>
```

6. Reporta: bloques, tareas, olas, riesgos y cualquier hueco de trazabilidad (debe quedar en 0 errores).

## Prohibido

- Tareas sin archivo concreto o sin requisito (salvo `· Infra`).
- Modificar la spec aprobada (si falta algo, vuelve a especificar y re-aprueba).
- Prometer horas: estima talla y confianza, con supuestos.
