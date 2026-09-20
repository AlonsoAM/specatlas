# Propuesta — Fixes vivos y trazabilidad de specs y fixes

## Por qué
Las specs tienen memoria viva (`.sdd/specs/`), pero los fixes no: al archivar un fix solo queda enterrado en `changes/archive/`, invisible en el editor (el árbol solo muestra cambios activos) y ajeno a la trazabilidad. Se pierde el porqué de las correcciones urgentes y no se ve qué tocó cada requisito. La matriz, además, no distingue qué cambios y qué fixes movieron un requisito.

## Qué cambia
- Al archivar un fix queda un **fix vivo** navegable (uno por fix: fecha, dominio, título, resultado de su evidencia y contenido íntegro), incluido en el registro del proyecto; archivar de nuevo no lo duplica y el carril express sigue sin plegar comportamiento en las specs vivas.
- La **vista lateral** suma dos grupos: «Fixes» (fecha, dominio y resultado, del más reciente al más antiguo; un clic lo abre) e «Histórico» (cambios archivados que no son fixes, con carril y fecha de cierre).
- La **matriz de trazabilidad** muestra, por requisito vivo, además de escenarios → tareas → evidencia, **qué cambios y fixes lo tocaron**, con filtros por dominio y por tipo de procedencia; sin registros lo dice expresamente.
- Un fix puede declarar **qué requisitos afecta** (opcional, en el propio fix); si el identificador no existe se avisa sin invalidar el fix.
- Los fixes vivos se consultan también en **`satlas status`** y en la **vía de consulta para asistentes**, siempre en solo lectura y sin inventar cuando no hay ninguno.

## Fuera de alcance
- Fusionar fixes en las specs vivas: el carril express no cambia comportamiento documentado.
- Editar o firmar fixes vivos desde el editor: se abren, no se reescriben.
- Un panel nuevo de specs: la trazabilidad se amplía en la matriz existente.

## Cómo se mide el éxito
- Archivar un fix lo deja visible y consultable (editor, estado del proyecto y vía de asistentes) con su contenido íntegro, sin tocar las specs vivas.
- Abrir un requisito muestra de un vistazo sus cambios y fixes; si no hay registros, lo dice sin inventar.
- El árbol muestra fixes e histórico sin duplicados y sin depender de cerrar y reabrir paneles.
