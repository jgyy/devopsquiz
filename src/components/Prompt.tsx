/** Renders a prompt string, turning `backtick` spans into <code>. */
export default function Prompt({ text, as: Tag = 'p', className }: { text: string; as?: 'p' | 'span' | 'h2'; className?: string }) {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <Tag className={className}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : <span key={i}>{p}</span>,
      )}
    </Tag>
  )
}
