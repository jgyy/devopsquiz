import type { Question } from '../data/schema'
import type { UserAnswer } from './grade'

export function correctLabel(q: Question): string {
  switch (q.type) {
    case 'single':
      return q.options[q.answer]
    case 'multi':
      return q.answer.map((i) => q.options[i]).join(', ')
    case 'boolean':
      return q.answer ? 'True' : 'False'
    case 'fill':
      return q.answer[0]
  }
}

export function userLabel(q: Question, a: UserAnswer | undefined): string {
  if (a === null || a === undefined || (Array.isArray(a) && a.length === 0) || a === '') return '(no answer)'
  switch (q.type) {
    case 'single':
      return typeof a === 'number' ? q.options[a] : '(no answer)'
    case 'multi':
      return Array.isArray(a) ? a.map((i) => q.options[i]).join(', ') : '(no answer)'
    case 'boolean':
      return a ? 'True' : 'False'
    case 'fill':
      return String(a)
  }
}
