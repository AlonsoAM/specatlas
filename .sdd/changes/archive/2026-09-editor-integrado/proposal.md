# Propuesta — El editor, integrado con el trabajo

## Por qué

Como desarrollador que tiene el editor abierto todo el día, quiero que el panel del flujo esté donde estoy trabajando y me diga el estado de cada artefacto sin abrirlo, para dejar de saltar entre ventanas y de comprobar a mano en qué punto está cada cosa.

Tres cosas rompen hoy esa continuidad. La primera: abro la especificación de un cambio y el panel sigue mostrando otro, así que las acciones que ofrece no son las de lo que tengo delante. La segunda: cuando la ventana tiene dos carpetas de proyecto, el estado, la salud y el asistente que se abre corresponden solo a la primera, mientras el árbol lista los cambios de todas — veo una cosa y actúo sobre otra. La tercera: el editor ofrece acciones que no puede ejecutar (en un proyecto sin inicializar todas están disponibles y no hacen nada) y un ajuste de idioma que no cambia nada.

## Qué cambia

- El panel **sigue al archivo abierto**: entrar en un artefacto selecciona su cambio y las acciones pasan a ser las suyas; un archivo ajeno al flujo no altera nada.
- Los **archivos del flujo llevan su estado** junto al nombre: lo que bloquea el avance se distingue de lo que solo avisa, y tiene prioridad sobre la fase.
- Una **tarea se marca como hecha desde el panel**, y queda escrita en el artefacto sin tocar lo demás que declara.
- La ventana con **más de una carpeta** funciona de verdad: el trabajo en curso, la salud y el recuento abarcan todas; cada cambio dice de qué proyecto es y se ejecuta con el asistente de ese proyecto.
- El editor **solo ofrece lo que puede hacer**, y el ajuste sin efecto desaparece.

## Fuera de alcance

- La lógica del flujo, sus fases y sus gates: no cambia ninguna regla.
- El panel principal y sus secciones, que se rediseñaron en el cambio anterior.
- La traducción de la interfaz a otro idioma: el ajuste que la prometía se retira en vez de quedarse sin efecto.
- El servidor de lenguaje y sus diagnósticos dentro del archivo.

## Cómo se mide el éxito

- Abrir un artefacto deja el panel apuntando a ese cambio, sin ningún clic adicional.
- Un artefacto con hallazgos que bloquean se distingue de uno sano sin abrir ninguno de los dos.
- Marcar una tarea deja de exigir editar el markdown a mano.
- Con dos carpetas abiertas, lo que muestra el panel y lo que ejecuta la acción son el mismo proyecto.
- Ninguna acción ofrecida termina sin efecto ni explicación.
