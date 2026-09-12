import type { Question } from '../data/schema'
import { mulberry32, randomSeed } from '../lib/rng'
import { filterQuestions, sampleQuestions, shuffleOptions } from '../lib/select'
import type { QuizSession, QuizSettings } from './SessionContext'

export function buildSession(settings: QuizSettings, bank: Question[], seed = randomSeed()): QuizSession {
  const rng = mulberry32(seed)
  const pool = filterQuestions(bank, settings)
  const picked = sampleQuestions(pool, settings.count, rng)
  return {
    id: `${Date.now().toString(36)}-${seed.toString(36)}`,
    settings,
    questions: picked.map((q) => shuffleOptions(q, rng)),
    answers: {},
    startedAt: Date.now(),
  }
}
