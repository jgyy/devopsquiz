import { Terminal as Xterm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef, useState } from 'react'
import { createVm, isVmSupported, makePromptDetector, type Vm } from '../lib/vm'

type Status = 'booting' | 'ready' | 'error'

export default function Terminal() {
  const hostRef = useRef<HTMLDivElement>(null)
  const vmRef = useRef<Vm | null>(null)
  const [status, setStatus] = useState<Status>('booting')
  const [error, setError] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!isVmSupported()) {
      setStatus('error')
      setError('This browser does not support WebAssembly, so the terminal cannot run.')
      return
    }
    const term = new Xterm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      theme: { background: '#0f1419', foreground: '#e6edf3', cursor: '#3fb950' },
      convertEol: true,
    })
    term.open(host)
    term.writeln('Booting Linux… (downloads ~7 MB on first use)')

    let cancelled = false
    let unsubscribe = () => {}
    const detect = makePromptDetector()

    createVm()
      .then((vm) => {
        if (cancelled) return vm.destroy()
        vmRef.current = vm
        unsubscribe = vm.onOutput((byte) => {
          term.write(Uint8Array.of(byte))
          if (detect(byte)) setStatus('ready')
        })
        term.onData((data) => vm.send(data))
        term.focus()
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setStatus('error')
        setError(e instanceof Error ? e.message : 'Failed to start the virtual machine.')
      })

    return () => {
      cancelled = true
      unsubscribe()
      vmRef.current?.destroy()
      vmRef.current = null
      term.dispose()
    }
  }, [generation])

  function restart() {
    setStatus('booting')
    setError(null)
    setGeneration((g) => g + 1)
  }

  return (
    <div className="card terminal">
      <div className="terminal-bar">
        <span className={'muted small status-' + status}>
          {status === 'booting' ? 'Booting…' : status === 'ready' ? 'Ready — BusyBox shell (try ls, cat, grep, vi)' : 'Error'}
        </span>
        <button className="link" onClick={restart}>
          Restart VM
        </button>
      </div>
      {error ? <p className="terminal-error">{error}</p> : null}
      <div ref={hostRef} className="terminal-host" />
    </div>
  )
}
