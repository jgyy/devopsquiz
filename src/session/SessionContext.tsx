import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Difficulty, Domain } from '../data/domains'
import { QUESTIONS } from '../data'
import type { Question } from '../data/schema'
import type { UserAnswer } from '../lib/grade'
import type { PreparedQuestion } from '../lib/select'
import { buildSession } from './buildSession'
import { Ctx } from './context'

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
