import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Prompt from '../components/Prompt'
import QuestionCard from '../components/QuestionCard'
import { correctLabel } from '../lib/labels'
import Timer from '../components/Timer'
import { gradeAnswer, isAnswered } from '../lib/grade'
import { useSession } from '../session/SessionContext'

export default function Quiz() {
  const { session, answer, finish } = useSession()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const done = useCallback(() => {
    finish()
    navigate('/results', { replace: true })
  }, [finish, navigate])

  useEffect(() => {
    if (session?.finishedAt) navigate('/results', { replace: true })
  }, [session?.finishedAt, navigate])

  if (!session || session.questions.length === 0) return <Navigate to="/" replace />

  const { questions, settings, answers } = session
  const isExam = settings.mode === 'exam'
  const prepared = questions[index]
  const q = prepared.question
  const current = answers[q.id]
  const last = index === questions.length - 1
  const answeredCount = questions.filter((p) => isAnswered(answers[p.question.id])).length

  function next() {
    setRevealed(false)
    if (last) done()
    else setIndex(index + 1)
  }

  return (
    <div className="quiz">
      <div className="quiz-head">
        <div className="progress" aria-label="progress">
          <div className="bar" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
        <div className="quiz-meta">
          <span>
            {index + 1} / {questions.length}
          </span>
          {isExam && settings.timeLimitSec && <Timer startedAt={session.startedAt} limitSec={settings.timeLimitSec} onExpire={done} />}
        </div>
      </div>

      <QuestionCard prepared={prepared} value={current} onChange={(a) => answer(q.id, a)} revealed={revealed} />

      {revealed && (
        <div className={'card feedback ' + (gradeAnswer(q, current ?? null) ? 'ok' : 'bad')}>
          <strong>{gradeAnswer(q, current ?? null) ? 'Correct' : 'Incorrect'}</strong>
          {!gradeAnswer(q, current ?? null) && (
            <p>
              Correct answer: <Prompt text={correctLabel(q)} as="span" />
            </p>
          )}
          <Prompt text={q.explanation} />
          {q.reference && (
            <a href={q.reference} target="_blank" rel="noreferrer">
              Reference ↗
            </a>
          )}
        </div>
      )}

      <div className="actions">
        {isExam ? (
          <>
            <button disabled={index === 0} onClick={() => setIndex(index - 1)}>
              Previous
            </button>
            <span className="muted small">{answeredCount} answered</span>
            {last ? (
              <button className="primary" onClick={done}>
                Finish
              </button>
            ) : (
              <button className="primary" onClick={() => setIndex(index + 1)}>
                Next
              </button>
            )}
            <button className="link" onClick={done}>
              Finish early
            </button>
          </>
        ) : revealed ? (
          <button className="primary" onClick={next} autoFocus>
            {last ? 'See results' : 'Next'}
          </button>
        ) : (
          <>
            <button className="primary" disabled={!isAnswered(current)} onClick={() => setRevealed(true)}>
              Submit
            </button>
            <button className="link" onClick={() => setRevealed(true)}>
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  )
}
