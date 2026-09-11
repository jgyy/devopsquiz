import { describe, expect, it } from 'vitest'
import { questionSchema } from './schema'

const base = {
  id: 'docker-001',
  domain: 'docker',
  difficulty: 'easy',
  prompt: 'What does `docker ps` show?',
  explanation: 'It lists running containers.',
}

describe('questionSchema', () => {
  it('accepts a valid single-choice question', () => {
    const q = { ...base, type: 'single', options: ['a', 'b', 'c'], answer: 1 }
    expect(questionSchema.safeParse(q).success).toBe(true)
  })

  it('rejects a single answer index out of range', () => {
    const q = { ...base, type: 'single', options: ['a', 'b'], answer: 2 }
    expect(questionSchema.safeParse(q).success).toBe(false)
  })

  it('rejects duplicate options', () => {
    const q = { ...base, type: 'single', options: ['a', 'a', 'b'], answer: 0 }
    expect(questionSchema.safeParse(q).success).toBe(false)
  })

  it('rejects multi answers that are not sorted ascending', () => {
    const q = { ...base, type: 'multi', options: ['a', 'b', 'c'], answer: [2, 0] }
    expect(questionSchema.safeParse(q).success).toBe(false)
  })

  it('accepts a multi question with sorted answers', () => {
    const q = { ...base, type: 'multi', options: ['a', 'b', 'c'], answer: [0, 2] }
    expect(questionSchema.safeParse(q).success).toBe(true)
  })

  it('accepts boolean and fill questions', () => {
    expect(questionSchema.safeParse({ ...base, type: 'boolean', answer: true }).success).toBe(true)
    expect(
      questionSchema.safeParse({ ...base, type: 'fill', answer: ['docker ps'], pattern: '^docker\\s+ps$' }).success,
    ).toBe(true)
  })

  it('rejects a fill question with an invalid regex pattern', () => {
    const q = { ...base, type: 'fill', answer: ['x'], pattern: '(' }
    expect(questionSchema.safeParse(q).success).toBe(false)
  })

  it('rejects an id that does not match the domain prefix', () => {
    const q = { ...base, id: 'k8s-001', type: 'boolean', answer: false }
    expect(questionSchema.safeParse(q).success).toBe(false)
  })
})
