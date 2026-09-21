# Fix — La firma no aparece en la presentación

## Síntoma

Tras firmar la especificación de un cambio, la propuesta HTML sigue mostrando el bloque de firma en blanco —«Nombre de quien aprueba ____», «Fecha de la firma ____»— y además avisa de que «la especificación cambió después de firmarse: la firma quedó obsoleta y hay que volver a aprobar», aunque la firma acabe de registrarse y su huella coincida con la del documento.

Observado al aprobar el cambio `autoactualizacion`: la firma quedó registrada en `approvals.yaml` con la huella `sha256:2c7bf642…`, la misma que la propuesta muestra en su pie, y aun así la sección de firma decía que estaba obsoleta.

## Causa raíz

Dos defectos que se suman, ambos en la propuesta:

1. **La sección de firma no miraba el estado.** `present.ts` calcula bien el estado de la aprobación (`signatureState`: firmada, obsoleta o pendiente) pero solo lo usa en la portada. La sección 05 estaba escrita como HTML fijo: siempre las líneas en blanco para firmar a mano y, al final, `${esc(l.approveStale)}` **incondicional**, de modo que el aviso de firma obsoleta aparecía en los tres casos, incluida una spec recién firmada o nunca firmada.

2. **Aprobar no rehacía la propuesta.** La propuesta es un documento derivado y estático: se genera antes de firmar, para compartirla y decidir. `satlas approve` registraba la firma sin regenerarla, así que el archivo abierto seguía mostrando el estado anterior aunque el fallo anterior se corrigiera.

## Cambio

- `packages/core/src/present.ts`: la sección de firma pasa a reflejar el estado real. Firmada, muestra quién aprobó, cuándo y la huella firmada, con su propio estilo; pendiente, invita a firmar y deja las líneas; obsoleta, mantiene las líneas y explica que hay que volver a aprobar. El comando de aprobación solo se ofrece cuando falta firmar, y el aviso de obsoleta solo cuando de verdad lo está.
- `packages/cli/src/commands/approve.ts`: tras registrar la firma, si la propuesta existe se regenera y se dice dónde quedó. Si la regeneración falla, se informa y se indica cómo rehacerla a mano; la firma ya está registrada y no se pierde.

## Rollback

Revertir el commit. No cambia ningún artefacto guardado: la propuesta es un documento derivado que se puede regenerar con `satlas present <slug>`.

## Evidencia

Los tres estados comprobados sobre un proyecto nuevo, generando la propuesta y leyendo su sección de firma:

- Sin firmar → «Firma aquí para aprobar esta propuesta» con las líneas en blanco y el comando, **sin** el aviso de obsoleta.
- Recién firmada → «Aprobada por Alonso Anchante», su fecha y la huella `sha256:e9ae5858…`, sin líneas en blanco.
- Editada después de firmar → vuelven las líneas y aparece el aviso de firma obsoleta.

### REQ-EDITOR-001-S1

```evidence
method: executable
command: npx vitest run packages/core/test/present.test.ts
result: pass
output_hash: sha256:cb6801e529c830ed711b1e538a669c4d1da2e486355876d51806012162b06867
date: 2026-09-21 17:21:58 -05:00
by: Alonso Anchante
```
