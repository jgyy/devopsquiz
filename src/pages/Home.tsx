import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DIFFICULTIES, DOMAINS, type Difficulty, type Domain } from '../data/domains'
import { QUESTIONS } from '../data'
import { filterQuestions } from '../lib/select'
import { loadPrefs, savePrefs } from '../lib/storage'
import { useSession, type Mode } from '../session/SessionContext'

const COUNTS = [10, 20, 40] as const

export default function Home() {
  const navigate = useNavigate()
  const { start } = useSession()
  // Restore the last setup choices so a returning user does not have to re-pick them.
  const [saved] = useState(loadPrefs)
  const [domains, setDomains] = useState<Domain[]>(saved?.domains ?? DOMAINS.map((d) => d.id))
  const [difficulties, setDifficulties] = useState<Difficulty[]>(saved?.difficulties ?? [...DIFFICULTIES])
  const [count, setCount] = useState<number | 'all'>(saved?.count ?? 20)
  const [mode, setMode] = useState<Mode>(saved?.mode ?? 'practice')
  const [minutes, setMinutes] = useState<number | ''>(saved?.minutes ?? '')

  useEffect(() => {
    savePrefs({ domains, difficulties, count, mode, minutes })
  }, [domains, difficulties, count, mode, minutes])

  const perDomain = useMemo(() => {
    const m: Record<string, number> = {}
    for (const q of QUESTIONS) if (difficulties.includes(q.difficulty)) m[q.domain] = (m[q.domain] ?? 0) + 1
    return m
  }, [difficulties])
  const available = useMemo(() => filterQuestions(QUESTIONS, { domains, difficulties }).length, [domains, difficulties])
  const effectiveCount = count === 'all' ? available : Math.min(count, available)
  const defaultMinutes = Math.max(1, effectiveCount)

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const allSelected = domains.length === DOMAINS.length

  function begin() {
    const timeLimitSec = mode === 'exam' ? (minutes === '' ? defaultMinutes : minutes) * 60 : undefined
    start({ domains, difficulties, count: effectiveCount, mode, timeLimitSec })
    navigate('/quiz')
  }

  return (
    <div className="home">
      <h1>Practice DevOps knowledge</h1>
      <p className="muted">{QUESTIONS.length} questions across {DOMAINS.length} domains.</p>

      <section>
        <div className="section-head">
          <h2>Domains</h2>
          <button className="link" onClick={() => setDomains(allSelected ? [] : DOMAINS.map((d) => d.id))}>
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="chips">
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              className={'chip' + (domains.includes(d.id) ? ' on' : '')}
              aria-pressed={domains.includes(d.id)}
              onClick={() => toggle(domains, d.id, setDomains)}
            >
              {d.label} <span className="count">{perDomain[d.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Difficulty</h2>
        <div className="chips">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={'chip ' + d + (difficulties.includes(d) ? ' on' : '')}
              aria-pressed={difficulties.includes(d)}
              onClick={() => toggle(difficulties, d, setDifficulties)}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      <section className="row">
        <div>
          <h2>Questions</h2>
          <div className="chips">
            {COUNTS.map((c) => (
              <button key={c} className={'chip' + (count === c ? ' on' : '')} aria-pressed={count === c} onClick={() => setCount(c)}>
                {c}
              </button>
            ))}
            <button className={'chip' + (count === 'all' ? ' on' : '')} aria-pressed={count === 'all'} onClick={() => setCount('all')}>
              All ({available})
            </button>
          </div>
        </div>
        <div>
          <h2>Mode</h2>
          <div className="chips">
            <button className={'chip' + (mode === 'practice' ? ' on' : '')} aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>
              Practice
            </button>
            <button className={'chip' + (mode === 'exam' ? ' on' : '')} aria-pressed={mode === 'exam'} onClick={() => setMode('exam')}>
              Exam
            </button>
          </div>
          {mode === 'exam' && (
            <label className="inline">
              Time limit (min)
              <input
                type="number"
                min={1}
                max={300}
                placeholder={String(defaultMinutes)}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
              />
            </label>
          )}
        </div>
      </section>

      <p className="muted small">
        {mode === 'practice'
          ? 'Practice: instant feedback and explanations after each question.'
          : 'Exam: timed, no feedback until the end, navigate freely between questions.'}
      </p>

      <button className="primary big" disabled={effectiveCount === 0} onClick={begin}>
        {effectiveCount === 0 ? 'No questions match your filters' : `Start ${effectiveCount} questions`}
      </button>
    </div>
  )
}
