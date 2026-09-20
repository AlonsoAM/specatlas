import type { ToolDefinition } from '../protocol.js'

export const READ_ONLY_TOOL_NAMES: readonly string[] = [
  'atlas_status',
  'atlas_next',
  'atlas_validate',
  'atlas_trace',
  'atlas_impact',
  'atlas_glossary',
  'atlas_fixes',
  'atlas_contracts',
  'atlas_links',
]

export function listTools(): ToolDefinition[] {
  return [
    {
      name: 'atlas_status',
      description: 'Estado del proyecto: cambios activos con fase, avance de tareas y evidencia, bloqueos y siguiente paso. Opcional: nombre de un cambio.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string', description: 'Nombre del cambio (opcional): si se indica, solo se informa de ese cambio' } },
        additionalProperties: false,
      },
    },
    {
      name: 'atlas_next',
      description: 'Siguiente acción recomendada para un cambio, con la indicación de si requiere una persona o la puede realizar el asistente.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string', description: 'Nombre del cambio' } },
        required: ['slug'],
        additionalProperties: false,
      },
    },
    {
      name: 'atlas_validate',
      description: 'Hallazgos vigentes de un cambio (validación y trazabilidad), idénticos a los que reporta la herramienta. Nunca modifica nada.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string', description: 'Nombre del cambio' } },
        required: ['slug'],
        additionalProperties: false,
      },
    },
    {
      name: 'atlas_trace',
      description: 'Cobertura de trazabilidad: por escenario, qué tarea lo cubre y su evidencia, y los huecos vigentes.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string', description: 'Nombre del cambio (opcional)' } },
        additionalProperties: false,
      },
    },
    {
      name: 'atlas_impact',
      description: 'Impacto registrado de un requisito (REQ-…) o de un archivo: escenarios, tareas, cambios, archivos y evidencia relacionados. Solo relaciones registradas.',
      inputSchema: {
        type: 'object',
        properties: { target: { type: 'string', description: 'Id de requisito (por ejemplo REQ-AUTH-001) o ruta de archivo' } },
        required: ['target'],
        additionalProperties: false,
      },
    },
    {
      name: 'atlas_glossary',
      description: 'Términos del glosario del negocio con su definición vigente y sinónimos aceptados. No inventa definiciones.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'atlas_fixes',
      description: 'Fixes vivos (carril express ya archivado): identidad, resultado de su evidencia, contenido y requisitos que declaran. Solo lectura.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'atlas_contracts',
      description: 'Contratos del cambio: operaciones declaradas y hallazgos de forma y cobertura con los escenarios. Solo lectura.',
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string', description: 'Nombre del cambio' } },
        required: ['slug'],
        additionalProperties: false,
      },
    },
    {
      name: 'atlas_links',
      description: 'Enlaces a otros proyectos: nombre, disponibilidad, requisitos externos que aportan y enlaces no disponibles. Solo lectura.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  ]
}

export function isReadOnlyTool(name: string): boolean {
  return READ_ONLY_TOOL_NAMES.includes(name)
}
