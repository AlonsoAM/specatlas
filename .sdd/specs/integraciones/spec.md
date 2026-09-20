---
domain: integraciones
title: Verificar contratos y compartir specs entre repos
version: 1
updated: 2026-09-20
---

# Verificar contratos y compartir specs entre repos

### Requisito: REQ-INTEGRACIONES-001 — Declarar los contratos del cambio y comprobar su forma
El equipo necesita que las interfaces que un cambio promete (servicios, consultas y mensajes) queden declaradas junto al cambio y se compruebe que están bien formadas, para no descubrir un contrato roto al integrar.

- Regla BR-INTEGRACIONES-001: La comprobación es local: no llama a ningún servicio ni usa la red.
- Regla BR-INTEGRACIONES-002: Un contrato que no se puede interpretar se reporta con su ubicación; nunca se completa ni se inventa lo que falta.

#### Escenario: REQ-INTEGRACIONES-001-S1 — Contrato bien formado
- **CUANDO** el cambio declara un contrato válido y se comprueba
- **ENTONCES** la comprobación lo confirma y enumera sus operaciones

#### Escenario: REQ-INTEGRACIONES-001-S2 — Contrato con errores de forma
- **CUANDO** el contrato declarado tiene un error de forma
- **ENTONCES** se reporta con la ubicación del problema y el contrato no se considera válido

#### Escenario: REQ-INTEGRACIONES-001-S3 — Sin contratos declarados
- **CUANDO** el cambio no declara contratos y se comprueba
- **ENTONCES** se indica que no hay nada que comprobar, sin inventar contratos

#### Escenario: REQ-INTEGRACIONES-001-S4 — Formato no soportado
- **CUANDO** el cambio declara un contrato en un formato que la herramienta no interpreta
- **ENTONCES** se indica el formato esperado y el archivo no se toca

### Requisito: REQ-INTEGRACIONES-002 — Cobertura cruzada entre escenarios y contrato
El equipo necesita saber que lo prometido en la especificación y lo declarado en el contrato coinciden: que ninguna operación del contrato quede sin escenario y que ninguna referencia de un escenario apunte a algo inexistente.

- Regla BR-INTEGRACIONES-003: Un escenario puede declarar las operaciones del contrato que promete; lo declarado en el contrato y no referenciado se reporta como hueco y lo referenciado que no existe se reporta como rotura.
- Regla BR-INTEGRACIONES-004: El aviso de cobertura es configurable (apagado, aviso o bloqueante); en modo bloqueante el cambio no se archiva mientras haya huecos o roturas.

#### Escenario: REQ-INTEGRACIONES-002-S1 — Operación referenciada por un escenario
- **CUANDO** una operación del contrato está declarada por al menos un escenario
- **ENTONCES** cuenta como cubierta y no genera hallazgo

#### Escenario: REQ-INTEGRACIONES-002-S2 — Operación sin escenario
- **CUANDO** una operación del contrato no está declarada por ningún escenario
- **ENTONCES** se reporta como operación sin escenario, con su identificador

#### Escenario: REQ-INTEGRACIONES-002-S3 — Referencia rota
- **CUANDO** un escenario declara una operación que no existe en el contrato
- **ENTONCES** se reporta como referencia rota con el identificador declarado

#### Escenario: REQ-INTEGRACIONES-002-S4 — Modo bloqueante
- **CUANDO** el aviso está en modo bloqueante y existen huecos o roturas
- **ENTONCES** el archivado del cambio queda bloqueado y se indica la acción para resolverlo

#### Escenario: REQ-INTEGRACIONES-002-S5 — Modo apagado
- **CUANDO** el aviso está apagado
- **ENTONCES** la comprobación informa la forma del contrato pero no emite hallazgos de cobertura

### Requisito: REQ-INTEGRACIONES-003 — Compartir specs entre repos con enlaces
El equipo necesita trabajar con specs repartidas entre distintos proyectos (monorepo y polyrepo) sin copiarlas ni duplicarlas: un proyecto puede enlazar otros y consultar sus requisitos.

- Regla BR-INTEGRACIONES-005: Los enlaces son rutas locales registradas en el proyecto que enlaza; las specs enlazadas son de solo lectura: nunca se editan, aprueban ni archivan desde el proyecto que enlaza.
- Regla BR-INTEGRACIONES-006: Un enlace no disponible se reporta sin romper el trabajo local.

#### Escenario: REQ-INTEGRACIONES-003-S1 — Registrar un enlace
- **CUANDO** el equipo registra un enlace a otro proyecto
- **ENTONCES** el enlace queda en el registro del proyecto con su ruta y se informan las specs que aporta

#### Escenario: REQ-INTEGRACIONES-003-S2 — Listar enlaces
- **CUANDO** se listan los enlaces del proyecto
- **ENTONCES** cada enlace muestra su ruta, si está disponible y cuántos requisitos aporta

#### Escenario: REQ-INTEGRACIONES-003-S3 — Quitar un enlace
- **CUANDO** el equipo quita un enlace existente
- **ENTONCES** deja de aportarse y el resto del proyecto queda igual

#### Escenario: REQ-INTEGRACIONES-003-S4 — Enlace no disponible
- **CUANDO** un enlace apunta a una ruta que ya no existe o no es un proyecto
- **ENTONCES** se recibe un aviso explícito y el trabajo local continúa

#### Escenario: REQ-INTEGRACIONES-003-S5 — Solo lectura
- **CUANDO** se consultan las specs de un proyecto enlazado
- **ENTONCES** los archivos del proyecto enlazado quedan idénticos antes y después

### Requisito: REQ-INTEGRACIONES-004 — Trazabilidad e impacto con specs enlazadas
El equipo necesita que las consultas de trazabilidad e impacto incluyan los requisitos de los proyectos enlazados, para dimensionar cambios que cruzan repos sin confundirlos con los locales.

- Regla BR-INTEGRACIONES-007: Lo enlazado se informa como externo, con su proyecto de origen; nunca se mezcla con lo local ni tapa huecos locales.
- Regla BR-INTEGRACIONES-008: Una referencia a un requisito de un enlace no disponible se reporta como no resuelta, sin inventar su contenido.

#### Escenario: REQ-INTEGRACIONES-004-S1 — Requisito enlazado en la trazabilidad
- **CUANDO** una tarea o un cambio local referencia un requisito de un proyecto enlazado
- **ENTONCES** la consulta lo muestra marcado como externo con el proyecto de origen

#### Escenario: REQ-INTEGRACIONES-004-S2 — Referencia a un enlace no disponible
- **CUANDO** una referencia apunta a un requisito de un proyecto enlazado que no está disponible
- **ENTONCES** se reporta como referencia no resuelta

#### Escenario: REQ-INTEGRACIONES-004-S3 — Local y externo distinguibles
- **CUANDO** la consulta muestra requisitos locales y enlazados a la vez
- **ENTONCES** cada uno se identifica como local o externo con su origen

#### Escenario: REQ-INTEGRACIONES-004-S4 — Sin enlaces
- **CUANDO** el proyecto no tiene enlaces
- **ENTONCES** las consultas funcionan igual que antes, sin avisos de enlaces

### Requisito: REQ-INTEGRACIONES-005 — Contratos y enlaces en la terminal y para los asistentes
El equipo necesita operar y consultar contratos y enlaces tanto desde la terminal como desde la vía de consulta para asistentes, con la misma información.

- Regla BR-INTEGRACIONES-009: La consulta para asistentes es de solo lectura: informa contratos, hallazgos y enlaces; nunca los crea, edita ni elimina.

#### Escenario: REQ-INTEGRACIONES-005-S1 — Comprobar contratos desde la terminal
- **CUANDO** el equipo comprueba los contratos de un cambio
- **ENTONCES** recibe por contrato sus operaciones y los hallazgos de forma y cobertura

#### Escenario: REQ-INTEGRACIONES-005-S2 — Gestionar enlaces desde la terminal
- **CUANDO** el equipo registra, lista o quita enlaces
- **ENTONCES** cada acción informa el resultado y el registro queda consistente

#### Escenario: REQ-INTEGRACIONES-005-S3 — Consulta de asistentes
- **CUANDO** un asistente consulta contratos o enlaces
- **ENTONCES** recibe la misma información que la terminal, en solo lectura

#### Escenario: REQ-INTEGRACIONES-005-S4 — Cambio o proyecto inexistente
- **CUANDO** se ejecuta cualquiera de estas acciones sobre un cambio o proyecto que no existe
- **ENTONCES** se recibe un aviso explícito y nada se modifica
