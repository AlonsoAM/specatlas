# Análisis de consistencia — Primeros pasos, plantillas y comprobaciones del editor

## Para qué sirve este informe

El análisis es el control de consistencia cruzada del cambio: **no prueba el código** (eso lo hace la verificación) sino que comprueba que los artefactos encajan entre sí — que la especificación está bien formada, que cada requisito llega hasta una tarea y una evidencia, que el plan existe y que las tareas se pueden ejecutar en un orden sin ciclos.

Se ejecuta con `satlas analyze <cambio>` (o desde el paso «Analizar» del panel). Es un informe **derivado y regenerable**: se sobrescribe en cada ejecución y siempre refleja el estado actual de los artefactos, así que un informe viejo nunca se corrige a mano, se vuelve a generar.

## Resultado

- **Estado**: `passed` — sin hallazgos
- **Qué significa**: Las comprobaciones de consistencia pasaron: la especificación, la trazabilidad, el plan y las tareas encajan entre sí.
- **Siguiente paso**: El cambio puede continuar con la siguiente fase de su carril.
- **Hallazgos**: 0 error(es), 0 aviso(s), 0 informativo(s)
- **Evidencia**: 11/11 escenario(s) con evidencia favorable
- **Ejecución**: 4 bloque(s), 0 ola(s), 7 tarea(s)
- **Generado**: 2026-09-21 16:58:57 -05:00

## Qué se comprobó

| Comprobación | Qué pregunta | Resultado | Detalle |
|---|---|---|---|
| **Especificación del cambio** | ¿El delta está bien formado y no choca con las specs vivas? | ✅ ok | 4 requisito(s), 11 escenario(s) · 0 hallazgo(s) |
| **Trazabilidad** | ¿Cada requisito tiene escenarios y cada escenario una tarea que lo cubra? | ✅ ok | 0 hallazgo(s) de trazabilidad |
| **Tareas y olas de ejecución** | ¿Las dependencias entre tareas forman un orden ejecutable, sin ciclos? | ✅ ok | 7 tarea(s) en 4 bloque(s) · 7/7 hechas · 0 ola(s) pendiente(s) |
| **Plan técnico** | ¿Existe el plan y tiene las secciones que la fase exige? | ✅ ok | plan.md presente · 0 hallazgo(s) |
| **Evidencia** | ¿Cada escenario tiene evidencia real registrada en verify.md? | ✅ ok | 11 de 11 escenario(s) con evidencia favorable |

## Hallazgos (0 errores, 0 avisos)

Sin hallazgos: ninguna comprobación encontró inconsistencias entre los artefactos del cambio.
