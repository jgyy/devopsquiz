import type { Question } from '../data/schema'
import Diagram from './Diagram'
import Prompt from './Prompt'

interface Props {
  question: Question
  className?: string
}

/**
 * Post-answer teaching block: the explanation, one note per option saying what it is and
 * why it is (or isn't) correct, a Mermaid diagram, a worked example, and the reference link. Shown whether the
 * user answered correctly or not, so every distractor gets explained.
 */
export default function Explanation({ question: q, className }: Props) {
  const hasOptions = q.type === 'single' || q.type === 'multi'
  const isCorrect = (i: number) => (q.type === 'single' ? q.answer === i : q.type === 'multi' ? q.answer.includes(i) : false)

  return (
    <div className="explain">
      <Prompt text={q.explanation} className={className} />

      {hasOptions && (
        <>
          <h4>Options</h4>
          <ul className="option-notes" aria-label="Option notes">
            {q.options.map((opt, i) => {
              const ok = isCorrect(i)
              return (
                <li key={i} className={ok ? 'correct' : 'wrong'}>
                  <span className="mark" aria-label={ok ? 'correct option' : 'incorrect option'}>
                    {ok ? '✓' : '✗'}
                  </span>
                  <div>
                    <Prompt text={opt} as="span" className="label" />
                    <br />
                    <Prompt text={q.optionNotes[i]} as="span" className="note" />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <h4>Diagram</h4>
      <Diagram source={q.diagram} />

      <h4>Example</h4>
      <pre className="example">
        <code>{q.example}</code>
      </pre>

      {q.reference && (
        <a className="reference" href={q.reference} target="_blank" rel="noreferrer">
          Reference ↗
        </a>
      )}
    </div>
  )
}
