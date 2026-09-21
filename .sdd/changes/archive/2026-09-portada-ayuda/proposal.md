# Propuesta — La ayuda es la portada de la herramienta

## Por qué
La ayuda es la primera pantalla que ve quien instala la herramienta y la que más se repite para quien ya la usa a diario. Hoy responde con una lista plana de casi cuarenta comandos en orden de catálogo: no dice qué herramienta es, ni para qué sirve, ni por dónde empezar. Quien llega nuevo no sabe cuál de todos esos nombres necesita, y quien ya la conoce tampoco encuentra rápido el que buscaba. Una herramienta que exige verificar el proceso no puede presentarse como un volcado de nombres.

## Qué cambia
La ayuda se convierte en una portada: se presenta con el distintivo de la herramienta, la versión instalada y la frase que dice para qué sirve; destaca antes que nada la orden que indica qué toca hacer ahora en el proyecto; y agrupa los comandos por el momento del flujo en que se usan (empezar, el ciclo, saber dónde estás, comprobar, compartir, el proyecto), cada grupo con su propósito en una frase. Preguntar por un comando concreto devuelve solo su uso y sus opciones. La ayuda cierra diciendo qué significa cada resultado de la ejecución y dónde consultar más.

## Fuera de alcance
- Cambiar los comandos, sus opciones o su comportamiento: solo cambia cómo se presentan.
- Reescribir las descripciones del catálogo.
- La presentación del resto de comandos (estado, validación, verificación), ya cubierta por REQ-CLI-004 y REQ-CLI-005.

## Cómo se mide el éxito
- Ningún comando del catálogo queda fuera de la ayuda, comprobado automáticamente.
- Ninguna línea de la ayuda se sale del ancho de la terminal.
- La ayuda se reconoce igual en una consola sin color y sin símbolos ampliados.
- Pedir la ayuda de un comando devuelve su uso y sus opciones, y un nombre inexistente se avisa con el código de uso.
