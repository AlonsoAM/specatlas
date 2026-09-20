# Delta — Consultar el estado del proyecto desde el asistente

## Requisitos agregados

### Requisito: REQ-MCP-001 — Consultar el estado general y el de un cambio
El asistente necesita conocer el estado vigente del proyecto (cambios activos, fase, avance y bloqueos) sin depender de que una persona se lo describa, para no basar sus respuestas en suposiciones.

- Regla BR-MCP-001: Lo informado coincide con lo que reporta el estado del proyecto en el mismo instante; la consulta no calcula nada por su cuenta.

#### Escenario: REQ-MCP-001-S1 — Estado general con cambios activos
- **CUANDO** el asistente consulta el estado general y el proyecto tiene cambios activos
- **ENTONCES** recibe cada cambio con su nombre, fase, avance de tareas, avance de evidencia y bloqueos pendientes, idéntico a lo que reporta el estado del proyecto

#### Escenario: REQ-MCP-001-S2 — Estado general sin cambios activos
- **CUANDO** el asistente consulta el estado general y no hay cambios activos
- **ENTONCES** recibe una respuesta que lo indica y la acción recomendada para crear un cambio

#### Escenario: REQ-MCP-001-S3 — Estado de un cambio concreto
- **CUANDO** el asistente consulta el estado indicando el nombre de un cambio existente
- **ENTONCES** recibe solo el detalle de ese cambio: fase, avance de tareas, avance de evidencia y bloqueos

#### Escenario: REQ-MCP-001-S4 — Cambio inexistente
- **CUANDO** el asistente consulta un cambio que no existe
- **ENTONCES** recibe un aviso explícito de que no existe y la lista de cambios disponibles, nunca una respuesta vacía sin explicación

#### Escenario: REQ-MCP-001-S5 — Proyecto sin inicializar
- **CUANDO** el asistente consulta en una carpeta que no tiene el estado del proyecto
- **ENTONCES** recibe la indicación de que el proyecto no está inicializado y la acción para inicializarlo

### Requisito: REQ-MCP-002 — Conocer la siguiente acción recomendada
El asistente necesita saber cuál es el siguiente paso recomendado para un cambio, para proponer acciones alineadas con el proceso y no improvisar.

- Regla BR-MCP-002: Cuando el paso pendiente requiere una persona, la respuesta lo señala de forma explícita y no sugiere que el asistente puede realizarlo por su cuenta.

#### Escenario: REQ-MCP-002-S1 — Paso sin intervención humana
- **CUANDO** el asistente consulta la siguiente acción de un cambio y el paso pendiente no requiere una persona
- **ENTONCES** recibe la acción exacta con sus argumentos y la indicación de que no requiere una persona

#### Escenario: REQ-MCP-002-S2 — Paso que requiere una persona
- **CUANDO** el paso pendiente requiere una persona (aprobar, revisar o archivar)
- **ENTONCES** recibe la acción y la indicación explícita de que requiere una persona

#### Escenario: REQ-MCP-002-S3 — Cambio bloqueado por un gate
- **CUANDO** el cambio está bloqueado porque falta un gate
- **ENTONCES** recibe cuál gate falta y qué lo desbloquea

#### Escenario: REQ-MCP-002-S4 — Cambio pausado
- **CUANDO** el cambio está pausado
- **ENTONCES** recibe que está pausado, el motivo registrado y la acción para reanudarlo

### Requisito: REQ-MCP-003 — Consultar hallazgos y cobertura
El asistente necesita ver los mismos hallazgos y huecos de trazabilidad que ve el equipo, para corregir la causa en lugar de adivinar.

- Regla BR-MCP-003: La consulta no crea, modifica ni oculta hallazgos; informa exactamente los vigentes.

#### Escenario: REQ-MCP-003-S1 — Consulta de hallazgos con resultados
- **CUANDO** el asistente consulta los hallazgos de un cambio que tiene hallazgos
- **ENTONCES** recibe cada hallazgo con su código, severidad, ubicación y sugerencia, y el conjunto coincide con el que reporta la validación

#### Escenario: REQ-MCP-003-S2 — Consulta de hallazgos sin resultados
- **CUANDO** el asistente consulta los hallazgos de un cambio conforme
- **ENTONCES** recibe una respuesta de conformidad, sin hallazgos inventados

#### Escenario: REQ-MCP-003-S3 — Cobertura de trazabilidad
- **CUANDO** el asistente consulta la cobertura de trazabilidad del proyecto
- **ENTONCES** recibe por escenario su cobertura vigente (tarea que lo cubre y evidencia registrada) y los huecos pendientes

### Requisito: REQ-MCP-004 — Consultar el impacto de un requisito o un archivo
El asistente necesita saber qué está relacionado con un requisito o un archivo antes de proponer un cambio, para dimensionar el efecto y evitar olvidos.

- Regla BR-MCP-004: El impacto informado sale de las relaciones registradas en el proyecto; lo no relacionado no se incluye ni se supone.

#### Escenario: REQ-MCP-004-S1 — Impacto de un requisito
- **CUANDO** el asistente consulta el impacto de un requisito existente
- **ENTONCES** recibe los escenarios, tareas, cambios y anclas relacionados con ese requisito

#### Escenario: REQ-MCP-004-S2 — Impacto de un archivo
- **CUANDO** el asistente consulta el impacto de un archivo del proyecto
- **ENTONCES** recibe las tareas y requisitos que lo mencionan

#### Escenario: REQ-MCP-004-S3 — Sin relaciones registradas
- **CUANDO** el asistente consulta el impacto de un requisito o un archivo sin relaciones registradas
- **ENTONCES** recibe una respuesta que lo indica, sin elementos supuestos

### Requisito: REQ-MCP-005 — Consultar el glosario del negocio
El asistente debe usar los términos del negocio con el significado vigente, para que sus respuestas y propuestas hablen el idioma del equipo.

- Regla BR-MCP-005: Los términos y definiciones son los del glosario vigente; la consulta no propone significados nuevos.

#### Escenario: REQ-MCP-005-S1 — Términos vigentes
- **CUANDO** el asistente consulta el glosario
- **ENTONCES** recibe los términos con su definición y sus sinónimos aceptados, idéntico al glosario vigente

#### Escenario: REQ-MCP-005-S2 — Glosario vacío
- **CUANDO** el glosario no tiene términos definidos
- **ENTONCES** recibe una respuesta que lo indica y la sugerencia de definir los términos del negocio, sin inventar definiciones

### Requisito: REQ-MCP-006 — Consulta de solo lectura
El equipo necesita la garantía de que la vía de consulta nunca modifica el proyecto, para usarla con confianza durante cualquier fase del trabajo.

- Regla BR-MCP-006: Toda operación ofrecida es de consulta; no existe ninguna operación que escriba, firme, ejecute comandos ni cambie la configuración del proyecto.

#### Escenario: REQ-MCP-006-S1 — Catálogo de operaciones de consulta
- **CUANDO** se enumeran las operaciones disponibles de la vía de consulta
- **ENTONCES** todas son de consulta y ninguna modifica el proyecto

#### Escenario: REQ-MCP-006-S2 — Proyecto intacto tras la consulta
- **CUANDO** se usa cualquier operación de la vía de consulta
- **ENTONCES** los archivos del proyecto permanecen idénticos antes y después

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: mcp -->
