import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Question } from '../data/schema'
import Explanation from './Explanation'

const q: Question = {
  id: 'docker-001',
  domain: 'docker',
  difficulty: 'easy',
  type: 'single',
  prompt: 'Which command lists running containers?',
  options: ['`docker ps`', 'docker images'],
  optionNotes: ['Lists running containers.', '`docker images` lists local images, not containers.'],
  answer: 0,
  explanation: 'docker ps lists running containers.',
  example: 'docker ps\n# CONTAINER ID   IMAGE ...',
  diagram: 'flowchart LR\n  A[docker ps] --> B[running containers]',
  reference: 'https://docs.docker.com/',
}

describe('Explanation', () => {
  it('shows explanation, a note for every option, and the example', () => {
    render(<Explanation question={q} />)
    expect(screen.getByText(/docker ps lists running containers/)).toBeInTheDocument()
    const notes = screen.getByRole('list', { name: 'Option notes' })
    expect(notes.querySelectorAll('li')).toHaveLength(2)
    expect(screen.getByText(/lists local images/)).toBeInTheDocument()
    expect(screen.getByText('Example')).toBeInTheDocument()
    expect(screen.getByText(/CONTAINER ID/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reference/ })).toHaveAttribute('href', 'https://docs.docker.com/')
  })

  it('renders a diagram section for every question', () => {
    render(<Explanation question={q} />)
    expect(screen.getByText('Diagram')).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Diagram' })).toBeInTheDocument()
  })

  it('marks correct and incorrect options', () => {
    render(<Explanation question={q} />)
    const items = screen.getByRole('list', { name: 'Option notes' }).querySelectorAll('li')
    expect(items[0].className).toContain('correct')
    expect(items[1].className).toContain('wrong')
  })

  it('omits option notes for boolean questions but keeps the example', () => {
    const b: Question = { ...q, type: 'boolean', answer: true, options: undefined, optionNotes: undefined } as unknown as Question
    render(<Explanation question={b} />)
    expect(screen.queryByRole('list', { name: 'Option notes' })).not.toBeInTheDocument()
    expect(screen.getByText('Example')).toBeInTheDocument()
  })
})
