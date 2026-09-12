import type { Question } from '../data/schema'

/** What the user submitted, expressed in ORIGINAL option indices (not display order). */
export type UserAnswer = number | number[] | boolean | string | null

export function normalizeFill(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Looser form used as a fallback: strips surrounding quotes/backticks and trailing
 * punctuation, and drops spaces, hyphens and underscores entirely so that
 * "token bucket", "token-bucket" and "tokenBucket" all compare equal.
 */
export function looseFill(s: string): string {
  return normalizeFill(s)
    .replace(/^[`'"]+|[`'".,;:!?]+$/g, '')
    .replace(/[\s\-_]+/g, '')
}

export function gradeAnswer(q: Question, a: UserAnswer): boolean {
  if (a === null || a === undefined) return false
  switch (q.type) {
    case 'single':
      return typeof a === 'number' && a === q.answer
    case 'multi': {
      if (!Array.isArray(a)) return false
      const given = [...new Set(a)].sort((x, y) => x - y)
      return given.length === q.answer.length && given.every((v, i) => v === q.answer[i])
    }
    case 'boolean':
      return typeof a === 'boolean' && a === q.answer
    case 'fill': {
      if (typeof a !== 'string') return false
      const norm = normalizeFill(a)
      if (norm === '') return false
      if (q.answer.some((acc) => normalizeFill(acc) === norm)) return true
      if (q.pattern && new RegExp(q.pattern, 'i').test(a.trim())) return true
      const loose = looseFill(a)
      if (loose === '') return false
      return q.answer.some((acc) => looseFill(acc) === loose)
    }
  }
}

export function isAnswered(a: UserAnswer | undefined): boolean {
  if (a === null || a === undefined) return false
  if (Array.isArray(a)) return a.length > 0
  if (typeof a === 'string') return a.trim() !== ''
  return true
}
