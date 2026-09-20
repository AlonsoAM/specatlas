# Propuesta — Ver los hallazgos en GitHub y ejecutar el gate en cada PR

## Por qué
La comprobación continua ya corre en la terminal, pero sus hallazgos viven fuera de la revisión: quien revisa una propuesta de cambio no ve el archivo ni la línea señalados y depende de que alguien pegue la salida. Además, cada proyecto que quiere el gate en sus propuestas debe escribir sus propios pasos de flujo automático. SpecAtlas es una herramienta global: debe integrarse sola, con un solo paso y sin preparar cada proyecto.

## Qué cambia
- La comprobación continua puede emitir un **informe de hallazgos en el formato estándar que muestran las revisiones de código**, con cada hallazgo anotado en su archivo y línea, las reglas descritas una sola vez y ubicaciones relativas al proyecto.
- Un **paso oficial reutilizable** que cualquier proyecto añade con una línea: obtiene la herramienta de su distribución pública (con versión fijable), corre la comprobación, publica el informe y **bloquea la propuesta cuando el gate falla** (avisos incluidos en modo estricto).
- El veredicto publicado es **idéntico al local**; el informe nunca lo altera. Sin hallazgos, el informe es válido y vacío.
- El informe **no expone contenido de archivos ni credenciales**; el veredicto **no depende de la red**; publicar el informe no es requisito para bloquear.

## Fuera de alcance
- Otros servicios de revisión de código aparte de GitHub (GitLab, Bitbucket, etc.).
- Publicar los hallazgos como incidencias o tareas en un gestor externo.
- Telemetría o envío de datos a servicios de SpecAtlas.

## Cómo se mide el éxito
- Un proyecto añade la comprobación a sus propuestas con una sola línea, sin pasos previos ni dependencias propias.
- En una propuesta con hallazgos, la revisión los muestra anotados en archivo y línea; sin hallazgos, el informe es válido y declara cero.
- El paso falla exactamente cuando la comprobación local falla con la misma configuración (estricto o no).
- El informe no contiene rutas absolutas, contenido de archivos ni credenciales; el veredicto se emite sin conexión.
