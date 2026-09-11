import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Stats from './pages/Stats'
import { SessionProvider } from './session/SessionContext'

function Main() {
  // The quiz page lays question and feedback side by side, so it gets a wider container.
  const wide = useLocation().pathname === '/quiz'
  return (
    <main className={'container' + (wide ? ' wide' : '')}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/results" element={<Results />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </main>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <header className="topbar">
          <Link to="/" className="brand">
            DevOps Quiz
          </Link>
          <nav>
            <Link to="/stats">Stats</Link>
          </nav>
        </header>
        <Main />
      </HashRouter>
    </SessionProvider>
  )
}
