export interface CommandSpec {
  name: string
  description: string
  flags: string[]
  usage?: string
}

export const CATALOG: CommandSpec[] = [
  { name: 'init', description: 'Inicializa .sdd/ en el proyecto (config, constitución, glosario, perfiles, adaptadores)', flags: ['name', 'language', 'local', 'profiles', 'agents', 'json'], usage: 'satlas init [--name <nombre>] [--language es|en] [--local] [--agents opencode,claude-code,generic]' },
  { name: 'new', description: 'Crea un cambio con su meta.yaml y el esqueleto de delta', flags: ['lane', 'domain', 'title', 'language', 'json'], usage: 'satlas new <slug> [--lane fix|standard|full] [--domain <dominio>] [--title "<título>"]' },
  { name: 'adopt', description: 'Adopta un proyecto existente: inventario, dominios y specs baseline', flags: ['domain', 'domains', 'dry-run', 'json'], usage: 'satlas adopt [--domain <dominio>] [--domains a,b] [--dry-run]' },
  { name: 'status', description: 'Muestra el estado derivado de los cambios', flags: ['json'], usage: 'satlas status [--json]' },
  { name: 'next', description: 'Indica la siguiente acción concreta', flags: ['json'], usage: 'satlas next [slug] [--json]' },
  { name: 'validate', description: 'Valida esquemas y linter de negocio de specs y deltas', flags: ['change', 'strict', 'json'], usage: 'satlas validate [--change <slug>] [--strict] [--json]' },
  { name: 'trace', description: 'Verifica la trazabilidad requisito → escenario → tarea → evidencia', flags: ['change', 'require-evidence', 'json'], usage: 'satlas trace [--change <slug>] [--require-evidence] [--json]' },
  { name: 'waves', description: 'Calcula las olas paralelas de construcción', flags: ['change', 'max-parallel', 'json'], usage: 'satlas waves [--change <slug>] [--max-parallel N] [--json]' },
  { name: 'doctor', description: 'Diagnóstico de salud del workspace', flags: ['json'], usage: 'satlas doctor [--json]' },
  { name: 'approve', description: 'Firma la aprobación de un artefacto (spec): local o desde la etiqueta de un issue de GitHub', flags: ['by', 'channel', 'note', 'dry-run', 'from-github', 'label', 'json'], usage: 'satlas approve <slug|ruta> --by "<nombre>" | satlas approve <slug> --from-github' },
  { name: 'issue', description: 'Sincroniza el cambio con un issue de GitHub (tracker, no gate)', flags: ['labels', 'json'], usage: 'satlas issue sync <slug> [--labels a,b] | satlas issue status <slug>' },
  { name: 'adapters', description: 'Compila (o verifica) los prompts a artefactos de agente', flags: ['targets', 'check', 'json'], usage: 'satlas adapters [--targets opencode,claude-code,cursor,copilot,gemini,codex,generic] [--check]' },
  { name: 'profile', description: 'Detecta, lista o crea perfiles de stack', flags: ['json'], usage: 'satlas profile detect | list | create <nombre>' },
  { name: 'packs', description: 'Packs de cumplimiento (seguridad, datos, auditoría, accesibilidad) y su chequeo por cambio', flags: ['check', 'json'], usage: 'satlas packs | satlas packs --check <slug>' },
  { name: 'archive', description: 'Pliega los deltas a la spec viva y archiva el cambio', flags: ['yes', 'dry-run', 'domain', 'json'], usage: 'satlas archive <slug> [--yes] [--dry-run] [--json]' },
  { name: 'verify', description: 'Registra evidencia por escenario (ejecuta el comando y guarda resultado y hash)', flags: ['scenario', 'command', 'method', 'result', 'by', 'notes', 'file', 'allow-command', 'json'], usage: 'satlas verify <slug> [--scenario REQ-…-S1 --command "npm test" --by "<nombre>"]' },
  { name: 'analyze', description: 'Chequeo cruzado (lint + trace + waves + mockups) y escribe analyze.md', flags: ['json'], usage: 'satlas analyze <slug>' },
  { name: 'mockup', description: 'Planifica, valida o captura los mockups del cambio', flags: ['plan', 'check', 'capture', 'require', 'json'], usage: 'satlas mockup <slug> [--plan|--check|--capture|--require]' },
  { name: 'present', description: 'Genera el paquete de propuesta para el stakeholder (HTML autocontenido)', flags: ['json'], usage: 'satlas present <slug>' },
  { name: 'ci', description: 'Gate de pipeline: specs + cambios + doctor + adaptadores (sin agente)', flags: ['strict', 'json'], usage: 'satlas ci [--strict]' },
  { name: 'mcp', description: 'Vía de consulta de solo lectura para asistentes (protocolo MCP sobre entrada/salida estándar)', flags: [], usage: 'satlas mcp' },
  { name: 'metrics', description: 'Métricas locales del workspace (progreso, WIP, throughput, evidencia)', flags: ['json'], usage: 'satlas metrics [--json]' },
  { name: 'run', description: 'Persiste runs y eventos de ejecución (auditoría y reanudación)', flags: ['phase', 'inputs', 'data', 'slug', 'status', 'json'], usage: 'satlas run start|event|status|show|list' },
  { name: 'hash', description: 'Calcula el sha256 de un archivo o texto (para evidencia)', flags: ['text', 'json'], usage: 'satlas hash <archivo> | satlas hash --text "salida"' },
  { name: 'version', description: 'Muestra la versión', flags: ['json'], usage: 'satlas version' },
  { name: 'help', description: 'Muestra la ayuda', flags: ['json'], usage: 'satlas help [comando]' },
]
