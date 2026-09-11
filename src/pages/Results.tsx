import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Prompt from '../components/Prompt'
import { correctLabel, userLabel } from '../lib/labels'
import { DOMAINS } from '../data/domains'
import { summarize } from '../lib/score'
import { saveAttempt } from '../lib/storage'
import { useSession } from '../session/SessionContext'

export default function Results() {
  const { session, start, reset } = useSession()
  const navigate = useNavigate()
  const [wrongOnly, setWrongOnly] = useState(false)
  const saved = useRef<string | null>(null)

  const summary = useMemo(
    () => (session ? summarize(session.questions.map((p) => p.question), session.answers) : null),
    [session],
  )

  useEffect(() => {
    if (!session || !summary || saved.current === session.id) return
    saved.current = session.id
    const finishedAt = session.finishedAt ?? Date.now()
    saveAttempt({
      id: session.id,
      finishedAt,
      durationSec: Math.round((finishedAt - session.startedAt) / 1000),
      mode: session.settings.mode,
      total: summary.total,
      correct: summary.correct,
      byDomain: summary.byDomain,
      byDifficulty: summary.byDifficulty,
    })
  }, [session, summary])

  if (!session || !summary) return <Navigate to="/" replace />

  const durationSec = Math.round(((session.finishedAt ?? session.startedAt) - session.startedAt) / 1000)
  const label = (id: string) => DOMAINS.find((d) => d.id === id)?.label ?? id
  const shown = wrongOnly ? summary.results.filter((r) => !r.correct) : summary.results
  const wrongQuestions = summary.results.filter((r) => !r.correct).map((r) => r.question)

  function retrySame() {
    start(session!.settings)
    navigate('/quiz')
  }
  function retryWrong() {
    start({ ...session!.settings, count: wrongQuestions.length }, wrongQuestions)
    navigate('/quiz')
  }

  return (
    <div className="results">
      <div className="card score">
        <div className="big-percent">{summary.percent}%</div>
        <div>
          <strong>
            {summary.correct} / {summary.total} correct
          </strong>
          <div className="muted small">
            {session.settings.mode} mode · {Math.floor(durationSec / 60)}m {durationSec % 60}s
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="primary" onClick={retrySame}>
          Retry same settings
        </button>
        <button disabled={wrongQuestions.length === 0} onClick={retryWrong}>
          Retry wrong only ({wrongQuestions.length})
        </button>
        <Link to="/" className="button" onClick={reset}>
          Home
        </Link>
      </div>

      <div className="row">
        <table>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Correct</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary.byDomain).map(([d, t]) => (
              <tr key={d}>
                <td>{label(d)}</td>
                <td>
                  {t.correct} / {t.total}
                </td>
                <td>{Math.round((t.correct / t.total) * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th>Difficulty</th>
              <th>Correct</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {(['easy', 'medium', 'hard'] as const).map((d) => {
              const t = summary.byDifficulty[d]
              return t ? (
                <tr key={d}>
                  <td>{d}</td>
                  <td>
                    {t.correct} / {t.total}
                  </td>
                  <td>{Math.round((t.correct / t.total) * 100)}</td>
                </tr>
              ) : null
            })}
          </tbody>
        </table>
      </div>

      <div className="section-head">
        <h2>Review</h2>
        <label className="inline">
          <input type="checkbox" checked={wrongOnly} onChange={(e) => setWrongOnly(e.target.checked)} /> Wrong only
        </label>
      </div>
      {shown.length === 0 && <p className="muted">Nothing to show.</p>}
      <ol className="review">
        {shown.map(({ question: q, answer, correct }) => (
          <li key={q.id} className={'card ' + (correct ? 'ok' : 'bad')}>
            <div className="badges">
              <span className="badge">{label(q.domain)}</span>
              <span className={'badge ' + q.difficulty}>{q.difficulty}</span>
              <span className={'badge ' + (correct ? 'ok' : 'bad')}>{correct ? 'correct' : 'wrong'}</span>
            </div>
            <Prompt text={q.prompt} className="prompt" />
            <p>
              <span className="muted">Your answer:</span> <Prompt text={userLabel(q, answer)} as="span" />
            </p>
            {!correct && (
              <p>
                <span className="muted">Correct:</span> <Prompt text={correctLabel(q)} as="span" />
              </p>
            )}
            <Prompt text={q.explanation} className="explanation" />
            {q.reference && (
              <a href={q.reference} target="_blank" rel="noreferrer">
                Reference ↗
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
