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
  { name: 'next', description: 'Indica (o ejecuta con --run) la siguiente acción concreta', flags: ['run', 'json'], usage: 'satlas next [slug] [--run] [--json]' },
  { name: 'validate', description: 'Valida esquemas y linter de negocio de specs y deltas', flags: ['change', 'strict', 'json'], usage: 'satlas validate [--change <slug>] [--strict] [--json]' },
  { name: 'trace', description: 'Verifica la trazabilidad requisito → escenario → tarea → evidencia', flags: ['change', 'require-evidence', 'json'], usage: 'satlas trace [--change <slug>] [--require-evidence] [--json]' },
  { name: 'waves', description: 'Calcula las olas paralelas de construcción', flags: ['change', 'max-parallel', 'json'], usage: 'satlas waves [--change <slug>] [--max-parallel N] [--json]' },
  { name: 'drift', description: 'Compara las anclas de las specs vivas con el código real (deriva)', flags: ['prune', 'json'], usage: 'satlas drift [--prune] [--json]' },
  { name: 'impact', description: 'Qué toca un requisito o un archivo: escenarios, tareas, evidencia y anclas', flags: ['json'], usage: 'satlas impact <REQ-…|ruta/archivo>' },
  { name: 'watch', description: 'Vuelve a comprobar el workspace cada vez que cambia .sdd/ (bucle de retroalimentación)', flags: [], usage: 'satlas watch' },
  { name: 'doctor', description: 'Diagnóstico de salud del workspace', flags: ['json'], usage: 'satlas doctor [--json]' },
  { name: 'clarify', description: 'Preguntas abiertas y aclaraciones del cambio (informe; aclarar es fase del agente)', flags: ['json'], usage: 'satlas clarify <slug>' },
  { name: 'docs', description: 'Genera la documentación técnica y manual del cambio (carril completo) desde la evidencia', flags: ['tipo', 'json'], usage: 'satlas docs <slug> [--tipo tecnica|manual|all]' },
  { name: 'contracts', description: 'Comprueba los contratos del cambio (forma y cobertura con los escenarios)', flags: ['json'], usage: 'satlas contracts <slug>' },
  { name: 'link', description: 'Enlaza otros proyectos para consultar sus specs en solo lectura (multi-repo)', flags: ['name', 'json'], usage: 'satlas link add <ruta> [--name <nombre>] | satlas link list | satlas link remove <nombre|ruta>' },
  { name: 'upgrade', description: 'Actualiza el estado del proyecto a la versión vigente (vista previa por defecto)', flags: ['apply', 'rollback', 'json'], usage: 'satlas upgrade [--apply | --rollback] [--json]' },
  { name: 'approve', description: 'Firma la aprobación de un artefacto (spec): local o desde la etiqueta de un issue de GitHub', flags: ['by', 'channel', 'note', 'dry-run', 'from-github', 'label', 'json'], usage: 'satlas approve <slug|ruta> --by "<nombre>" | satlas approve <slug> --from-github' },
  { name: 'amend', description: 'Firma una revisión de una spec ya aprobada (cambio de alcance con motivo y autor)', flags: ['reason', 'by', 'dry-run', 'json'], usage: 'satlas amend <slug> --reason "<motivo>" --by "<nombre>"' },
  { name: 'issue', description: 'Sincroniza el cambio con un issue de GitHub (tracker, no gate)', flags: ['labels', 'json'], usage: 'satlas issue sync <slug> [--labels a,b] | satlas issue status <slug>' },
  { name: 'adapters', description: 'Compila (o verifica) los prompts a artefactos de agente', flags: ['targets', 'check', 'json'], usage: 'satlas adapters [--targets opencode,claude-code,cursor,copilot,gemini,codex,generic] [--check]' },
  { name: 'profile', description: 'Detecta, lista o crea perfiles de stack', flags: ['json'], usage: 'satlas profile detect | list | create <nombre>' },
  { name: 'packs', description: 'Packs de cumplimiento (seguridad, datos, auditoría, accesibilidad) y su chequeo por cambio', flags: ['check', 'json'], usage: 'satlas packs | satlas packs --check <slug>' },
  { name: 'pause', description: 'Pausa un cambio en curso registrando motivo y autor (queda en meta.yaml)', flags: ['reason', 'by', 'json'], usage: 'satlas pause <slug> --reason "<motivo>" --by "<nombre>"' },
  { name: 'resume', description: 'Reanuda un cambio pausado y muestra desde dónde sigue', flags: ['json'], usage: 'satlas resume <slug>' },
  { name: 'archive', description: 'Pliega los deltas a la spec viva y archiva el cambio', flags: ['yes', 'dry-run', 'domain', 'json'], usage: 'satlas archive <slug> [--yes] [--dry-run] [--json]' },
  { name: 'verify', description: 'Registra evidencia por escenario (ejecuta el comando y guarda resultado y hash)', flags: ['scenario', 'command', 'method', 'result', 'by', 'notes', 'file', 'allow-command', 'json'], usage: 'satlas verify <slug> [--scenario REQ-…-S1 --command "npm test" --by "<nombre>"]' },
  { name: 'review', description: 'Revisión de código antes del PR: estado del veredicto y hallazgos (crea review.md si falta)', flags: ['json'], usage: 'satlas review <slug>' },
  { name: 'analyze', description: 'Chequeo cruzado (lint + trace + waves + mockups) y escribe analyze.md', flags: ['json'], usage: 'satlas analyze <slug>' },
  { name: 'mockup', description: 'Planifica, valida o captura los mockups del cambio', flags: ['plan', 'check', 'capture', 'require', 'json'], usage: 'satlas mockup <slug> [--plan|--check|--capture|--require]' },
  { name: 'present', description: 'Genera el paquete de propuesta para el stakeholder (HTML autocontenido)', flags: ['json'], usage: 'satlas present <slug>' },
  { name: 'ci', description: 'Gate de pipeline: specs + cambios + doctor + adaptadores (sin agente)', flags: ['strict', 'sarif', 'json'], usage: 'satlas ci [--strict] [--sarif <ruta>]' },
  { name: 'mcp', description: 'Vía de consulta de solo lectura para asistentes (protocolo MCP sobre entrada/salida estándar)', flags: [], usage: 'satlas mcp' },
  { name: 'metrics', description: 'Métricas locales del workspace (progreso, WIP, throughput, evidencia)', flags: ['json'], usage: 'satlas metrics [--json]' },
  { name: 'run', description: 'Persiste runs y eventos de ejecución (auditoría y reanudación)', flags: ['phase', 'inputs', 'data', 'slug', 'status', 'json'], usage: 'satlas run start|event|status|show|list' },
  { name: 'hash', description: 'Calcula el sha256 de un archivo o texto (para evidencia)', flags: ['text', 'json'], usage: 'satlas hash <archivo> | satlas hash --text "salida"' },
  { name: 'explain', description: 'Explica un código de diagnóstico: qué significa, por qué importa y cómo se cierra', flags: ['json'], usage: 'satlas explain [<código>]' },
  { name: 'self-update', description: 'Actualiza la herramienta a la versión publicada (o solo comprueba si la hay)', flags: ['check', 'auto', 'json'], usage: 'satlas self-update [--check] [--auto on|off]' },
  { name: 'version', description: 'Muestra la versión', flags: ['json'], usage: 'satlas version' },
  { name: 'help', description: 'Muestra la ayuda', flags: ['json'], usage: 'satlas help [comando]' },
]
