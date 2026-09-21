# Delta — La ayuda es la portada de la herramienta

## Requisitos agregados

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

## Requisitos modificados

## Requisitos eliminados

## Requisitos renombrados

<!-- dominio del cambio: cli -->
