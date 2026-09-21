---
domain: cli
title: Mantener la herramienta al día
version: 3
updated: 2026-09-21
---

# Mantener la herramienta al día

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

### Requisito: REQ-CLI-004 — Lo que pasó se distingue sin leerlo entero
La herramienta responde con muros de texto en los que todo pesa igual: el estado de un cambio, lo que bloquea y lo que solo avisa se leen con el mismo esfuerzo. Quien trabaja con ella todo el día necesita distinguir de un vistazo lo que va bien de lo que le detiene.

- Regla BR-CLI-015: cada respuesta abre con su título y, cuando aporta, el contexto del proyecto alineado al ancho de la terminal.
- Regla BR-CLI-016: lo que bloquea, lo que avisa y lo que va bien se distinguen por color y por una marca propia, de modo que se reconocen también sin color.
- Regla BR-CLI-017: el avance de tareas y evidencia se representa de forma proporcional, además del número.
- Regla BR-CLI-018: la siguiente acción se destaca del resto y declara quién la ejecuta.
- Regla BR-CLI-019: las columnas quedan alineadas aunque el texto lleve color.

#### Escenario: REQ-CLI-004-S1 — El estado del trabajo
- **CUANDO** se consulta el estado con cambios en curso
- **ENTONCES** cada cambio muestra su marca de fase, su avance proporcional y su siguiente acción destacada

#### Escenario: REQ-CLI-004-S2 — Un hallazgo que detiene
- **CUANDO** una comprobación encuentra algo que bloquea
- **ENTONCES** se presenta con su marca, su código, dónde ocurre, qué pasa y qué hacer, en ese orden

#### Escenario: REQ-CLI-004-S3 — Todo en orden
- **CUANDO** una comprobación termina sin hallazgos
- **ENTONCES** lo declara con una marca de conformidad, sin obligar a leer el detalle

#### Escenario: REQ-CLI-004-S4 — Recuento final
- **CUANDO** una respuesta incluye hallazgos de distinto peso
- **ENTONCES** termina con el recuento de cada tipo, en singular o plural según corresponda

#### Escenario: REQ-CLI-004-S5 — Sin hallazgos que contar
- **CUANDO** una respuesta no tiene ningún hallazgo
- **ENTONCES** no aparece ningún recuento

### Requisito: REQ-CLI-005 — La presentación se adapta a dónde va la salida
La misma respuesta puede acabar en una terminal, en un archivo de registro, en una tubería hacia otro programa o en una consola que no dibuja símbolos. Si la herramienta escribe siempre igual, o ensucia lo que otro va a leer o se ve rota.

- Regla BR-CLI-020: cuando la salida no es una terminal interactiva, se escribe en texto plano.
- Regla BR-CLI-021: se respeta la preferencia de no usar color, y también la de forzarlo.
- Regla BR-CLI-022: en una consola que no dibuja símbolos ampliados se usan equivalentes simples, sin perder el significado.
- Regla BR-CLI-023: el ancho de la presentación se adapta al de la terminal, entre un mínimo y un máximo legibles.
- Regla BR-CLI-024: la salida destinada a otro programa no lleva ningún adorno.

#### Escenario: REQ-CLI-005-S1 — La salida va a un archivo o a otro programa
- **CUANDO** la respuesta no se escribe en una terminal interactiva
- **ENTONCES** sale en texto plano, sin marcas de color

#### Escenario: REQ-CLI-005-S2 — Preferencia de no usar color
- **CUANDO** el entorno declara que no se use color
- **ENTONCES** la respuesta sale en texto plano aunque haya terminal

#### Escenario: REQ-CLI-005-S3 — Color forzado
- **CUANDO** el entorno pide forzar el color
- **ENTONCES** la respuesta lo usa aunque la salida no sea una terminal

#### Escenario: REQ-CLI-005-S4 — Consola sin símbolos ampliados
- **CUANDO** la consola no dibuja los símbolos ampliados
- **ENTONCES** se usan equivalentes simples con el mismo significado

#### Escenario: REQ-CLI-005-S5 — Terminal muy ancha o muy estrecha
- **CUANDO** la terminal es más ancha o más estrecha que lo legible
- **ENTONCES** la presentación se mantiene dentro de sus límites

### Requisito: REQ-CLI-006 — La ayuda presenta la herramienta y orienta, no solo enumera
Quien escribe la orden sin argumentos, o pide ayuda, recibe hoy una lista plana de casi cuarenta comandos en la que todo pesa igual: no sabe qué herramienta tiene delante, ni para qué sirve, ni por dónde empezar, ni cuál de todos los comandos es el que necesita ahora. La ayuda es la primera pantalla que ve una persona nueva y la que más se repite para quien ya la usa, así que debe presentarse, ordenar los comandos por el momento en que se usan y dejar a la vista la acción que casi siempre se quiere.

- Regla BR-CLI-025: la ayuda abre identificando la herramienta con su nombre escrito en grande, su versión instalada y, en una línea, para qué sirve.
- Regla BR-CLI-032: el nombre se presenta con los colores de la marca; donde la terminal no los dibuja, se presenta igual de legible en un solo color.
- Regla BR-CLI-026: los comandos se presentan agrupados por el momento del flujo en que se usan, cada grupo con un título y una frase que dice para qué es.
- Regla BR-CLI-027: ningún comando de la herramienta queda fuera de la ayuda, aunque el catálogo crezca y los grupos no se actualicen.
- Regla BR-CLI-028: antes del catálogo se destaca la orden que indica qué toca hacer a continuación en el proyecto.
- Regla BR-CLI-029: ninguna línea de la ayuda excede el ancho de la terminal: lo que no cabe se recorta declarando que hay más.
- Regla BR-CLI-030: preguntar por un comando concreto devuelve su uso y sus opciones, no el catálogo entero.
- Regla BR-CLI-031: la ayuda cierra diciendo qué significa cada resultado de la ejecución y dónde consultar más.

#### Escenario: REQ-CLI-006-S1 — La primera pantalla
- **CUANDO** se pide la ayuda sin indicar ningún comando
- **ENTONCES** la respuesta abre con el nombre de la herramienta en grande, su versión y la frase de para qué sirve, antes de cualquier comando

#### Escenario: REQ-CLI-006-S8 — Una terminal que no dibuja el nombre en grande
- **CUANDO** la terminal no dibuja los caracteres del nombre en grande, o la ventana es más estrecha que ese nombre
- **ENTONCES** la portada presenta el nombre escrito de forma normal, sin perder la versión ni la frase de para qué sirve

#### Escenario: REQ-CLI-006-S2 — Por dónde empezar
- **CUANDO** se lee la ayuda completa
- **ENTONCES** la orden que indica qué toca hacer a continuación aparece destacada antes del catálogo de comandos

#### Escenario: REQ-CLI-006-S3 — Los comandos ordenados por momento
- **CUANDO** se lee el catálogo de la ayuda
- **ENTONCES** los comandos aparecen en grupos titulados por el momento del flujo, cada uno con su frase de propósito

#### Escenario: REQ-CLI-006-S4 — Nada se queda fuera
- **CUANDO** existe un comando que ningún grupo declara
- **ENTONCES** aparece igualmente en la ayuda, bajo un grupo final

#### Escenario: REQ-CLI-006-S5 — La ayuda de un comando
- **CUANDO** se pide la ayuda de un comando concreto
- **ENTONCES** se muestran solo su uso y sus opciones, sin el catálogo

#### Escenario: REQ-CLI-006-S6 — Un comando que no existe
- **CUANDO** se pide la ayuda de un nombre que no corresponde a ningún comando
- **ENTONCES** se avisa de que no existe, se indica cómo ver el catálogo y no se muestra ayuda inventada

#### Escenario: REQ-CLI-006-S7 — Una terminal estrecha o sin adornos
- **CUANDO** la ayuda se muestra en una consola que no dibuja símbolos ampliados o que no usa color
- **ENTONCES** el distintivo y los grupos siguen reconociéndose con equivalentes simples y ninguna línea se sale del ancho
