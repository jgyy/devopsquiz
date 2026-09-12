import { createContext } from 'react'
import type { Question } from '../data/schema'
import type { UserAnswer } from '../lib/grade'
import type { QuizSession, QuizSettings } from './SessionContext'

export interface SessionApi {
  session: QuizSession | null
  start: (settings: QuizSettings, pool?: Question[]) => QuizSession
  answer: (id: string, a: UserAnswer) => void
  finish: () => void
  reset: () => void
}

export const Ctx = createContext<SessionApi | null>(null)
