import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

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

  // Expanded view: the same SVG in a full-viewport overlay so a diagram squeezed into the
  // feedback sidebar can be read at its natural size. Escape or the Close button dismisses it.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  return (
    <figure className="diagram" aria-label="Diagram">
      {svg ? (
        <>
          <div className="diagram-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          <button className="link diagram-expand" onClick={() => setExpanded(true)} aria-label="Expand diagram">
            Expand ⤢
          </button>
        </>
      ) : (
        <pre className={'example diagram-source' + (failed ? ' failed' : '')}>
          <code>{source}</code>
        </pre>
      )}
      {/* Portalled to <body>: the feedback sidebar is position: sticky, which creates its own stacking
          context, so an overlay rendered inside it would sit under the sticky quiz header. */}
      {expanded && svg && createPortal(
        <div className="diagram-overlay" role="dialog" aria-modal="true" aria-label="Diagram" onClick={() => setExpanded(false)}>
          <div className="diagram-overlay-body" onClick={(e) => e.stopPropagation()}>
            <button className="link diagram-close" onClick={() => setExpanded(false)} aria-label="Close" autoFocus>
              Close ✕
            </button>
            <div className="diagram-svg large" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>,
        document.body,
      )}
    </figure>
  )
}
