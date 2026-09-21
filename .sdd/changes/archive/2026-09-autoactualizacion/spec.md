# Delta — Mantener la herramienta al día

## Requisitos agregados

### Requisito: REQ-CLI-001 — La herramienta avisa cuando se queda atrás
Quien usa la herramienta no revisa el registro de paquetes para ver si hay una versión nueva, así que trabaja meses con una versión antigua sin enterarse: sin las correcciones y sin las comprobaciones que se añadieron después. La herramienta debe avisarlo ella misma, sin estorbar y sin ralentizar el trabajo.

- Regla BR-CLI-001: cuando hay una versión más reciente que la instalada, se avisa con la versión disponible y con la forma de actualizarla.
- Regla BR-CLI-002: la comprobación se hace como mucho una vez al día y su resultado se recuerda entre ejecuciones.
- Regla BR-CLI-003: el aviso nunca altera el resultado de lo que se pidió: ni cambia el veredicto, ni el código de salida, ni aparece en las salidas destinadas a otro programa.
- Regla BR-CLI-004: si la comprobación no responde en 2 segundos, se abandona sin avisar y sin error.
- Regla BR-CLI-005: en una máquina de integración continua no se comprueba nada.

#### Escenario: REQ-CLI-001-S1 — Hay una versión más reciente
- **CUANDO** se ejecuta cualquier comando con una versión anterior a la publicada
- **ENTONCES** al terminar se indica la versión disponible y cómo actualizarla

#### Escenario: REQ-CLI-001-S2 — Ya está al día
- **CUANDO** la versión instalada es la publicada
- **ENTONCES** no se muestra ningún aviso

#### Escenario: REQ-CLI-001-S3 — Ya se comprobó hoy
- **CUANDO** ya se comprobó en las últimas 24 horas
- **ENTONCES** se reutiliza lo comprobado y no se vuelve a consultar

#### Escenario: REQ-CLI-001-S4 — Sin conexión o con el registro lento
- **CUANDO** el registro de paquetes no responde en 2 segundos
- **ENTONCES** el comando termina con su resultado normal y sin aviso

#### Escenario: REQ-CLI-001-S5 — Salida para otro programa
- **CUANDO** se pide la salida en formato de intercambio o se ejecuta en integración continua
- **ENTONCES** no se comprueba ni se avisa

### Requisito: REQ-CLI-002 — Actualizar con una sola orden
Actualizar hoy exige recordar el gestor con que se instaló la herramienta y su orden exacta. Quien cambia de máquina o de gestor se equivoca, y quien no lo recuerda se queda como está.

- Regla BR-CLI-006: existe una orden que actualiza la herramienta a la versión publicada, sin pedir datos adicionales.
- Regla BR-CLI-007: la orden reconoce con qué gestor se instaló la herramienta y usa el suyo.
- Regla BR-CLI-008: antes de actualizar se dice qué versión hay y cuál se instalará; al terminar, cuál quedó.
- Regla BR-CLI-009: se puede consultar si hay versión nueva sin instalar nada.
- Regla BR-CLI-010: si la instalación falla, se explica el motivo y la orden que se puede ejecutar a mano, y la herramienta sigue funcionando con la versión que tenía.

#### Escenario: REQ-CLI-002-S1 — Actualizar a la última versión
- **CUANDO** se pide actualizar con una versión anterior instalada
- **ENTONCES** se instala la publicada con el gestor que corresponde y se informa de la versión resultante

#### Escenario: REQ-CLI-002-S2 — Ya está al día
- **CUANDO** se pide actualizar con la versión publicada ya instalada
- **ENTONCES** se indica que no hay nada que hacer y no se instala nada

#### Escenario: REQ-CLI-002-S3 — Consultar sin instalar
- **CUANDO** se pide solo consultar
- **ENTONCES** se informa de la versión instalada y de la publicada, sin instalar nada

#### Escenario: REQ-CLI-002-S4 — La instalación falla
- **CUANDO** el gestor no puede completar la instalación
- **ENTONCES** se explica el motivo, se ofrece la orden para ejecutarla a mano y la versión instalada sigue funcionando

#### Escenario: REQ-CLI-002-S5 — Instalada de una forma que no se puede actualizar sola
- **CUANDO** la herramienta se ejecuta sin estar instalada de forma permanente
- **ENTONCES** se indica que en ese modo cada ejecución ya usa la última versión y no se instala nada

### Requisito: REQ-CLI-003 — Actualización desatendida para quien la quiera
Hay equipos que prefieren no decidir nada: quieren la última versión siempre, sin avisos ni órdenes. Y hay equipos que necesitan lo contrario, porque fijan las versiones de sus herramientas. La herramienta debe permitir ambas cosas, y no cambiar sola sin que alguien lo haya pedido.

- Regla BR-CLI-011: la actualización desatendida está desactivada mientras nadie la active.
- Regla BR-CLI-012: con la actualización desatendida activada, al detectar una versión nueva se instala sin preguntar y se informa de lo ocurrido.
- Regla BR-CLI-013: la preferencia vale para la persona, no para un proyecto, y se puede consultar y cambiar con una orden.
- Regla BR-CLI-014: se puede desactivar por completo la comprobación, incluso el aviso.

#### Escenario: REQ-CLI-003-S1 — Por defecto no se actualiza sola
- **CUANDO** nadie ha activado la actualización desatendida y hay una versión nueva
- **ENTONCES** solo se avisa, sin instalar nada

#### Escenario: REQ-CLI-003-S2 — Con la actualización desatendida activada
- **CUANDO** está activada y se detecta una versión nueva
- **ENTONCES** se instala sin preguntar y se informa de la versión que quedó

#### Escenario: REQ-CLI-003-S3 — Consultar y cambiar la preferencia
- **CUANDO** se consulta la preferencia de actualización
- **ENTONCES** se indica su valor vigente y cómo cambiarlo

#### Escenario: REQ-CLI-003-S4 — Comprobación desactivada
- **CUANDO** la comprobación está desactivada
- **ENTONCES** no se consulta el registro ni se avisa, aunque haya versión nueva

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: cli -->
