<!-- BEGIN specatlas -->
## SpecAtlas (SDD)

Este proyecto usa SpecAtlas (AGENTS.md). Idioma de los artefactos: español.
El estado vive en `.sdd/`: specs vivas en `.sdd/specs/`, cambios en `.sdd/changes/`.

Comandos (CLI): `satlas status`, `satlas next`, `satlas validate`, `satlas trace`, `satlas waves`, `satlas approve`, `satlas archive`.

Fases (prompts en `prompts/`):

- `prompts/satlas-adopt.md` — Adoptar (brownfield): Recupera las specs de un proyecto existente: lee el inventario y las anclas, entrevista al usuario y redacta requisitos AS-IS. Usar cuando el usuario pide adoptar, documentar o recuperar las specs de un proyecto que ya existe.
- `prompts/satlas-archive.md` — Archivar: Cierra el cambio: pliega los deltas en la spec viva y mueve el cambio al histórico. Usar cuando el usuario pide archivar, cerrar o dar por terminado un cambio.
- `prompts/satlas-build.md` — Construir: Implementa las tareas del cambio por olas paralelas, con evidencia y sin tocar los artefactos aprobados. Usar cuando el usuario pide construir, implementar o codificar las tareas.
- `prompts/satlas-fix.md` — Fix express: Carril express para incidentes (bug, hotfix, configuración): un solo artefacto, con causa raíz, cambio mínimo y evidencia. Usar cuando el usuario pide arreglar un bug, un hotfix o un cambio pequeño sin ceremonia completa.
- `prompts/satlas-mockup.md` — Mockups: Genera mockups profesionales (web/mobile) como contrato visual de la propuesta: alta fidelidad, estados, responsive y accesibles. Usar cuando el usuario pide mockups, prototipos visuales o la propuesta visual del cambio.
- `prompts/satlas-plan.md` — Planificar: Crea el plan técnico y las tareas trazadas de un cambio ya aprobado. Usar cuando el usuario pide planificar, diseñar la solución o desglosar tareas.
- `prompts/satlas-review.md` — Revisar: Revisión de código con lentes por tamaño del diff y verificación adversarial de hallazgos. Usar cuando el usuario pide revisar el código antes del PR.
- `prompts/satlas-specify.md` — Especificar: Escribe o refina la especificación funcional de un cambio (delta) en lenguaje de negocio. Usar cuando el usuario pide especificar, definir requisitos, redactar la spec o crear un cambio.
- `prompts/satlas-verify.md` — Verificar: Registra evidencia real por escenario (comando y resultado) en verify.md. Usar cuando el usuario pide verificar, probar o demostrar que el cambio funciona.

Reglas: la spec es funcional y de negocio (sin tecnología); la trazabilidad es obligatoria (requisito → escenario → tarea → evidencia); los artefactos aprobados no se editan.
<!-- END specatlas -->
