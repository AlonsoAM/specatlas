<!-- Generado por SpecAtlas. No editar a mano: satlas adapters lo recompila. -->

# Aclarar

# Fase: Aclarar (vaciar las preguntas abiertas)

## Objetivo

Resolver los supuestos, dependencias y preguntas abiertas del cambio `<slug>` y dejarlos registrados en `.sdd/changes/<slug>/clarify.md`.
El contenido se escribe en **español**.

## Pasos

1. Lee `.sdd/changes/<slug>/spec.md`, `proposal.md` y, si existe, `clarify.md`.
2. Detecta supuestos, dependencias y preguntas abiertas **reales** de la especificación; no inventes preguntas.
3. Pregunta una a una (máximo 5, las que más cambien el resultado), con opciones concretas cuando ayuden a decidir. No des nada por respondido sin respuesta del humano.
4. Escribe o actualiza `clarify.md` con la gramática canónica:
   - `- [ ] pregunta` para lo que sigue abierto.
   - `- [x] pregunta — respuesta` para lo aclarado.
5. Refleja el resumen de lo decidido en la propuesta (`proposal.md`), en su sección correspondiente.
6. Si una respuesta cambia lo especificado: corrige `spec.md` y avisa de que la firma quedó obsoleta (hay que volver a aprobar con `satlas approve`).
7. Cierra con `satlas clarify <slug>` (estado de la aclaración) y `satlas next <slug>`.

## Prohibido

- Inventar preguntas o respuestas.
- Cambiar la especificación sin avisar de la re-firma.
- Marcar como aclarada una pregunta que el humano no respondió.
