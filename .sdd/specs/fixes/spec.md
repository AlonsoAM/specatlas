---
domain: fixes
title: Fixes vivos y trazabilidad de specs y fixes
version: 1
updated: 2026-09-20
---

# Fixes vivos y trazabilidad de specs y fixes

### Requisito: REQ-FIXES-001 — Un fix archivado queda vivo
El equipo necesita que los fixes corregidos no desaparezcan en el histórico: al cerrar un fix debe quedar una pieza viva, consultable después, con su fecha, su dominio y el resultado de su verificación, para no volver a investigar lo ya resuelto ni perder el porqué de una corrección urgente.

- Regla BR-FIXES-001: Al archivar un fix se conserva su contenido íntegro (síntoma, causa raíz, cambio, reversión y evidencia) tal como quedó; el fix vivo no se reescribe al crearse.
- Regla BR-FIXES-002: Archivar es idempotente: un fix ya conservado no se duplica ni se pisa.

#### Escenario: REQ-FIXES-001-S1 — Fix archivado con su identidad
- **CUANDO** el equipo archiva un fix verificado
- **ENTONCES** queda un fix vivo con su fecha, su dominio, su título y el resultado de su evidencia, y con su contenido íntegro

#### Escenario: REQ-FIXES-001-S2 — Registro del proyecto al día
- **CUANDO** se archiva un fix
- **ENTONCES** el registro del proyecto (el mismo que enumera specs y cambios) lo incluye junto a los demás fixes vivos

#### Escenario: REQ-FIXES-001-S3 — Archivar de nuevo el mismo fix
- **CUANDO** se archiva un fix que ya estaba conservado como fix vivo
- **ENTONCES** no se duplica ni se pierde el existente

#### Escenario: REQ-FIXES-001-S4 — El fix no altera las specs vivas
- **CUANDO** se archiva un fix
- **ENTONCES** las specs vivas quedan idénticas: el carril express no pliega comportamiento nuevo

#### Escenario: REQ-FIXES-001-S5 — Sin permiso para conservar el fix vivo
- **CUANDO** el archivado no puede conservar el fix vivo por falta de permiso de escritura
- **ENTONCES** el fix sigue sin archivar, nada queda a medias y recibe el motivo

### Requisito: REQ-FIXES-002 — Ver los fixes y el histórico en la vista lateral
El equipo necesita ver en el editor qué fixes ya se hicieron y qué cambios se cerraron, sin recorrer carpetas, para reutilizar decisiones y saber qué quedó atrás.

- Regla BR-FIXES-003: La vista lateral muestra dos grupos: «Fixes» (los fixes vivos) e «Histórico» (los cambios archivados que no son fixes); un fix no se muestra duplicado en el histórico.

#### Escenario: REQ-FIXES-002-S1 — Lista de fixes
- **CUANDO** el proyecto tiene fixes archivados
- **ENTONCES** la vista lateral muestra cada uno con su fecha, su dominio y el resultado de su evidencia, del más reciente al más antiguo

#### Escenario: REQ-FIXES-002-S2 — Abrir un fix desde la lista
- **CUANDO** el equipo elige un fix de la lista
- **ENTONCES** se abre su contenido

#### Escenario: REQ-FIXES-002-S3 — Lista del histórico
- **CUANDO** el proyecto tiene cambios archivados que no son fixes
- **ENTONCES** la vista lateral los muestra con su nombre, su carril y su fecha de cierre

#### Escenario: REQ-FIXES-002-S4 — Proyecto sin historial
- **CUANDO** el proyecto no tiene fixes ni cambios archivados
- **ENTONCES** los dos grupos aparecen vacíos e indican que se llenan al archivar

### Requisito: REQ-FIXES-003 — La trazabilidad muestra qué tocó cada requisito
El equipo necesita ver, para cada requisito vivo, no solo sus escenarios, tareas y evidencia, sino también qué cambios y qué fixes lo tocaron, para entender su historia y no atribuir a nadie lo que no está registrado.

- Regla BR-FIXES-004: La procedencia sale de lo registrado (tareas que cubren, cambios que lo declararon y fixes que lo declaran); lo no registrado no se supone.
- Regla BR-FIXES-005: La trazabilidad se puede filtrar por dominio y por tipo de procedencia (cambios, fixes), sin alterar los datos de cobertura mostrados.

#### Escenario: REQ-FIXES-003-S1 — Requisito tocado por cambios y fixes
- **CUANDO** un requisito vivo fue declarado por cambios archivados y por fixes
- **ENTONCES** su fila muestra ambos tipos de procedencia con sus nombres

#### Escenario: REQ-FIXES-003-S2 — Requisito sin procedencia registrada
- **CUANDO** un requisito vivo no tiene cambios ni fixes registrados
- **ENTONCES** se indica expresamente que no hay procedencia registrada, sin inventarla

#### Escenario: REQ-FIXES-003-S3 — Filtros por dominio y procedencia
- **CUANDO** el equipo filtra por un dominio o por un tipo de procedencia
- **ENTONCES** solo quedan visibles los requisitos que cumplen el filtro y el resto de los datos no cambia

### Requisito: REQ-FIXES-004 — Un fix declara qué requisitos afecta (opcional)
Quien cierra un fix necesita poder dejar constancia de los requisitos que su corrección afecta, para que la trazabilidad no lo pierda, sin que declararlo sea obligatorio.

- Regla BR-FIXES-006: La declaración es opcional y vive en el propio fix; si menciona un requisito inexistente, se avisa sin invalidar el fix.
- Regla BR-FIXES-007: La declaración no altera el veredicto del fix ni sus evidencias.

#### Escenario: REQ-FIXES-004-S1 — Fix con requisitos declarados
- **CUANDO** un fix declara requisitos existentes
- **ENTONCES** esos requisitos muestran el fix en su trazabilidad

#### Escenario: REQ-FIXES-004-S2 — Fix con un requisito inexistente
- **CUANDO** un fix declara un requisito que no existe
- **ENTONCES** recibe un aviso explícito con el identificador y el fix sigue siendo válido

#### Escenario: REQ-FIXES-004-S3 — Fix sin declaración
- **CUANDO** un fix no declara requisitos
- **ENTONCES** sigue siendo válido y aparece en la lista de fixes, sin asociarse a ningún requisito

### Requisito: REQ-FIXES-005 — Los fixes vivos se ven también fuera del editor
El equipo y los asistentes necesitan consultar los fixes vivos desde la terminal y desde la vía de consulta para asistentes, con su detalle, sin abrir el editor.

- Regla BR-FIXES-008: La consulta es de solo lectura: informa los fixes vivos registrados; nunca los crea, edita ni archiva.
- Regla BR-FIXES-009: Lo informado coincide con los fixes vivos del proyecto; sin fixes, se indica y no se inventa.

#### Escenario: REQ-FIXES-005-S1 — El estado del proyecto con fixes
- **CUANDO** se consulta el estado del proyecto y hay fixes vivos
- **ENTONCES** se listan o resumen con su fecha, su dominio y su resultado

#### Escenario: REQ-FIXES-005-S2 — Consulta detallada de los fixes
- **CUANDO** un asistente consulta los fixes vivos
- **ENTONCES** recibe cada fix con su identidad, su contenido y los requisitos que declara

#### Escenario: REQ-FIXES-005-S3 — Sin fixes vivos
- **CUANDO** se consultan los fixes y no hay ninguno
- **ENTONCES** se recibe una respuesta que lo indica y la acción para archivar un fix existente, sin inventar contenido

#### Escenario: REQ-FIXES-005-S4 — Consulta sin efectos
- **CUANDO** se consultan los fixes vivos
- **ENTONCES** los archivos del proyecto quedan idénticos antes y después
