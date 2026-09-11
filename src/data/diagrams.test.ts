// @vitest-environment jsdom
import mermaid from 'mermaid'
import { describe, expect, it } from 'vitest'
import { QUESTIONS } from './index'

/** Every question's Mermaid diagram must parse, so a syntax slip fails here instead of in the browser. */
describe('question diagrams', () => {
  mermaid.initialize({ startOnLoad: false })

  it('parse as valid Mermaid', async () => {
    const bad: string[] = []
    for (const q of QUESTIONS) {
      try {
        const ok = await mermaid.parse(q.diagram, { suppressErrors: true })
        if (!ok) bad.push(`${q.id}: unparseable`)
      } catch (err) {
        bad.push(`${q.id}: ${(err as Error).message.split('\n')[0]}`)
      }
    }
    expect(bad).toEqual([])
  }, 120_000)
})
