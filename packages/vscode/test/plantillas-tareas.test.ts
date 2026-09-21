import { describe, expect, it } from 'vitest'
import { PLANTILLAS, plantillasPara } from '../src/views/plantillas'
import { comandoDeTarea, TAREAS, tareasDisponibles } from '../src/views/tareas-vscode'

describe('plantillas de los artefactos', () => {
  it('solo se ofrecen dentro del flujo', () => {
    expect(plantillasPara('/proyecto/.sdd/changes/x/spec.md').length).toBeGreaterThan(0)
    expect(plantillasPara('/proyecto/README.md')).toHaveLength(0)
    expect(plantillasPara('/proyecto/src/spec.md')).toHaveLength(0)
    expect(plantillasPara(undefined)).toHaveLength(0)
  })

  it('cada artefacto ofrece lo suyo y no lo ajeno', () => {
    const spec = plantillasPara('/proyecto/.sdd/changes/x/spec.md').map((p) => p.prefijo)
    expect(spec).toContain('req')
    expect(spec).toContain('esc')
    expect(spec).not.toContain('tarea')

    const tasks = plantillasPara('/proyecto/.sdd/changes/x/tasks.md').map((p) => p.prefijo)
    expect(tasks).toContain('tarea')
    expect(tasks).toContain('bloque')
    expect(tasks).not.toContain('req')

    expect(plantillasPara('/proyecto/.sdd/changes/x/verify.md').map((p) => p.prefijo)).toContain('evidencia')
    expect(plantillasPara('/proyecto/.sdd/changes/x/review.md').map((p) => p.prefijo)).toContain('hallazgo')
  })

  it('las rutas de Windows también valen', () => {
    const rutaWindows = ['C:', 'proyecto', '.sdd', 'changes', 'x', 'tasks.md'].join(String.fromCharCode(92))
    expect(plantillasPara(rutaWindows).map((p) => p.prefijo)).toContain('tarea')
  })

  it('las plantillas respetan la gramática de los artefactos', () => {
    const req = PLANTILLAS.find((p) => p.prefijo === 'req')!
    expect(req.cuerpo).toContain('### Requisito: REQ-')
    expect(req.cuerpo).toContain('- **CUANDO**')
    expect(req.cuerpo).toContain('- **ENTONCES**')

    const tarea = PLANTILLAS.find((p) => p.prefijo === 'tarea')!
    expect(tarea.cuerpo).toContain('- Archivos:')
    expect(tarea.cuerpo).toContain('- Cubre: REQ-')

    const evidencia = PLANTILLAS.find((p) => p.prefijo === 'evidencia')!
    expect(evidencia.cuerpo).toContain('```evidence')
    expect(evidencia.cuerpo).toContain('method: ')
  })
})

describe('comprobaciones como tareas del editor', () => {
  it('la comprobación completa va bajo la tecla de compilación', () => {
    const ci = TAREAS.find((t) => t.id === 'ci')!
    expect(ci.grupo).toBe('build')
    expect(comandoDeTarea(ci)).toBe('satlas ci')
  })

  it('las que operan sobre un cambio esperan a que haya uno', () => {
    expect(tareasDisponibles(undefined).some((t) => t.porCambio)).toBe(false)
    expect(tareasDisponibles('mi-cambio').some((t) => t.id === 'analyze')).toBe(true)
    expect(comandoDeTarea(TAREAS.find((t) => t.id === 'analyze')!, 'mi-cambio')).toBe('satlas analyze mi-cambio')
  })

  it('la trazabilidad exige evidencia y va con las pruebas', () => {
    const trace = TAREAS.find((t) => t.id === 'trace')!
    expect(comandoDeTarea(trace)).toContain('--require-evidence')
    expect(trace.grupo).toBe('test')
  })
})
