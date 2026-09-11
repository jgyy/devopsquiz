import type { Difficulty, Domain } from '../data/domains'

export const HISTORY_KEY = 'devopsquiz.history.v1'

export interface AttemptRecord {
  id: string
  finishedAt: number
  durationSec: number
  mode: 'practice' | 'exam'
  total: number
  correct: number
  byDomain: Partial<Record<Domain, { total: number; correct: number }>>
  byDifficulty: Partial<Record<Difficulty, { total: number; correct: number }>>
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadHistory(): AttemptRecord[] {
  const s = storage()
  if (!s) return []
  try {
    const raw = s.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r): r is AttemptRecord => typeof r === 'object' && r !== null && typeof r.id === 'string')
  } catch (err) {
    console.warn('Could not read quiz history, starting fresh.', err)
    return []
  }
}

export function saveAttempt(record: AttemptRecord): void {
  const s = storage()
  if (!s) return
  const history = loadHistory().filter((r) => r.id !== record.id)
  history.push(record)
  try {
    s.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch (err) {
    console.warn('Could not save quiz attempt.', err)
  }
}

export function clearHistory(): void {
  storage()?.removeItem(HISTORY_KEY)
}
