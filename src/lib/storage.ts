import { DIFFICULTIES, DOMAIN_IDS, type Difficulty, type Domain } from '../data/domains'

export const HISTORY_KEY = 'devopsquiz.history.v1'
export const PREFS_KEY = 'devopsquiz.prefs.v1'

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

/** The setup choices made on the Home page, remembered between visits. */
export interface QuizPrefs {
  domains: Domain[]
  difficulties: Difficulty[]
  count: number | 'all'
  mode: 'practice' | 'exam'
  minutes: number | ''
}

const MODES = ['practice', 'exam'] as const

function pickKnown<T extends string>(value: unknown, known: readonly T[]): T[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((v): v is T => typeof v === 'string' && (known as readonly string[]).includes(v))
}

/** Returns the saved prefs, or null if nothing valid is stored. Unknown domains/difficulties are dropped. */
export function loadPrefs(): QuizPrefs | null {
  const s = storage()
  if (!s) return null
  try {
    const raw = s.getItem(PREFS_KEY)
    if (!raw) return null
    const p: unknown = JSON.parse(raw)
    if (typeof p !== 'object' || p === null) return null
    const o = p as Record<string, unknown>
    const domains = pickKnown(o.domains, DOMAIN_IDS)
    const difficulties = pickKnown(o.difficulties, DIFFICULTIES)
    const mode = (MODES as readonly string[]).includes(o.mode as string) ? (o.mode as QuizPrefs['mode']) : null
    const count = o.count === 'all' || (typeof o.count === 'number' && o.count > 0) ? (o.count as QuizPrefs['count']) : null
    const minutes = o.minutes === '' || (typeof o.minutes === 'number' && o.minutes > 0) ? (o.minutes as QuizPrefs['minutes']) : ''
    if (!domains || !difficulties || !mode || count === null) return null
    return { domains, difficulties, count, mode, minutes }
  } catch (err) {
    console.warn('Could not read quiz preferences, using defaults.', err)
    return null
  }
}

export function savePrefs(prefs: QuizPrefs): void {
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch (err) {
    console.warn('Could not save quiz preferences.', err)
  }
}
