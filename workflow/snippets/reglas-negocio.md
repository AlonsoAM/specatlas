## Reglas de la especificación de negocio

- Se escribe para el usuario del sistema, no para programadores.
- Cada requisito declara **qué** y **por qué**, nunca **cómo**.
- Vocabulario: el del glosario (`.sdd/glossary.md`). Si un término no existe, agrégalo al glosario o pregunta.
- Prohibido: nombres de tablas, campos, endpoints, clases, archivos, frameworks, librerías, SQL, diagramas técnicos y estimaciones.
- Prohibido: adjetivos no medibles ("rápido", "fácil", "varios", "óptimo", "robusto", "adecuado", "simple").
- Cada escenario tiene un resultado observable y verificable (`ENTONCES` medible).
- Todo requisito incluye escenarios de error, caso vacío, falta de permiso y límites.
- Los ids `REQ-*` y `BR-*` son inmutables: no se renumeran ni se reutilizan.
