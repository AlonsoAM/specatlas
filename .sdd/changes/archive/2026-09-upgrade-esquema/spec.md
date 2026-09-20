# Delta — Actualizar el estado del proyecto a la versión vigente

## Requisitos agregados

### Requisito: REQ-ESQUEMA-001 — Saber si el proyecto está al día
El equipo necesita saber si el estado guardado del proyecto corresponde a la versión vigente de la herramienta, para no trabajar con información desactualizada sin enterarse y para decidir a conciencia cuándo actualizarla.

- Regla BR-ESQUEMA-001: Mirar el estado nunca lo modifica: los avisos son informativos y no escriben, no corrigen ni actualizan nada por su cuenta.
- Regla BR-ESQUEMA-002: Un proyecto que fue producido por una versión más nueva de la herramienta no se degrada: se informa esa situación y no se propone volver atrás.

#### Escenario: REQ-ESQUEMA-001-S1 — Proyecto desactualizado
- **CUANDO** el equipo consulta el estado de un proyecto cuyo estado guardado corresponde a una versión anterior
- **ENTONCES** recibe un aviso de que hay una actualización pendiente, con los elementos afectados y la versión a la que pasaría

#### Escenario: REQ-ESQUEMA-001-S2 — Proyecto al día
- **CUANDO** el equipo consulta el estado de un proyecto que ya corresponde a la versión vigente
- **ENTONCES** no recibe ningún aviso de actualización pendiente

#### Escenario: REQ-ESQUEMA-001-S3 — Proyecto sin inicializar
- **CUANDO** el equipo consulta el estado de una carpeta que no tiene el estado del proyecto
- **ENTONCES** recibe la indicación de que no está inicializado y la acción para inicializarlo, sin sugerir una actualización

#### Escenario: REQ-ESQUEMA-001-S4 — Proyecto producido por una versión más nueva
- **CUANDO** el equipo consulta el estado de un proyecto producido por una versión más nueva de la herramienta
- **ENTONCES** recibe un aviso explícito de esa situación, sin proponer una actualización hacia atrás y sin modificar nada

#### Escenario: REQ-ESQUEMA-001-S5 — La consulta no modifica el proyecto
- **CUANDO** el equipo consulta el estado de un proyecto desactualizado
- **ENTONCES** los elementos del proyecto quedan idénticos a como estaban antes de la consulta

### Requisito: REQ-ESQUEMA-002 — Previsualizar la actualización sin tocar el proyecto
El equipo necesita ver de antemano qué cambiaría una actualización, elemento por elemento, para aprobar el efecto antes de aplicarla y poder planificar su respaldo.

- Regla BR-ESQUEMA-003: La previsualización describe con exactitud lo que la actualización escribiría y deja el proyecto intacto: lo previsualizado y lo aplicado coinciden.

#### Escenario: REQ-ESQUEMA-002-S1 — Vista previa con cambios pendientes
- **CUANDO** el equipo previsualiza la actualización de un proyecto desactualizado
- **ENTONCES** recibe por cada elemento afectado qué versión tiene y a cuál pasaría, junto con el resumen de la diferencia

#### Escenario: REQ-ESQUEMA-002-S2 — Vista previa sin cambios pendientes
- **CUANDO** el equipo previsualiza la actualización de un proyecto que ya está al día
- **ENTONCES** recibe que no hay nada que actualizar, sin listar elementos

#### Escenario: REQ-ESQUEMA-002-S3 — Elemento ilegible
- **CUANDO** la previsualización encuentra un elemento del estado que no puede interpretar
- **ENTONCES** lo reporta con su ubicación y no lo toca ni lo reemplaza, y el resto de la vista previa continúa

#### Escenario: REQ-ESQUEMA-002-S4 — El proyecto permanece idéntico tras la vista previa
- **CUANDO** el equipo termina de previsualizar una actualización con cambios pendientes
- **ENTONCES** los elementos del proyecto quedan idénticos a como estaban antes de la previsualización

### Requisito: REQ-ESQUEMA-003 — Aplicar la actualización con respaldo recuperable
El equipo necesita actualizar el proyecto al estado vigente sin riesgo de perder información ni quedar a medias, para poder seguir trabajando con la versión actual y volver atrás si algo sale mal.

- Regla BR-ESQUEMA-004: Antes de escribir, se conserva un respaldo del estado previo en una ubicación separada; el respaldo es la fuente de la reversión.
- Regla BR-ESQUEMA-005: La aplicación es todo o nada: o el proyecto queda por completo en la versión vigente, o queda exactamente como estaba antes de intentarlo.
- Regla BR-ESQUEMA-006: Aplicar dos veces seguidas produce el mismo resultado que aplicar una vez: la segunda vez no cambia nada.

#### Escenario: REQ-ESQUEMA-003-S1 — Aplicación exitosa
- **CUANDO** el equipo aplica la actualización a un proyecto desactualizado
- **ENTONCES** el estado guardado del proyecto corresponde a la versión vigente y recibe un aviso con el resultado y la ubicación del respaldo

#### Escenario: REQ-ESQUEMA-003-S2 — Aplicación sin cambios pendientes
- **CUANDO** el equipo aplica la actualización a un proyecto que ya está al día
- **ENTONCES** no se escribe ningún elemento ni se crea un respaldo, y recibe que no había nada que actualizar

#### Escenario: REQ-ESQUEMA-003-S3 — Falla a mitad de la aplicación
- **CUANDO** la aplicación falla antes de terminar
- **ENTONCES** el proyecto queda exactamente como estaba antes de intentarlo y recibe el motivo de la falla

#### Escenario: REQ-ESQUEMA-003-S4 — Sin permiso para escribir
- **CUANDO** el equipo aplica la actualización en una ubicación donde no puede escribir
- **ENTONCES** no se modifica ningún elemento, el proyecto queda intacto y recibe un aviso explícito de falta de permiso

#### Escenario: REQ-ESQUEMA-003-S5 — Aplicación repetida
- **CUANDO** el equipo aplica la actualización por segunda vez consecutiva sobre un proyecto ya actualizado por la primera
- **ENTONCES** los elementos del proyecto quedan idénticos a como quedaron tras la primera aplicación

#### Escenario: REQ-ESQUEMA-003-S6 — Respaldo completo del estado previo
- **CUANDO** una aplicación termina con éxito
- **ENTONCES** el respaldo conserva todos los elementos del estado tal como estaban antes de la aplicación

### Requisito: REQ-ESQUEMA-004 — Volver al estado anterior a una actualización
El equipo necesita deshacer una actualización aplicada, por ejemplo si descubre un efecto no deseado, y recuperar el estado guardado tal como estaba antes, sin editar elementos a mano.

- Regla BR-ESQUEMA-007: Volver atrás restaura el estado previo conservado en el respaldo y consume ese respaldo: una reversión solo puede ocurrir una vez por aplicación.

#### Escenario: REQ-ESQUEMA-004-S1 — Reversión con respaldo disponible
- **CUANDO** el equipo vuelve atrás una actualización aplicada y existe su respaldo
- **ENTONCES** el estado guardado del proyecto queda idéntico al que tenía antes de la aplicación y recibe el aviso del resultado

#### Escenario: REQ-ESQUEMA-004-S2 — Reversión sin respaldo
- **CUANDO** el equipo vuelve atrás un proyecto actualizado cuyo respaldo ya no está disponible
- **ENTONCES** no se modifica ningún elemento y recibe un aviso explícito de que no hay nada que restaurar

#### Escenario: REQ-ESQUEMA-004-S3 — Trabajo en curso durante la actualización
- **CUANDO** el proyecto tenía trabajo en curso (cambios y evidencias registradas) antes de la aplicación y luego se vuelve atrás
- **ENTONCES** ese trabajo en curso vuelve tal como estaba antes de la aplicación

#### Escenario: REQ-ESQUEMA-004-S4 — Reversión repetida
- **CUANDO** el equipo intenta volver atrás una segunda vez la misma aplicación
- **ENTONCES** recibe que no hay nada que restaurar y los elementos del proyecto quedan sin cambios

### Requisito: REQ-ESQUEMA-005 — El proyecto nuevo nace al día
Quien inicia un proyecto con la herramienta necesita que nazca en la versión vigente, para que la actualización nunca sea un paso necesario el primer día.

- Regla BR-ESQUEMA-008: Todo estado que la herramienta genera de nuevo queda registrado en la versión vigente en el mismo momento de su creación.

#### Escenario: REQ-ESQUEMA-005-S1 — Proyecto recién iniciado
- **CUANDO** el equipo inicia un proyecto y consulta si está al día
- **ENTONCES** no recibe ningún aviso de actualización pendiente

#### Escenario: REQ-ESQUEMA-005-S2 — Cambio y aprobación recién creados
- **CUANDO** el equipo crea un cambio y registra una aprobación en un proyecto al día
- **ENTONCES** los elementos creados quedan en la versión vigente y la siguiente consulta no reporta actualización pendiente

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados


