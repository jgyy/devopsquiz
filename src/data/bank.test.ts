import { describe, expect, it } from 'vitest'
import { BANK_FILES, QUESTIONS } from './index'
import { validateBank } from './validate'

const good = {
  id: 'docker-001',
  domain: 'docker',
  difficulty: 'easy',
  type: 'boolean',
  prompt: 'p',
  explanation: 'e',
  answer: true,
}

describe('validateBank', () => {
  it('reports duplicate ids across files', () => {
    const r = validateBank({ docker: [good, good] })
    expect(r.errors.some((e) => e.includes('duplicate id'))).toBe(true)
  })

  it('reports a question whose domain does not match its file', () => {
    const r = validateBank({ linux: [good] })
    expect(r.errors.some((e) => e.includes('does not match file'))).toBe(true)
  })

  it('reports schema issues with the question id', () => {
    const r = validateBank({ docker: [{ ...good, difficulty: 'impossible' }] })
    expect(r.errors[0]).toContain('docker-001')
  })

  it('validates the real bank with zero errors', () => {
    const r = validateBank(BANK_FILES)
    expect(r.errors).toEqual([])
    expect(QUESTIONS.length).toBeGreaterThan(0)
  })
})
