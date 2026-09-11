import { beforeEach, describe, expect, it } from 'vitest'
import type { Question } from '../data/schema'
import { gradeAnswer, isAnswered } from './grade'
import { mulberry32 } from './rng'
import { summarize } from './score'
import { filterQuestions, sampleQuestions, shuffleOptions } from './select'
import { clearHistory, HISTORY_KEY, loadHistory, saveAttempt, type AttemptRecord } from './storage'

const mk = (over: Partial<Question> & Pick<Question, 'id' | 'type'>): Question =>
  ({
    domain: 'docker',
    difficulty: 'easy',
    prompt: 'p',
    explanation: 'e',
    ...over,
  }) as Question

const single = mk({ id: 'docker-001', type: 'single', options: ['a', 'b', 'c', 'd'], answer: 2 } as Question)
const multi = mk({ id: 'docker-002', type: 'multi', options: ['a', 'b', 'c'], answer: [0, 2] } as Question)
const bool = mk({ id: 'linux-003', type: 'boolean', answer: false, domain: 'linux', difficulty: 'hard' } as Question)
const fill = mk({ id: 'git-004', type: 'fill', answer: ['git status'], domain: 'git', difficulty: 'medium' } as Question)
const fillRe = mk({
  id: 'git-005',
  type: 'fill',
  answer: ['ls -la'],
  pattern: '^ls\\s+-(la|al)$',
  domain: 'git',
} as Question)
const bank = [single, multi, bool, fill, fillRe]

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('select', () => {
  it('filters by domain and difficulty', () => {
    expect(filterQuestions(bank, { domains: ['docker'], difficulties: ['easy'] })).toEqual([single, multi])
    expect(filterQuestions(bank, { domains: ['git'], difficulties: ['hard'] })).toEqual([])
    expect(filterQuestions(bank, { domains: ['git', 'linux'], difficulties: ['easy', 'medium', 'hard'] })).toHaveLength(3)
  })

  it('samples without duplicates and never more than available', () => {
    const rng = mulberry32(1)
    const s = sampleQuestions(bank, 3, rng)
    expect(new Set(s.map((q) => q.id)).size).toBe(3)
    expect(sampleQuestions(bank, 99, rng)).toHaveLength(bank.length)
    expect(sampleQuestions([], 5, rng)).toEqual([])
  })

  it('shuffles option order as a permutation and leaves boolean/fill alone', () => {
    const p = shuffleOptions(single, mulberry32(7))
    expect([...p.order].sort()).toEqual([0, 1, 2, 3])
    expect(shuffleOptions(bool, mulberry32(7)).order).toEqual([])
  })
})

describe('grade', () => {
  it('grades single choice by original index', () => {
    expect(gradeAnswer(single, 2)).toBe(true)
    expect(gradeAnswer(single, 0)).toBe(false)
    expect(gradeAnswer(single, null)).toBe(false)
  })
  it('grades multi all-or-nothing, order independent', () => {
    expect(gradeAnswer(multi, [2, 0])).toBe(true)
    expect(gradeAnswer(multi, [0])).toBe(false)
    expect(gradeAnswer(multi, [0, 1, 2])).toBe(false)
    expect(gradeAnswer(multi, [])).toBe(false)
  })
  it('grades boolean', () => {
    expect(gradeAnswer(bool, false)).toBe(true)
    expect(gradeAnswer(bool, true)).toBe(false)
  })
  it('grades fill ignoring case and surrounding/inner whitespace', () => {
    expect(gradeAnswer(fill, '  Git   STATUS ')).toBe(true)
    expect(gradeAnswer(fill, 'git stat')).toBe(false)
    expect(gradeAnswer(fill, '')).toBe(false)
  })
  it('grades fill by regex pattern when exact match fails', () => {
    expect(gradeAnswer(fillRe, 'ls -al')).toBe(true)
    expect(gradeAnswer(fillRe, 'ls -l')).toBe(false)
  })
  it('detects answered state', () => {
    expect(isAnswered(undefined)).toBe(false)
    expect(isAnswered([])).toBe(false)
    expect(isAnswered('  ')).toBe(false)
    expect(isAnswered(0)).toBe(true)
    expect(isAnswered(false)).toBe(true)
  })
})

describe('score', () => {
  it('summarizes totals and breakdowns, treating missing answers as wrong', () => {
    const s = summarize(bank, { 'docker-001': 2, 'linux-003': false, 'git-004': 'git status' })
    expect(s.total).toBe(5)
    expect(s.correct).toBe(3)
    expect(s.percent).toBe(60)
    expect(s.byDomain.docker).toEqual({ total: 2, correct: 1 })
    expect(s.byDifficulty.hard).toEqual({ total: 1, correct: 1 })
    expect(s.results.find((r) => r.question.id === 'git-005')?.correct).toBe(false)
  })
  it('handles an empty quiz', () => {
    expect(summarize([], {}).percent).toBe(0)
  })
})

describe('storage', () => {
  const rec: AttemptRecord = {
    id: 'a1',
    finishedAt: 1,
    durationSec: 10,
    mode: 'practice',
    total: 2,
    correct: 1,
    byDomain: { docker: { total: 2, correct: 1 } },
    byDifficulty: { easy: { total: 2, correct: 1 } },
  }
  beforeEach(() => localStorage.clear())

  it('round-trips attempts and dedupes by id', () => {
    saveAttempt(rec)
    saveAttempt({ ...rec, correct: 2 })
    expect(loadHistory()).toHaveLength(1)
    expect(loadHistory()[0].correct).toBe(2)
  })
  it('returns empty on corrupt storage', () => {
    localStorage.setItem(HISTORY_KEY, '{not json')
    expect(loadHistory()).toEqual([])
    localStorage.setItem(HISTORY_KEY, '{"a":1}')
    expect(loadHistory()).toEqual([])
  })
  it('clears history', () => {
    saveAttempt(rec)
    clearHistory()
    expect(loadHistory()).toEqual([])
  })
})
