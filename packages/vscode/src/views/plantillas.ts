/**
 * Plantillas de los artefactos del flujo, para escribirlos sin recordar su
 * estructura. Solo se ofrecen dentro de `.sdd/`, así que no ensucian el resto
 * del markdown del proyecto.
 */
export interface Plantilla {
  /** Lo que se teclea para invocarla. */
  prefijo: string
  titulo: string
  detalle: string
  /** Cuerpo en formato de snippet de VS Code (`${1:...}` son los huecos). */
  cuerpo: string
  /** Artefactos donde tiene sentido; vacío significa cualquiera de `.sdd/`. */
  archivos: string[]
}

const NL = '\n'

export const PLANTILLAS: Plantilla[] = [
  {
    prefijo: 'req',
    titulo: 'Requisito con su primer escenario',
    detalle: 'Requisito de negocio, su regla y un escenario CUANDO/ENTONCES',
    archivos: ['spec.md'],
    cuerpo: [
      '### Requisito: REQ-${1:DOMINIO}-${2:001} — ${3:Título del requisito}',
      '${4:Qué necesita el negocio y qué comportamiento espera, sin nombrar tecnología.}',
      '',
      '- Regla BR-${1:DOMINIO}-${2:001}: ${5:regla verificable, con su valor y su unidad}',
      '',
      '#### Escenario: REQ-${1:DOMINIO}-${2:001}-S1 — ${6:Caso principal}',
      '- **CUANDO** ${7:situación o acción del actor}',
      '- **ENTONCES** ${8:resultado observable y medible}',
      '$0',
    ].join(NL),
  },
  {
    prefijo: 'esc',
    titulo: 'Escenario',
    detalle: 'Escenario con resultado observable',
    archivos: ['spec.md'],
    cuerpo: [
      '#### Escenario: REQ-${1:DOMINIO}-${2:001}-S${3:2} — ${4:Título del escenario}',
      '- **CUANDO** ${5:situación o acción del actor}',
      '- **ENTONCES** ${6:resultado observable y medible}',
      '$0',
    ].join(NL),
  },
  {
    prefijo: 'regla',
    titulo: 'Regla de negocio',
    detalle: 'Regla verificable de un requisito',
    archivos: ['spec.md'],
    cuerpo: '- Regla BR-${1:DOMINIO}-${2:001}: ${3:regla verificable, con su valor y su unidad}$0',
  },
  {
    prefijo: 'tarea',
    titulo: 'Tarea con sus archivos y lo que cubre',
    detalle: 'Tarea del plan, con archivos, escenarios cubiertos y reversión',
    archivos: ['tasks.md'],
    cuerpo: [
      '- [ ] T${1:1}.${2:1} ${3:Qué se implementa}',
      '  - Archivos: ${4:ruta/archivo.ext}',
      '  - Cubre: REQ-${5:DOMINIO}-${6:001}-S${7:1}',
      '  - Reversión: ${8:cómo se revierte}',
      '$0',
    ].join(NL),
  },
  {
    prefijo: 'bloque',
    titulo: 'Bloque de tareas',
    detalle: 'Bloque que agrupa tareas para calcular sus olas',
    archivos: ['tasks.md'],
    cuerpo: ['## Bloque ${1:1} — ${2:Título del bloque}', '', '$0'].join(NL),
  },
  {
    prefijo: 'evidencia',
    titulo: 'Bloque de evidencia',
    detalle: 'Evidencia de un escenario: método, comando, resultado y huella',
    archivos: ['verify.md', 'fix.md'],
    cuerpo: [
      '### REQ-${1:DOMINIO}-${2:001}-S${3:1} — ${4:Título del escenario}',
      '',
      '```evidence',
      'method: ${5|executable,automatic,semi,manual|}',
      'command: ${6:npm test}',
      'result: ${7|pass,fail,skipped|}',
      'date: ${8:2026-01-01T00:00:00Z}',
      'by: ${9:Nombre Apellido}',
      'notes: ${10:qué se comprobó}',
      '```',
      '$0',
    ].join(NL),
  },
  {
    prefijo: 'hallazgo',
    titulo: 'Hallazgo de revisión',
    detalle: 'Hallazgo con su severidad y su ubicación',
    archivos: ['review.md'],
    cuerpo: '- [ ] (${1|bloqueante,menor,sugerencia|}) ${2:qué está mal y por qué importa} · Archivo: ${3:ruta/archivo.ext}:${4:12}$0',
  },
  {
    prefijo: 'pregunta',
    titulo: 'Pregunta abierta',
    detalle: 'Pregunta por aclarar antes de planificar',
    archivos: ['clarify.md'],
    cuerpo: '- [ ] ${1:qué falta por decidir y a quién se le pregunta}$0',
  },
  {
    prefijo: 'contrato',
    titulo: 'Contrato del escenario',
    detalle: 'Operación que promete cumplir un escenario',
    archivos: ['spec.md'],
    cuerpo: '- **Contrato**: ${1:GET /recurso}$0',
  },
]

/** Las plantillas que tienen sentido en un archivo concreto de `.sdd/`. */
export function plantillasPara(file: string | undefined): Plantilla[] {
  if (!file) return []
  const ruta = file.replace(/\\/g, '/').toLowerCase()
  if (!ruta.includes('/.sdd/')) return []
  const nombre = ruta.split('/').pop() ?? ''
  return PLANTILLAS.filter((plantilla) => plantilla.archivos.length === 0 || plantilla.archivos.includes(nombre))
}
