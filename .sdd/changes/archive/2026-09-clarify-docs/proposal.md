# Propuesta — Aclarar la especificación antes de planificar y documentar el cambio

## Por qué
Hoy una especificación puede quedar con supuestos y preguntas abiertas que nadie vacía: se aprueba y se planifica sobre huecos, y los huecos aparecen construyendo. Y en el carril completo el cierre no deja documentación: quien mantiene el sistema tiene que reconstruir lo hecho leyendo el historial. La arquitectura ya promete ambas fases; faltan.

## Qué cambia
- **Aclarar** (después de especificar, antes de aprobar y planificar): entrevista que resuelve supuestos, dependencias y preguntas abiertas; las respuestas quedan registradas en el cambio, el resumen se refleja en la propuesta y, si una respuesta cambia lo especificado, la firma queda obsoleta hasta volver a aprobar.
- **Aviso de aclaración pendiente** configurable (apagado · aviso · bloqueante): en aviso no frena el avance; en bloqueante no se llega a plan mientras queden preguntas.
- **Documentar** (carril completo): documento técnico y manual en el cambio, construidos desde plantillas y la **evidencia real**; sin evidencia se señala lo que falta; regenerar no duplica secciones ni pierde lo editado a mano.
- **Documentación pendiente** bloquea el archivado del carril completo cuando el modo es bloqueante; en el carril estándar no estorba.
- Las dos fases quedan disponibles **para el agente y para la terminal**, con la misma semántica sobre el mismo cambio.

## Fuera de alcance
- Exportar la documentación a otros formatos (PDF/HTML) o publicarla fuera del repositorio.
- Reescribir especificaciones aprobadas sin pasar por la firma: la aclaración obliga a re-aprobar.
- Documentación automática del código fuente.

## Cómo se mide el éxito
- Un cambio con preguntas abiertas no llega a plan sin que alguien las haya respondido o aceptado (según el modo configurado).
- En carril completo no se archiva sin los dos documentos (según el modo) y ambos salen de la evidencia registrada.
- Aclarar y documentar se lanzan desde la terminal y desde el agente con el mismo resultado.
