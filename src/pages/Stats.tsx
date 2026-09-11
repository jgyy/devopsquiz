import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DOMAINS } from '../data/domains'
import { clearHistory, loadHistory } from '../lib/storage'

export default function Stats() {
  const [history, setHistory] = useState(() => loadHistory())
  const attempts = history.length
  const total = history.reduce((n, a) => n + a.total, 0)
  const correct = history.reduce((n, a) => n + a.correct, 0)

  const perDomain = DOMAINS.map((d) => {
    let t = 0
    let c = 0
    for (const a of history) {
      const x = a.byDomain[d.id]
      if (x) {
        t += x.total
        c += x.correct
      }
    }
    return { ...d, total: t, correct: c }
  }).filter((d) => d.total > 0)

  function resetAll() {
    if (window.confirm('Delete all saved attempts? This cannot be undone.')) {
      clearHistory()
      setHistory([])
    }
  }

  return (
    <div className="stats">
      <div className="section-head">
        <h1>Your stats</h1>
        <button className="link" disabled={attempts === 0} onClick={resetAll}>
          Reset history
        </button>
      </div>
      {attempts === 0 ? (
        <p className="muted">
          No attempts yet. <Link to="/">Start a quiz</Link>.
        </p>
      ) : (
        <>
          <div className="card score">
            <div className="big-percent">{total ? Math.round((correct / total) * 100) : 0}%</div>
            <div>
              <strong>{attempts} attempts</strong>
              <div className="muted small">
                {correct} / {total} questions correct
              </div>
            </div>
          </div>

          <h2>By domain</h2>
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Seen</th>
                <th>Correct</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {perDomain.map((d) => (
                <tr key={d.id}>
                  <td>{d.label}</td>
                  <td>{d.total}</td>
                  <td>{d.correct}</td>
                  <td>
                    <div className="meter">
                      <div style={{ width: `${(d.correct / d.total) * 100}%` }} />
                    </div>
                    {Math.round((d.correct / d.total) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Recent attempts</h2>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Mode</th>
                <th>Score</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...history]
                .sort((a, b) => b.finishedAt - a.finishedAt)
                .slice(0, 20)
                .map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.finishedAt).toLocaleString()}</td>
                    <td>{a.mode}</td>
                    <td>
                      {a.correct} / {a.total} ({Math.round((a.correct / a.total) * 100)}%)
                    </td>
                    <td>
                      {Math.floor(a.durationSec / 60)}m {a.durationSec % 60}s
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
