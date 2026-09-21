# Análisis de consistencia — portada ayuda

## Para qué sirve este informe

El análisis es el control de consistencia cruzada del cambio: **no prueba el código** (eso lo hace la verificación) sino que comprueba que los artefactos encajan entre sí — que la especificación está bien formada, que cada requisito llega hasta una tarea y una evidencia, que el plan existe y que las tareas se pueden ejecutar en un orden sin ciclos.

Se ejecuta con `satlas analyze <cambio>` (o desde el paso «Analizar» del panel). Es un informe **derivado y regenerable**: se sobrescribe en cada ejecución y siempre refleja el estado actual de los artefactos, así que un informe viejo nunca se corrige a mano, se vuelve a generar.

## Resultado

- **Estado**: `passed` — sin hallazgos
- **Qué significa**: Las comprobaciones de consistencia pasaron: la especificación, la trazabilidad, el plan y las tareas encajan entre sí.
- **Siguiente paso**: El cambio puede continuar con la siguiente fase de su carril.
- **Hallazgos**: 0 error(es), 0 aviso(s), 0 informativo(s)
- **Evidencia**: 0/8 escenario(s) con evidencia favorable
- **Ejecución**: 1 bloque(s), 0 ola(s), 4 tarea(s)
- **Generado**: 2026-09-21 18:26:13 -05:00

## Qué se comprobó

| Comprobación | Qué pregunta | Resultado | Detalle |
|---|---|---|---|
| **Especificación del cambio** | ¿El delta está bien formado y no choca con las specs vivas? | ✅ ok | 1 requisito(s), 8 escenario(s) · 0 hallazgo(s) |
| **Trazabilidad** | ¿Cada requisito tiene escenarios y cada escenario una tarea que lo cubra? | ✅ ok | 0 hallazgo(s) de trazabilidad |
| **Tareas y olas de ejecución** | ¿Las dependencias entre tareas forman un orden ejecutable, sin ciclos? | ✅ ok | 4 tarea(s) en 1 bloque(s) · 4/4 hechas · 0 ola(s) pendiente(s) |
| **Plan técnico** | ¿Existe el plan y tiene las secciones que la fase exige? | ✅ ok | plan.md presente · 0 hallazgo(s) |
| **Evidencia** | ¿Cada escenario tiene evidencia real registrada en verify.md? | ⚠️ avisos | 0 de 8 escenario(s) con evidencia favorable |

## Hallazgos (0 errores, 0 avisos)

Sin hallazgos: ninguna comprobación encontró inconsistencias entre los artefactos del cambio.
