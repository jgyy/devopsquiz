import { useEffect, useId, useState } from 'react'

interface Props {
  /** Mermaid source text. */
  source: string
}

let mermaidPromise: Promise<typeof import('mermaid')['default']> | undefined

/** Loads Mermaid once, lazily, so the quiz bundle stays small until the first explanation. */
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(({ default: mermaid }) => {
      const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
      mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict' })
      return mermaid
    })
  }
  return mermaidPromise
}

/**
 * Renders a Mermaid diagram to inline SVG. While loading, or if the source fails to parse,
 * the raw source is shown in a <pre> so the learner never sees an empty box.
 */
export default function Diagram({ source }: Props) {
  const id = useId().replace(/:/g, '')
  // Result is keyed to the source it was rendered from, so a new source shows the fallback
  // immediately without a synchronous state reset inside the effect.
  const [result, setResult] = useState<{ source: string; svg?: string; failed?: boolean }>()
  const svg = result?.source === source ? result.svg : undefined
  const failed = result?.source === source && result.failed === true

  useEffect(() => {
    let cancelled = false
    loadMermaid()
      .then((m) => m.render(`mmd-${id}`, source))
      .then(({ svg }) => {
        if (!cancelled) setResult({ source, svg })
      })
      .catch(() => {
        if (!cancelled) setResult({ source, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [source, id])

  return (
    <figure className="diagram" aria-label="Diagram">
      {svg ? (
        <div className="diagram-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <pre className={'example diagram-source' + (failed ? ' failed' : '')}>
          <code>{source}</code>
        </pre>
      )}
    </figure>
  )
}
