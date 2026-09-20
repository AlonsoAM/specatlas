# Propuesta — Consultar el estado del proyecto desde el asistente

## Por qué

Hoy el estado del proyecto vive en la terminal y en los artefactos: fases, gates pendientes, hallazgos, cobertura y glosario. Cuando el equipo trabaja con asistentes, alguien tiene que llevar ese contexto a la conversación o el asistente responde con suposiciones: propone pasos ya hechos, ignora bloqueos vigentes o usa términos que no son los del negocio.

## Qué cambia

El asistente podrá consultar el estado vigente del proyecto directamente:

- **Estado**: cambios activos con fase, avance de tareas y evidencia, y bloqueos.
- **Siguiente acción**: el paso recomendado, señalando si requiere una persona.
- **Hallazgos y cobertura**: validación y trazabilidad vigentes, tal como los ve el equipo.
- **Impacto**: qué se relaciona con un requisito o un archivo.
- **Glosario**: términos del negocio con su definición vigente.

Todas las consultas son **de solo lectura**: la vía nunca modifica el proyecto.

## Fuera de alcance

- Ejecutar acciones que cambian el proyecto desde el asistente (aprobar, firmar, archivar, editar artefactos): siguen siendo actos humanos por los canales actuales.
- Consultar métricas históricas o costos.
- Cualquier consulta que requiera salir del proyecto o acceder a recursos externos.

## Cómo se mide el éxito

- El 100 % de las respuestas coincide con lo que el proyecto reporta en el mismo instante (comprobado en la verificación).
- Cero modificaciones a los archivos del proyecto atribuibles a la vía de consulta.
- Un asistente puede responder «¿qué sigue en este cambio?» sin que una persona pegue contexto.
