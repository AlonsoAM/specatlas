# Propuesta — Rediseño del panel lateral y la extensión

## Por qué

Como desarrollador que trabaja con el flujo todos los días, quiero abrir el editor y ver de inmediato qué me toca hacer, para no perder tiempo recordando en qué fase quedó cada cambio ni recorriendo el árbol del proyecto.

Hoy el panel lateral muestra el proyecto como un árbol: para llegar a la acción que toca hay que abrir el nodo del proyecto, luego el grupo de cambios, luego el cambio. La información más útil —qué sigue, qué está bloqueado, qué detiene el avance— queda a tres niveles de profundidad. Los hallazgos llegan como una lista plana donde un aviso menor pesa lo mismo que algo que detiene el trabajo. Y lo que el flujo aprendió a comprobar recientemente —si el código se movió por debajo de las specs vivas y si la revisión quedó cerrada— no se ve en ninguna parte del editor.

## Qué cambia

- El panel lateral abre con una sección dedicada a **lo que toca hacer ahora**: el cambio en curso desplegado, su siguiente acción como primer elemento, quién la ejecuta, y junto a ella los bloqueos, el avance de tareas y evidencia, la revisión y los mockups.
- Una sección de **salud** agrupa los hallazgos por lo que hay que hacer con ellos: los que bloquean el avance, los que solo avisan y la deriva entre las specs vivas y el código. Cada hallazgo abre su archivo y permite consultar la explicación de su código.
- El **estado del trabajo acompaña en la barra del editor**: el cambio en foco y el paso que toca, distinguido visualmente cuando está bloqueado.
- El proyecto que todavía no usa el flujo recibe una **bienvenida** que explica qué es y ofrece inicializarlo o adoptarlo.
- El árbol del workspace deja de anidar todo bajo el nombre del proyecto cuando solo hay uno, y los cambios pasan a estar arriba.
- El panel principal suma la sección **Código**, que relaciona las specs vivas con el repositorio: referencias comprobadas, las que dejaron de existir y el estado de la revisión.

## Fuera de alcance

- La lógica del flujo (fases, gates, trazabilidad): no cambia ninguna regla, solo cómo se ve y se alcanza.
- La presentación para aprobar y la documentación generada, que ya se rediseñaron.
- El servidor de lenguaje y los diagnósticos en el archivo abierto.
- Cualquier cambio en los artefactos del proyecto (`.sdd/`): el rediseño no altera lo que se guarda.

## Cómo se mide el éxito

- Llegar a la siguiente acción pasa de tres aperturas del árbol a ninguna: está visible al abrir el editor.
- Un hallazgo que detiene el avance se distingue de un aviso sin leer su texto.
- La deriva entre las specs vivas y el código es visible en el editor, no solo en la terminal.
- Un proyecto que no usa el flujo ofrece su primera acción sin documentación externa.
