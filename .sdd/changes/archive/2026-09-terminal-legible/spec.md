# Delta — La terminal se lee de un vistazo

## Requisitos agregados

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

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: cli -->
