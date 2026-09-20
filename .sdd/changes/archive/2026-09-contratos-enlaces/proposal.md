# Propuesta — Verificar contratos y compartir specs entre repos

## Por qué
Un cambio promete interfaces (servicios, consultas, mensajes) que hoy no se comprueban en ningún punto del ciclo: el contrato roto se descubre al integrar, no al especificar. Y cuando las specs viven repartidas entre repos (monorepo y polyrepo), no hay forma de consultarlas juntas sin copiarlas: la trazabilidad y el impacto se quedan dentro de un solo proyecto.

## Qué cambia
- Los **contratos del cambio** (descripción de servicios, esquema de consultas y definición de mensajes) se declaran junto al cambio y se comprueban **localmente**, sin red: forma y **cobertura cruzada** (operación sin escenario y referencia rota), con modo apagado · aviso · bloqueante.
- **`satlas link`** registra enlaces locales a otros proyectos; sus specs se consultan en **solo lectura** y un enlace caído avisa sin romper el trabajo local.
- La **trazabilidad y el impacto** distinguen local y externo, con el proyecto de origen, y reportan las referencias no resueltas.
- Todo queda disponible en la **terminal** y en la **vía de consulta para asistentes** (solo lectura, misma información).

## Fuera de alcance
- Probar contratos contra un servicio vivo (requiere red o servicio desplegado).
- Editar, aprobar o archivar specs enlazadas desde el proyecto que enlaza.
- Enlaces por URL de git: en esta entrega los enlaces son rutas locales.

## Cómo se mide el éxito
- Un contrato mal formado o con huecos o roturas se reporta antes de archivar (según el modo), con la ubicación exacta del problema.
- Un proyecto con enlaces consulta requisitos externos sin copiarlos y sin poder modificarlos.
- Sin contratos ni enlaces, el comportamiento es exactamente el de siempre.
