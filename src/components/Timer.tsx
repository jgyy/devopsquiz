import { useEffect, useState } from 'react'

export default function Timer({ startedAt, limitSec, onExpire }: { startedAt: number; limitSec: number; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])
  const remaining = Math.max(0, limitSec - Math.floor((now - startedAt) / 1000))
  useEffect(() => {
    if (remaining === 0) onExpire()
  }, [remaining, onExpire])
  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  return (
    <span className={'timer' + (remaining <= 60 ? ' warn' : '')} role="timer" aria-live="polite">
      {m}:{s.toString().padStart(2, '0')}
    </span>
  )
}
