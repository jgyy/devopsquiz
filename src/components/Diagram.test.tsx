import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Diagram from './Diagram'

vi.mock('mermaid', () => ({
  default: {
    initialize: () => {},
    render: async (_id: string, source: string) => ({ svg: `<svg data-src="${source}"></svg>` }),
  },
}))

describe('Diagram', () => {
  it('expands the rendered diagram into an overlay and closes on Escape', async () => {
    const user = userEvent.setup()
    render(<Diagram source="flowchart LR\n A --> B" />)
    const expand = await screen.findByRole('button', { name: 'Expand diagram' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(expand)
    const dialog = screen.getByRole('dialog', { name: 'Diagram' })
    expect(dialog.querySelector('svg')).not.toBeNull()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(expand)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
