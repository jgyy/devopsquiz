import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Stats from './pages/Stats'
import { SessionProvider } from './session/SessionContext'

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
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/results" element={<Results />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
      </HashRouter>
    </SessionProvider>
  )
}
