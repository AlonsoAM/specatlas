## Inicializar el proyecto

SpecAtlas guarda todo su estado en `.sdd/`, dentro de tu repositorio: nada vive en una base de datos ajena ni en la nube.

- **Especificaciones vivas** (`.sdd/specs/`) — el comportamiento vigente, en lenguaje de negocio.
- **Cambios** (`.sdd/changes/`) — el trabajo en curso: propuesta, especificación, plan, tareas y evidencia.
- **Firmas** (`.sdd/approvals.yaml`) — quién aprobó qué, con su fecha y la huella del documento.

Al inicializar se detecta tu stack y se compilan los comandos de tu asistente, de modo que las fases del flujo quedan disponibles en el chat con su propia sintaxis.

Si el proyecto ya existe y tiene código, **Adoptar** levanta el inventario y deja las especificaciones base para completarlas.
