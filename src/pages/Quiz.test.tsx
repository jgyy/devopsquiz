import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Question } from '../data/schema'
import { SessionProvider, useSession, type QuizSettings } from '../session/SessionContext'
import Quiz from './Quiz'

const bank: Question[] = [
  {
    id: 'docker-001',
    domain: 'docker',
    difficulty: 'easy',
    type: 'single',
    prompt: 'Which command lists running containers?',
    options: ['docker ps', 'docker images', 'docker run'],
    optionNotes: ['Lists running containers.', 'Lists local images.', 'Starts a new container.'],
    answer: 0,
    explanation: 'docker ps lists running containers.',
    example: 'docker ps',
  },
]

function Starter({ settings }: { settings: QuizSettings }) {
  const { session, start } = useSession()
  if (!session) start(settings)
  return session ? <Quiz /> : null
}

function renderQuiz(mode: 'practice' | 'exam', extra: Partial<QuizSettings> = {}) {
  return render(
    <SessionProvider bank={bank}>
      <MemoryRouter initialEntries={['/quiz']}>
        <Routes>
          <Route path="/quiz" element={<Starter settings={{ domains: ['docker'], difficulties: ['easy'], count: 1, mode, ...extra }} />} />
          <Route path="/results" element={<div>RESULTS PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('Quiz page', () => {
  it('practice mode shows feedback and explanation after submit', async () => {
    const user = userEvent.setup()
    renderQuiz('practice')
    expect(screen.queryByText(/lists running containers\./)).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('docker ps'))
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Correct')).toBeInTheDocument()
    expect(screen.getByText(/lists running containers\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'See results' }))
    expect(screen.getByText('RESULTS PAGE')).toBeInTheDocument()
  })

  it('exam mode shows no feedback and finishes to results', async () => {
    const user = userEvent.setup()
    renderQuiz('exam', { timeLimitSec: 600 })
    expect(screen.getByRole('timer')).toBeInTheDocument()
    await user.click(screen.getByLabelText('docker images'))
    expect(screen.queryByText('Incorrect')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(screen.getByText('RESULTS PAGE')).toBeInTheDocument()
  })

  it('exam mode auto-finishes when the timer expires', async () => {
    renderQuiz('exam', { timeLimitSec: 1 })
    expect(await screen.findByText('RESULTS PAGE', {}, { timeout: 4000 })).toBeInTheDocument()
  })
})
