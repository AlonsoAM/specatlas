---
domain: fases
title: Aclarar la especificación antes de planificar y documentar el cambio
version: 1
updated: 2026-09-20
---

# Aclarar la especificación antes de planificar y documentar el cambio

### Requisito: REQ-FASES-001 — Vaciar las preguntas abiertas antes de planificar
El equipo necesita que, después de escribir la especificación y antes de invertir en el plan técnico, los supuestos, las dependencias y las preguntas abiertas queden resueltos o aceptados de forma explícita, para no planificar sobre huecos ni descubrirlos construyendo.

- Regla BR-FASES-001: La aclaración es una entrevista: las respuestas quedan registradas en el cambio, separadas de la especificación de negocio.
- Regla BR-FASES-002: La aclaración no cambia el comportamiento por sí sola: si una respuesta cambia lo especificado, la especificación se corrige y su firma queda obsoleta hasta volver a aprobarse.

#### Escenario: REQ-FASES-001-S1 — Especificación con preguntas abiertas
- **CUANDO** el equipo aclara un cambio cuya especificación dejó preguntas abiertas
- **ENTONCES** la fase pregunta una a una y registra cada respuesta en el cambio, junto al estado de lo que queda pendiente

#### Escenario: REQ-FASES-001-S2 — Sin preguntas abiertas
- **CUANDO** el equipo aclara un cambio que no dejó preguntas abiertas
- **ENTONCES** la fase lo indica y no inventa preguntas ni respuestas

#### Escenario: REQ-FASES-001-S3 — Una respuesta cambia lo especificado
- **CUANDO** una respuesta cambia el comportamiento especificado
- **ENTONCES** la especificación se corrige, la firma anterior queda obsoleta y se indica que hay que volver a aprobarla

#### Escenario: REQ-FASES-001-S4 — Lo aclarado se refleja en la propuesta
- **CUANDO** termina una ronda de aclaración con decisiones
- **ENTONCES** el resumen de lo decidido queda reflejado en la propuesta del cambio

### Requisito: REQ-FASES-002 — Aviso de aclaración pendiente, configurable
El equipo necesita que la herramienta avise cuando quedan preguntas sin aclarar, con la posibilidad de exigir que se vacíen antes de planificar, sin imponerlo a todos los proyectos.

- Regla BR-FASES-003: El aviso indica cuántas preguntas quedan y la acción para aclararlas; el modo se configura por proyecto (apagado, aviso o bloqueante).
- Regla BR-FASES-004: Con el modo bloqueante no se avanza a plan mientras queden preguntas abiertas.

#### Escenario: REQ-FASES-002-S1 — Modo aviso con preguntas abiertas
- **CUANDO** el cambio tiene preguntas abiertas y el modo es aviso
- **ENTONCES** el estado avisa cuántas quedan y la acción para aclararlas, sin bloquear el avance

#### Escenario: REQ-FASES-002-S2 — Modo bloqueante con preguntas abiertas
- **CUANDO** el cambio tiene preguntas abiertas y el modo es bloqueante
- **ENTONCES** el avance a plan queda bloqueado y se indica la acción que lo desbloquea

#### Escenario: REQ-FASES-002-S3 — Modo apagado
- **CUANDO** el modo es apagado y el cambio tiene preguntas abiertas
- **ENTONCES** no se emite ningún aviso de aclaración

#### Escenario: REQ-FASES-002-S4 — Sin preguntas abiertas
- **CUANDO** el cambio no tiene preguntas abiertas
- **ENTONCES** no hay aviso en ningún modo

### Requisito: REQ-FASES-003 — Documentación del cambio en el carril completo
El equipo necesita que un cambio del carril completo deje documentación técnica y manual construida desde lo real, para que quien mantiene el sistema no dependa de reconstruir lo hecho leyendo el historial.

- Regla BR-FASES-005: La documentación se construye desde las plantillas y la evidencia registrada; lo que no tiene evidencia no se documenta como hecho.
- Regla BR-FASES-006: La documentación vive en el cambio y no altera la especificación, el plan ni las tareas.

#### Escenario: REQ-FASES-003-S1 — Documentación completa
- **CUANDO** el equipo documenta un cambio y pide ambos documentos
- **ENTONCES** quedan en el cambio el documento técnico y el manual, con las secciones de la plantilla y los datos reales del cambio, sus requisitos, sus tareas y su evidencia

#### Escenario: REQ-FASES-003-S2 — Solo uno de los documentos
- **CUANDO** el equipo pide solo el documento técnico o solo el manual
- **ENTONCES** se genera el pedido y el otro documento no se toca

#### Escenario: REQ-FASES-003-S3 — Cambio sin evidencia
- **CUANDO** se documenta un cambio que aún no tiene evidencia registrada
- **ENTONCES** la documentación se genera igualmente y señala expresamente lo que queda sin evidencia, sin inventarlo

#### Escenario: REQ-FASES-003-S4 — Regenerar la documentación
- **CUANDO** se vuelve a documentar un cambio ya documentado
- **ENTONCES** la documentación se actualiza sin duplicar secciones ni perder lo escrito a mano

### Requisito: REQ-FASES-004 — Documentación pendiente y archivado, configurable
El equipo necesita que, en el carril completo, no se archive sin documentación cuando así lo exija la configuración, y que en los demás carriles la documentación no estorbe.

- Regla BR-FASES-007: Con el modo bloqueante, el carril completo no se archiva hasta que exista la documentación; el modo se configura por proyecto.

#### Escenario: REQ-FASES-004-S1 — Carril completo sin documentación y modo bloqueante
- **CUANDO** un cambio del carril completo no tiene documentación y el modo es bloqueante
- **ENTONCES** el archivado queda bloqueado y se indica la acción para documentarlo

#### Escenario: REQ-FASES-004-S2 — Carril completo con documentación
- **CUANDO** un cambio del carril completo ya tiene su documentación
- **ENTONCES** el archivado sigue sin bloqueo por documentación

#### Escenario: REQ-FASES-004-S3 — Carril estándar
- **CUANDO** un cambio del carril estándar no tiene documentación y el modo es bloqueante
- **ENTONCES** el archivado no se bloquea por documentación

#### Escenario: REQ-FASES-004-S4 — Modo aviso o apagado
- **CUANDO** la documentación falta y el modo es aviso o apagado
- **ENTONCES** el archivado no se bloquea y, en modo aviso, se informa de lo que falta

### Requisito: REQ-FASES-005 — Aclarar y documentar también desde la terminal y los asistentes
El equipo necesita que las dos fases existan como acciones del ciclo, tanto para el trabajo con agentes como para la terminal, con la misma semántica.

- Regla BR-FASES-008: Cada fase tiene una acción en la terminal y su fase equivalente para el agente; ambas trabajan sobre el mismo cambio y los mismos artefactos.

#### Escenario: REQ-FASES-005-S1 — Aclarar desde la terminal
- **CUANDO** el equipo ejecuta la acción de aclarar sobre un cambio existente
- **ENTONCES** la acción informa las preguntas abiertas y el estado de lo aclarado

#### Escenario: REQ-FASES-005-S2 — Documentar desde la terminal con tipo
- **CUANDO** el equipo ejecuta la acción de documentar indicando el tipo de documento
- **ENTONCES** se genera exactamente el tipo pedido

#### Escenario: REQ-FASES-005-S3 — Fases disponibles para el agente
- **CUANDO** se enumeran las fases disponibles para el agente
- **ENTONCES** aclarar y documentar aparecen entre ellas con su descripción

#### Escenario: REQ-FASES-005-S4 — Cambio inexistente
- **CUANDO** se ejecuta cualquiera de las dos acciones sobre un cambio que no existe
- **ENTONCES** se recibe un aviso explícito y nada se modifica
