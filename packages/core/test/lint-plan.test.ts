import { describe, expect, it } from 'vitest'
import { lintPlan } from '../src/lint'

const GOOD = `## 3. Diagramas

\`\`\`mermaid
sequenceDiagram
  participant A
  participant B
  A->>B: hola (mundo)
  alt caso aceptado
    A->>B: uno
  else otro caso
    A->>B: dos
  end
\`\`\`
`

describe('lintPlan (mermaid)', () => {
  it('acepta diagramas válidos', () => {
    expect(lintPlan(GOOD, 'plan.md').filter((d) => d.severity === 'error')).toHaveLength(0)
  })

  it('detecta `;` en mensajes de sequenceDiagram', () => {
    const findings = lintPlan(GOOD.replace('A->>B: uno', 'A->>B: uno; dos'), 'plan.md')
    expect(findings.some((d) => d.code === 'LINT-PLN-003')).toBe(true)
  })

  it('detecta bloques sin cerrar', () => {
    const findings = lintPlan(GOOD.replace('  end\n', ''), 'plan.md')
    expect(findings.some((d) => d.code === 'LINT-PLN-002' && d.message.includes('end'))).toBe(true)
  })

  it('detecta tipos de diagrama desconocidos', () => {
    const findings = lintPlan(GOOD.replace('sequenceDiagram', 'secuencia'), 'plan.md')
    expect(findings.some((d) => d.code === 'LINT-PLN-002')).toBe(true)
  })
})
