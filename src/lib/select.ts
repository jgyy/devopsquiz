import type { Difficulty, Domain } from '../data/domains'
import type { Question } from '../data/schema'

export interface Filter {
  domains: Domain[]
  difficulties: Difficulty[]
}

export function filterQuestions(bank: Question[], f: Filter): Question[] {
  return bank.filter((q) => f.domains.includes(q.domain) && f.difficulties.includes(q.difficulty))
}

/** Fisher-Yates shuffle, returns a new array. */
export function shuffle<T>(list: T[], rng: () => number): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Pick up to `n` distinct items in random order. */
export function sampleQuestions<T>(list: T[], n: number, rng: () => number): T[] {
  return shuffle(list, rng).slice(0, Math.max(0, Math.min(n, list.length)))
}

export interface PreparedQuestion {
  question: Question
  /** order[displayIndex] = original option index. Identity for boolean/fill. */
  order: number[]
}

export function shuffleOptions(question: Question, rng: () => number): PreparedQuestion {
  if (question.type === 'single' || question.type === 'multi') {
    const order = shuffle(
      question.options.map((_, i) => i),
      rng,
    )
    return { question, order }
  }
  return { question, order: [] }
}
