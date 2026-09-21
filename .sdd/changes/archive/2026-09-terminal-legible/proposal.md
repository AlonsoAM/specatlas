# Propuesta — La terminal se lee de un vistazo

## Por qué

Como desarrollador que vive en la terminal, quiero que la herramienta me diga en qué punto está el trabajo sin tener que leer cada línea, para saber de un golpe de vista si puedo seguir o si algo me detiene.

Hoy todo sale con el mismo peso: el estado de un cambio, el avance, lo que bloquea y lo que solo avisa comparten tipografía, color y sangría. Un hallazgo que detiene el trabajo se lee igual que una nota informativa, y el recuento final —«0 errores, 1 avisos, 0 notas»— obliga a interpretar tres cifras para saber si hay algo que hacer. En una respuesta larga, lo importante se pierde entre lo demás.

Tampoco se adapta a dónde va: escribe igual en una terminal que en un archivo de registro o en una tubería hacia otro programa.

## Qué cambia

- Cada respuesta abre con su **título** y, cuando aporta, el **contexto del proyecto** alineado a la derecha.
- Lo que bloquea, lo que avisa y lo que va bien se distinguen por **color y por una marca propia**, así que siguen distinguiéndose sin color.
- El avance de tareas y evidencia se muestra de forma **proporcional**, además del número.
- La **siguiente acción** se destaca y dice quién la ejecuta: el asistente, una persona o la propia herramienta.
- Los hallazgos se presentan en orden: marca, código, dónde ocurre, qué pasa y qué hacer.
- La presentación **se adapta a su destino**: texto plano cuando la salida no es una terminal, equivalentes simples donde no se dibujan símbolos ampliados, y ancho ajustado al de la ventana.

## Fuera de alcance

- La salida destinada a otro programa, que ya va sin adornos y no cambia.
- El contenido de las respuestas: cambia cómo se presentan, no lo que dicen ni lo que deciden.
- Los documentos generados (propuesta, documentación, informes), que tienen su propio diseño.
- La traducción de la interfaz.

## Cómo se mide el éxito

- Distinguir un hallazgo que detiene de uno que solo avisa deja de exigir leer su texto.
- El avance de un cambio se capta sin interpretar cifras.
- La misma respuesta guardada en un archivo de registro se lee limpia, sin marcas de color.
- En una consola que no dibuja símbolos ampliados, la salida sigue siendo legible.
