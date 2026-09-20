---
domain: ci
title: Ver los hallazgos en GitHub y ejecutar el gate en cada PR
version: 1
updated: 2026-09-20
---

# Ver los hallazgos en GitHub y ejecutar el gate en cada PR

### Requisito: REQ-CI-001 — Un informe de hallazgos junto a la comprobación continua
El equipo necesita que la comprobación continua que ya corre en cada propuesta de cambio deje un informe legible por las herramientas de revisión, para ver los hallazgos anotados sobre el archivo y la línea exactos donde están, sin abrir la terminal ni buscar a mano.

- Regla BR-CI-001: El informe se genera en la ruta indicada al solicitar la comprobación; no es un paso aparte ni un producto distinto del veredicto.
- Regla BR-CI-002: El informe siempre es válido para su consumidor, incluso cuando no hay hallazgos.

#### Escenario: REQ-CI-001-S1 — Propuesta con hallazgos
- **CUANDO** la comprobación continua encuentra hallazgos y se pidió el informe
- **ENTONCES** el informe queda escrito en la ruta indicada y cada hallazgo aparece con su código, severidad, archivo, línea y sugerencia, de modo que la revisión lo muestra anotado en ese archivo y línea

#### Escenario: REQ-CI-001-S2 — Sin hallazgos
- **CUANDO** la comprobación continua no encuentra ningún hallazgo y se pidió el informe
- **ENTONCES** el informe queda escrito igualmente, es válido y declara cero hallazgos

#### Escenario: REQ-CI-001-S3 — Sin permiso para publicar el informe después del veredicto
- **CUANDO** la comprobación termina pero el informe no puede entregarse al servicio de revisión por falta de permiso
- **ENTONCES** el veredicto de la comprobación no cambia, se informa del motivo y la propuesta no se bloquea por ese motivo

#### Escenario: REQ-CI-001-S4 — Ruta del informe no escribible
- **CUANDO** se pide el informe en una ruta donde no se puede escribir
- **ENTONCES** recibe un aviso explícito con la ruta y la comprobación continúa con su veredicto

### Requisito: REQ-CI-002 — Un informe que la revisión pueda mostrar por archivo y regla
Quien revisa necesita que cada hallazgo llegue agrupado por la regla que lo produce y ubicado en el archivo relativo del proyecto, para entenderlo y arreglarlo sin ambigüedad.

- Regla BR-CI-003: Cada código de hallazgo se publica una sola vez como regla del informe, con su descripción; los hallazgos la referencian por ese código.
- Regla BR-CI-004: Las ubicaciones se expresan relativas a la raíz del proyecto; nunca se publican rutas absolutas de la máquina que ejecutó la comprobación.

#### Escenario: REQ-CI-002-S1 — Reglas declaradas y referenciadas
- **CUANDO** el informe contiene hallazgos con códigos distintos
- **ENTONCES** el informe declara cada código una vez con su descripción y cada hallazgo referencia su código

#### Escenario: REQ-CI-002-S2 — Ubicaciones relativas
- **CUANDO** un hallazgo señala un archivo del proyecto
- **ENTONCES** su ubicación es la ruta relativa a la raíz del proyecto y la línea señalada, sin rutas absolutas

#### Escenario: REQ-CI-002-S3 — Hallazgo sin archivo concreto
- **CUANDO** un hallazgo es del proyecto en general y no señala un archivo
- **ENTONCES** el informe lo incluye en la sección general, sin archivo ni línea, y sigue siendo válido

### Requisito: REQ-CI-003 — El veredicto que bloquea la propuesta
El equipo necesita que la propuesta quede bloqueada exactamente cuando la comprobación no pasa y que el criterio sea el mismo que ve localmente, para no discutir dos verdades distintas.

- Regla BR-CI-005: El veredicto publicado es el mismo que reporta la comprobación con la misma configuración; el informe no lo altera.
- Regla BR-CI-006: Por defecto solo los hallazgos bloqueantes bloquean; en modo estricto los avisos también bloquean.

#### Escenario: REQ-CI-003-S1 — Hallazgos bloqueantes
- **CUANDO** la comprobación encuentra al menos un hallazgo bloqueante
- **ENTONCES** el paso termina en fallo y la propuesta queda bloqueada, con los hallazgos visibles en el informe

#### Escenario: REQ-CI-003-S2 — Modo estricto
- **CUANDO** la comprobación corre en modo estricto y encuentra avisos sin hallazgos bloqueantes
- **ENTONCES** el paso termina en fallo y los avisos quedan visibles en el informe

#### Escenario: REQ-CI-003-S3 — Avisos sin modo estricto
- **CUANDO** la comprobación encuentra solo avisos y no corre en modo estricto
- **ENTONCES** el paso termina en éxito y los avisos quedan visibles en el informe

### Requisito: REQ-CI-004 — Un paso listo para cualquier proyecto
Cualquier equipo necesita añadir la comprobación a sus propuestas con un único paso de su flujo automático, sin preparar el proyecto ni instalar nada a mano, porque la herramienta es global y no de un solo equipo.

- Regla BR-CI-007: El paso obtiene la herramienta por sí mismo desde su distribución pública y admite fijar la versión; no exige que el proyecto la declare como dependencia.

#### Escenario: REQ-CI-004-S1 — Proyecto listo, un solo paso
- **CUANDO** un proyecto con su estado inicializado añade el paso oficial a su flujo automático
- **ENTONCES** la comprobación corre y el informe se publica sin pasos previos ni configuración adicional

#### Escenario: REQ-CI-004-S2 — Versión fijada
- **CUANDO** el paso declara una versión concreta de la herramienta
- **ENTONCES** la comprobación usa esa versión y no otra

#### Escenario: REQ-CI-004-S3 — Proyecto sin inicializar
- **CUANDO** el paso corre en un proyecto que no tiene su estado inicializado
- **ENTONCES** recibe el aviso de inicializar el proyecto y el flujo no se rompe con un error inesperado

#### Escenario: REQ-CI-004-S4 — Herramienta no disponible
- **CUANDO** la herramienta no puede obtenerse desde su distribución pública
- **ENTONCES** el paso informa el motivo con claridad y no publica un informe vacío que parezca una comprobación sin hallazgos

### Requisito: REQ-CI-005 — Comprobación sin secretos y sin permisos de más
El equipo necesita que la comprobación automática no exponga información sensible ni exija permisos que no usa, para adoptarla con confianza en proyectos de cualquier tamaño.

- Regla BR-CI-008: El informe contiene hallazgos y ubicaciones; nunca contenido de archivos, variables de entorno ni credenciales.
- Regla BR-CI-009: El veredicto de la comprobación no depende de la red: la obtención de la herramienta y la entrega del informe son los únicos pasos que la usan.

#### Escenario: REQ-CI-005-S1 — Contenido del informe
- **CUANDO** se inspecciona un informe con hallazgos
- **ENTONCES** solo contiene códigos, severidades, mensajes, sugerencias y ubicaciones relativas, sin contenido de archivos ni credenciales

#### Escenario: REQ-CI-005-S2 — Permisos mínimos
- **CUANDO** el flujo automático concede al paso solo los permisos para leer el repositorio y entregar el informe
- **ENTONCES** la comprobación corre y el veredicto se emite igual

#### Escenario: REQ-CI-005-S3 — Veredicto sin conexión
- **CUANDO** la herramienta ya está disponible y no hay conexión a la red
- **ENTONCES** la comprobación emite su veredicto localmente; solo la entrega del informe falla y se informa el motivo
