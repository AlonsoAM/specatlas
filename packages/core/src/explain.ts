export interface DiagnosticExplanation {
  code: string
  /** Qué está diciendo el hallazgo, en una frase. */
  title: string
  /** Por qué el flujo lo vigila. */
  why: string
  /** Qué hacer para cerrarlo. */
  fix: string
}

export interface DiagnosticFamily {
  prefix: string
  title: string
  description: string
}

export const DIAGNOSTIC_FAMILIES: DiagnosticFamily[] = [
  { prefix: 'LINT-STR', title: 'Estructura', description: 'La forma del documento: ids, encabezados y bloques donde corresponde.' },
  { prefix: 'LINT-BIZ', title: 'Lenguaje de negocio', description: 'La especificación describe comportamiento observable, sin tecnología ni adjetivos sin medida.' },
  { prefix: 'LINT-DLT', title: 'Deltas', description: 'Cómo el cambio declara lo que agrega, modifica, elimina o renombra sobre la spec viva.' },
  { prefix: 'LINT-TSK', title: 'Tareas', description: 'Cada tarea dice qué archivos toca y qué escenario cubre.' },
  { prefix: 'LINT-EVD', title: 'Evidencia', description: 'Los bloques `evidence` de verify.md: método, comando, resultado y huella.' },
  { prefix: 'LINT-PLN', title: 'Plan técnico', description: 'Secciones y diagramas del plan; mermaid que renderice de verdad.' },
  { prefix: 'LINT-MKP', title: 'Mockups', description: 'El contrato visual: estados, breakpoints, accesibilidad y textos reales.' },
  { prefix: 'LINT-GLO', title: 'Glosario', description: 'Los términos del negocio y su definición vigente.' },
  { prefix: 'TRACE', title: 'Trazabilidad', description: 'La cadena requisito → escenario → tarea → evidencia, sin huecos ni ciclos.' },
  { prefix: 'PACK', title: 'Cumplimiento', description: 'Controles de los packs activos (seguridad, datos, auditoría, accesibilidad).' },
  { prefix: 'MKP-STALE', title: 'Mockups obsoletos', description: 'El contrato visual quedó atrás respecto de la especificación que ilustra.' },
  { prefix: 'ATLAS', title: 'Workspace y fases', description: 'Estado del proyecto: configuración, artefactos, firmas, gates y comandos.' },
]

const EXPLANATIONS: DiagnosticExplanation[] = [
  {
    code: 'LINT-BIZ-001',
    title: 'La especificación nombra tecnología (tabla, endpoint, framework…).',
    why: 'La spec la lee y la aprueba el negocio; el cómo vive en el plan técnico, que cambia sin volver a firmar.',
    fix: 'Describe el comportamiento observable. Lo técnico va a plan.md.',
  },
  {
    code: 'LINT-BIZ-002',
    title: 'Hay un adjetivo sin medida ("rápido", "fácil", "robusto").',
    why: 'Lo que no se puede medir no se puede verificar, y la evidencia se vuelve una opinión.',
    fix: 'Pon el número y la unidad: "responde en menos de 2 segundos".',
  },
  {
    code: 'LINT-BIZ-003',
    title: 'Queda texto de plantilla sin completar.',
    why: 'El esqueleto de `satlas new` no es una especificación: aprobarlo firmaría un documento vacío.',
    fix: 'Escribe la necesidad de negocio, sus reglas y el CUANDO/ENTONCES de cada escenario.',
  },
  {
    code: 'LINT-BIZ-005',
    title: 'El escenario no declara ENTONCES.',
    why: 'Sin resultado observable no hay nada que verificar ni que evidenciar.',
    fix: 'Añade `- **ENTONCES** <resultado observable y medible>`.',
  },
  {
    code: 'LINT-STR-001',
    title: 'Un id está mal formado.',
    why: 'Los ids son la columna vertebral de la trazabilidad: si no casan, la cadena se rompe en silencio.',
    fix: 'Formatos: `REQ-DOMINIO-NNN`, `REQ-DOMINIO-NNN-SN`, `BR-DOMINIO-NNN`, `T<bloque>.<secuencia>`.',
  },
  {
    code: 'LINT-STR-002',
    title: 'Un escenario o una regla está fuera de su requisito.',
    why: 'Lo que cuelga de la nada no pertenece a ningún requisito y no se puede trazar.',
    fix: 'Muévelo debajo del `### Requisito: REQ-…` al que pertenece.',
  },
  {
    code: 'LINT-STR-004',
    title: 'Una tarea vive fuera de un bloque.',
    why: 'Las olas de construcción se calculan por bloque; una tarea suelta no entra en ninguna.',
    fix: 'Agrúpala bajo un `## Bloque N — Título`.',
  },
  {
    code: 'LINT-TSK-001',
    title: 'La tarea no declara los archivos que toca.',
    why: 'Sin archivos no hay guarda de colisiones entre tareas paralelas ni anclas al archivar.',
    fix: 'Añade `· Archivos: ruta/archivo.ext` en la misma línea o una sub-viñeta `- Archivos: …`; si es infraestructura, márcala con `· Infra`.',
  },
  {
    code: 'LINT-DLT-003',
    title: 'Un RENAMED cambia el id del requisito.',
    why: 'Los ids son inmutables: renumerarlos rompe la historia, la evidencia y los enlaces externos.',
    fix: 'Cambia el título, no el id. Si de verdad desaparece, decláralo en REMOVED con motivo y migración.',
  },
  {
    code: 'LINT-EVD-000',
    title: 'El bloque `evidence` no es YAML válido.',
    why: 'La evidencia se lee a máquina: un bloque roto equivale a no tener evidencia.',
    fix: 'Entrecomilla los valores con dos puntos y revisa la indentación. `satlas verify` lo escribe bien por ti.',
  },
  {
    code: 'LINT-PLN-002',
    title: 'Un diagrama mermaid no renderiza.',
    why: 'Un diagrama que no se dibuja no comunica nada en la documentación ni en la presentación.',
    fix: 'Declara el tipo en la primera línea (`flowchart`, `sequenceDiagram`…) y cierra cada bloque con `end`.',
  },
  {
    code: 'TRACE-001',
    title: 'El requisito no tiene escenarios.',
    why: 'Un requisito sin escenarios no se puede probar: no hay nada que verificar.',
    fix: 'Añade al menos un escenario con CUANDO/ENTONCES, más los de error, vacío, permiso y límites.',
  },
  {
    code: 'TRACE-002',
    title: 'Un escenario no está cubierto por ninguna tarea.',
    why: 'Es el hueco clásico: se aprueba comportamiento que nadie se compromete a construir.',
    fix: 'Añade `· Cubre: REQ-…-SN` a la tarea que lo implementa.',
  },
  {
    code: 'TRACE-003',
    title: 'Un escenario no tiene evidencia.',
    why: 'Sin evidencia, "terminado" es una afirmación sin respaldo (Artículo 1 de la constitución).',
    fix: 'Regístrala: `satlas verify <slug> --scenario REQ-…-SN --command "<comando>" --by "<nombre>"`.',
  },
  {
    code: 'TRACE-004',
    title: 'La tarea no declara qué cubre.',
    why: 'Una tarea que no cubre nada es trabajo sin requisito detrás.',
    fix: 'Añade `· Cubre: REQ-…-SN`, o márcala `· Infra` si es trabajo de infraestructura.',
  },
  {
    code: 'TRACE-007',
    title: 'El delta modifica, elimina o renombra algo que no existe en la spec viva.',
    why: 'El fold al archivar es todo o nada: si el requisito no está, el pliegue fallaría.',
    fix: 'Usa ADDED si es nuevo, o copia el bloque completo del requisito vigente para MODIFIED.',
  },
  {
    code: 'TRACE-010',
    title: 'Las dependencias entre tareas forman un ciclo.',
    why: 'Un ciclo no tiene orden de ejecución: las olas no se pueden calcular.',
    fix: 'Rompe la dependencia circular o fusiona las tareas que en realidad son una.',
  },
  {
    code: 'TRACE-011',
    title: 'Un fix declara `Cubre:` de un requisito que no existe.',
    why: 'El fix sigue siendo válido, pero su trazabilidad apunta al vacío.',
    fix: 'Corrige el id o quita la línea `Cubre:` del fix.',
  },
  {
    code: 'ATLAS-DRIFT-001',
    title: 'Un ancla de una spec viva apunta a un archivo que ya no existe.',
    why: 'El código se movió debajo de la especificación: la spec dice dónde vive algo que ya no está ahí.',
    fix: 'Actualiza `.sdd/specs/<dominio>/anchors.yaml` (o `satlas drift --prune`). Si cambió el comportamiento, especifícalo con un cambio.',
  },
  {
    code: 'ATLAS-DRIFT-002',
    title: 'Un ancla apunta a un símbolo que ya no está en el archivo.',
    why: 'Renombrar sin actualizar el ancla deja la trazabilidad apuntando a un nombre muerto.',
    fix: 'Renombra el ancla en `anchors.yaml` o recupera el símbolo.',
  },
  {
    code: 'ATLAS-REVIEW-001',
    title: 'El cambio no tiene revisión de código.',
    why: 'La revisión es el último filtro antes del PR: barata ahí, cara después.',
    fix: '`satlas review <slug>` deja el artefacto listo; la revisión la hace la fase del agente o una persona.',
  },
  {
    code: 'ATLAS-REVIEW-003',
    title: 'La revisión existe pero no está cerrada.',
    why: 'Que el archivo exista no es revisar: queda un veredicto pendiente o hallazgos bloqueantes abiertos.',
    fix: 'Resuelve los bloqueantes (`- [x]`) y deja `- resultado: pass` en el veredicto.',
  },
  {
    code: 'ATLAS-AMEND-004',
    title: 'Se intenta enmendar una spec que nunca se aprobó.',
    why: 'La enmienda revisa una firma existente; sin firma previa no hay nada que revisar.',
    fix: 'Fírmala por primera vez con `satlas approve <slug> --by "<nombre>"`.',
  },
  {
    code: 'ATLAS-CLARIFY-001',
    title: 'Quedan preguntas abiertas sin aclarar.',
    why: 'Planificar sobre supuestos sin confirmar es la vía más cara de descubrir que estaban mal.',
    fix: 'Resuélvelas en `clarify.md` (`- [x] pregunta — respuesta`) antes de planificar.',
  },
  {
    code: 'ATLAS-DOCS-001',
    title: 'Falta la documentación del carril completo.',
    why: 'En el carril `full`, el cambio no se cierra sin documento técnico y manual.',
    fix: '`satlas docs <slug>` los genera desde la evidencia real; luego complétalos donde haga falta.',
  },
  {
    code: 'ATLAS-EXEC-002',
    title: 'El comando de evidencia no está declarado en el perfil del stack.',
    why: 'La evidencia ejecuta comandos: la lista blanca evita que un artefacto dispare cualquier cosa.',
    fix: 'Añádelo al perfil (`.sdd/profiles/`) o usa `--allow-command` si es intencional y puntual.',
  },
  {
    code: 'ATLAS-VERIFY-002',
    title: 'Los mockups quedaron atrás respecto de la especificación verificada.',
    why: 'El contrato visual aprobado ya no ilustra lo que se está verificando.',
    fix: 'Regenera y comprueba: `satlas mockup <slug> --check`.',
  },
  {
    code: 'ATLAS-NEW-003',
    title: 'El carril pedido no está permitido en este proyecto.',
    why: 'Los carriles los decide el equipo en la configuración, no cada cambio.',
    fix: 'Usa uno de `lanes.allowed` o amplía la lista en `.sdd/config.yaml`.',
  },
  {
    code: 'ATLAS-LINK-003',
    title: 'Una referencia a otro proyecto no se pudo resolver.',
    why: 'La trazabilidad cruzada necesita el proyecto enlazado disponible para leer sus specs.',
    fix: 'Comprueba la ruta con `satlas link list`, o vuelve a enlazarlo con `satlas link add <ruta>`.',
  },
  {
    code: 'ATLAS-ANCHOR-001',
    title: 'El archivo de anclas de un dominio no es válido.',
    why: 'Si no se puede leer, la comprobación de deriva se queda ciega para ese dominio.',
    fix: 'Revisa `.sdd/specs/<dominio>/anchors.yaml`: `anchors:` es una lista de `{requirement, files[]}`.',
  },
  {
    code: 'MKP-STALE',
    title: 'Los mockups están obsoletos.',
    why: 'La huella de entradas (spec + tokens) cambió después de generarlos.',
    fix: 'Regenera las pantallas afectadas y vuelve a validarlas con `satlas mockup <slug> --check`.',
  },
]

const BY_CODE = new Map(EXPLANATIONS.map((item) => [item.code, item]))

export function listExplanations(): DiagnosticExplanation[] {
  return [...EXPLANATIONS].sort((a, b) => a.code.localeCompare(b.code))
}

export function familyOf(code: string): DiagnosticFamily | undefined {
  const upper = code.toUpperCase()
  return DIAGNOSTIC_FAMILIES.filter((family) => upper.startsWith(family.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0]
}

/** Explicación de un código concreto; si no hay ficha propia, se responde por familia. */
export function explainDiagnostic(code: string): { explanation?: DiagnosticExplanation; family?: DiagnosticFamily } {
  const upper = code.trim().toUpperCase()
  const explanation = BY_CODE.get(upper)
  const family = familyOf(upper)
  return {
    ...(explanation !== undefined ? { explanation } : {}),
    ...(family !== undefined ? { family } : {}),
  }
}
