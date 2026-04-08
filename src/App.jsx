import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Home from './pages/Home'
import Settings from './pages/Settings'
import CardReveal from './pages/CardReveal'
import Voting from './pages/Voting'
import EliminationReveal from './pages/EliminationReveal'
import Results from './pages/Results'

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reveal" element={<CardReveal />} />
          <Route path="/voting" element={<Voting />} />
          <Route path="/elimination" element={<EliminationReveal />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}
