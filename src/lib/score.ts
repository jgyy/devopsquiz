import type { Difficulty, Domain } from '../data/domains'
import type { Question } from '../data/schema'
import { gradeAnswer, type UserAnswer } from './grade'

export interface Tally {
  total: number
  correct: number
}

export interface Summary {
  total: number
  correct: number
  percent: number
  byDomain: Partial<Record<Domain, Tally>>
  byDifficulty: Partial<Record<Difficulty, Tally>>
  results: { question: Question; answer: UserAnswer; correct: boolean }[]
}

function bump<K extends string>(map: Partial<Record<K, Tally>>, key: K, correct: boolean) {
  const t = (map[key] ??= { total: 0, correct: 0 })
  t.total++
  if (correct) t.correct++
}

export function summarize(questions: Question[], answers: Record<string, UserAnswer>): Summary {
  const s: Summary = { total: questions.length, correct: 0, percent: 0, byDomain: {}, byDifficulty: {}, results: [] }
  for (const q of questions) {
    const answer = answers[q.id] ?? null
    const correct = gradeAnswer(q, answer)
    if (correct) s.correct++
    bump(s.byDomain, q.domain, correct)
    bump(s.byDifficulty, q.difficulty, correct)
    s.results.push({ question: q, answer, correct })
  }
  s.percent = s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100)
  return s
}
