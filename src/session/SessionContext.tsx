import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Difficulty, Domain } from '../data/domains'
import { QUESTIONS } from '../data'
import type { Question } from '../data/schema'
import type { UserAnswer } from '../lib/grade'
import { mulberry32, randomSeed } from '../lib/rng'
import { filterQuestions, sampleQuestions, shuffleOptions, type PreparedQuestion } from '../lib/select'

export type Mode = 'practice' | 'exam'

export interface QuizSettings {
  domains: Domain[]
  difficulties: Difficulty[]
  count: number
  mode: Mode
  timeLimitSec?: number
}

export interface QuizSession {
  id: string
  settings: QuizSettings
  questions: PreparedQuestion[]
  answers: Record<string, UserAnswer>
  startedAt: number
  finishedAt?: number
}

interface SessionApi {
  session: QuizSession | null
  start: (settings: QuizSettings, pool?: Question[]) => QuizSession
  answer: (id: string, a: UserAnswer) => void
  finish: () => void
  reset: () => void
}

const Ctx = createContext<SessionApi | null>(null)

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

export function SessionProvider({ children, bank = QUESTIONS }: { children: ReactNode; bank?: Question[] }) {
  const [session, setSession] = useState<QuizSession | null>(null)

  const start = useCallback(
    (settings: QuizSettings, pool?: Question[]) => {
      const s = buildSession(settings, pool ?? bank)
      setSession(s)
      return s
    },
    [bank],
  )
  const answer = useCallback((id: string, a: UserAnswer) => {
    setSession((s) => (s ? { ...s, answers: { ...s.answers, [id]: a } } : s))
  }, [])
  const finish = useCallback(() => {
    setSession((s) => (s && !s.finishedAt ? { ...s, finishedAt: Date.now() } : s))
  }, [])
  const reset = useCallback(() => setSession(null), [])

  const value = useMemo(() => ({ session, start, answer, finish, reset }), [session, start, answer, finish, reset])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession(): SessionApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSession must be used inside SessionProvider')
  return v
}
