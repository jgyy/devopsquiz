import type { UserAnswer } from '../lib/grade'
import type { PreparedQuestion } from '../lib/select'
import Prompt from './Prompt'

interface Props {
  prepared: PreparedQuestion
  value: UserAnswer | undefined
  onChange: (a: UserAnswer) => void
  /** When true, inputs are disabled and correct/incorrect state is shown. */
  revealed: boolean
}

export default function QuestionCard({ prepared, value, onChange, revealed }: Props) {
  const { question: q, order } = prepared

  const optionClass = (orig: number, selected: boolean) => {
    if (!revealed) return 'option' + (selected ? ' selected' : '')
    const isCorrect = q.type === 'single' ? orig === q.answer : q.type === 'multi' ? q.answer.includes(orig) : false
    return 'option' + (isCorrect ? ' correct' : selected ? ' wrong' : '') + (selected ? ' selected' : '')
  }

  return (
    <div className="card question">
      <div className="badges">
        <span className="badge">{q.domain}</span>
        <span className={'badge ' + q.difficulty}>{q.difficulty}</span>
        <span className="badge type">{q.type === 'multi' ? 'select all that apply' : q.type === 'fill' ? 'type your answer' : q.type}</span>
      </div>
      <Prompt text={q.prompt} as="h2" className="prompt" />

      {q.type === 'single' && (
        <div className="options" role="radiogroup">
          {order.map((orig) => {
            const selected = value === orig
            return (
              <label key={orig} className={optionClass(orig, selected)}>
                <input type="radio" name={q.id} checked={selected} disabled={revealed} onChange={() => onChange(orig)} />
                <Prompt text={q.options[orig]} as="span" />
              </label>
            )
          })}
        </div>
      )}

      {q.type === 'multi' && (
        <div className="options" role="group">
          {order.map((orig) => {
            const cur = Array.isArray(value) ? value : []
            const selected = cur.includes(orig)
            return (
              <label key={orig} className={optionClass(orig, selected)}>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={revealed}
                  onChange={() => onChange(selected ? cur.filter((i) => i !== orig) : [...cur, orig].sort((a, b) => a - b))}
                />
                <Prompt text={q.options[orig]} as="span" />
              </label>
            )
          })}
        </div>
      )}

      {q.type === 'boolean' && (
        <div className="options bool" role="radiogroup">
          {[true, false].map((v) => {
            const selected = value === v
            const cls = !revealed
              ? 'option' + (selected ? ' selected' : '')
              : 'option' + (v === q.answer ? ' correct' : selected ? ' wrong' : '') + (selected ? ' selected' : '')
            return (
              <label key={String(v)} className={cls}>
                <input type="radio" name={q.id} checked={selected} disabled={revealed} onChange={() => onChange(v)} />
                <span>{v ? 'True' : 'False'}</span>
              </label>
            )
          })}
        </div>
      )}

      {q.type === 'fill' && (
        <input
          className="fill"
          type="text"
          aria-label="Your answer"
          placeholder="Type your answer"
          value={typeof value === 'string' ? value : ''}
          disabled={revealed}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
