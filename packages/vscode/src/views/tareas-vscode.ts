/**
 * Las comprobaciones del flujo como tareas del editor: se lanzan con la tecla
 * de compilación, su salida alimenta el panel de problemas y se pueden encadenar
 * con las tareas propias del proyecto.
 */
export interface TareaSpecAtlas {
  /** Lo que identifica la tarea en `tasks.json`. */
  id: string
  nombre: string
  detalle: string
  /** Argumentos del CLI, sin el binario. */
  argumentos: string[]
  /** `build` la deja bajo la tecla de compilación; `test`, bajo la de pruebas. */
  grupo?: 'build' | 'test'
  /** Si necesita un cambio concreto, se sustituye `<slug>`. */
  porCambio?: boolean
}

export const TAREAS: TareaSpecAtlas[] = [
  { id: 'ci', nombre: 'Comprobación completa', detalle: 'El mismo gate que corre en la propuesta: specs, cambios, anclas y adaptadores', argumentos: ['ci'], grupo: 'build' },
  { id: 'validate', nombre: 'Validar especificaciones', detalle: 'Estructura y lenguaje de negocio de specs y cambios', argumentos: ['validate'] },
  { id: 'trace', nombre: 'Trazabilidad con evidencia', detalle: 'Requisito → escenario → tarea → evidencia, sin huecos', argumentos: ['trace', '--require-evidence'], grupo: 'test' },
  { id: 'drift', nombre: 'Anclas y deriva del código', detalle: 'Las specs vivas contra el repositorio', argumentos: ['drift'] },
  { id: 'doctor', nombre: 'Salud del workspace', detalle: 'Configuración, artefactos y estados inconsistentes', argumentos: ['doctor'] },
  { id: 'analyze', nombre: 'Analizar el cambio', detalle: 'Consistencia entre los artefactos de un cambio', argumentos: ['analyze', '<slug>'], porCambio: true },
]

export function comandoDeTarea(tarea: TareaSpecAtlas, slug?: string): string {
  const argumentos = tarea.argumentos.map((arg) => (arg === '<slug>' ? (slug ?? '<slug>') : arg))
  return ['satlas', ...argumentos].join(' ')
}

/** Las tareas que se pueden ofrecer ahora mismo (las de cambio necesitan uno). */
export function tareasDisponibles(slug: string | undefined): TareaSpecAtlas[] {
  return TAREAS.filter((tarea) => !tarea.porCambio || slug !== undefined)
}
