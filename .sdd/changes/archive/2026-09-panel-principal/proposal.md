# Propuesta — Un panel principal único para la extensión

## Por qué
Hoy la herramienta reparte su información en ventanas separadas (matriz de trazabilidad, tablero y métricas) más las vistas de documentos y mockups. Quien trabaja en un cambio debe abrir una ventana por tema, alternar entre ellas y pierde el hilo de lo que está haciendo.

Como responsable de un cambio, quiero un único panel principal que reúna el estado, el flujo, la trazabilidad, las métricas, los documentos y las acciones, para trabajar sin dispersarme y tener un solo lugar donde mirar.

## Qué cambia
- Un **panel principal único** con secciones internas: Resumen, Flujo, Trazabilidad, Métricas y Documentos.
- Las **acciones del ciclo** (crear, validar, diagnosticar, compilar adaptadores, verificar, aprobar, archivar, mockups) se ofrecen desde el panel según el estado del proyecto y del cambio activo, con las mismas reglas y auditoría que ya existen.
- Los **documentos del cambio y sus mockups** se leen dentro del panel, sin ventanas adicionales.
- El panel **se mantiene al día** solo (refleja lo hecho desde la terminal o el asistente) y conserva la sección y los filtros en uso.
- **Desaparecen las ventanas independientes** de matriz, tablero y métricas: su información pasa al panel principal.

## Fuera de alcance
- No cambia el motor de la herramienta ni los comandos de terminal: la información, los cálculos y las reglas son los mismos.
- No se rediseña la vista lateral (el árbol) ni sus grupos.
- No se añaden indicadores nuevos ni se modifican los cálculos existentes.
- No se cambia el comportamiento de las acciones (aprobación, archivado, evidencia): solo su punto de acceso.
- No se soportan otros editores distintos del actual.

## Cómo se mide el éxito
- Toda la información de la herramienta se consulta en una sola ventana: cero ventanas independientes de matriz, tablero o métricas.
- Cada sección del panel queda a un clic, y cambiar de sección no abre ventanas nuevas.
- Los cambios hechos fuera del panel se ven sin recargar y sin perder la sección ni los filtros.
- Las acciones conservan su auditoría (nombre y fecha) y sus bloqueos por estado.
- La trazabilidad y las métricas del panel muestran los mismos datos que la terminal.
