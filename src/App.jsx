import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AppLayout from './components/AppLayout'

import Home from './pages/Home'
import Games from './pages/Games'
import About from './pages/about/About'
import Characters from './pages/characters/Characters'
import Houses from './pages/houses/Houses'

import ImposterHome from './pages/ImposterHome'
import Settings from './pages/games/imposter/Settings'
import CardReveal from './pages/games/imposter/CardReveal'
import Voting from './pages/games/imposter/Voting'
import EliminationReveal from './pages/games/imposter/EliminationReveal'
import Results from './pages/games/imposter/Results'

import Draft from './pages/games/draft/Draft'
import Campaign from './pages/games/campaign/Draft'
import WhoAmI from './pages/WhoAmI'
import Trivia from './pages/Trivia'

function AppRoutes() {
  const location = useLocation()

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/about" element={<About />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/houses" element={<Houses />} />

          <Route path="/games/imposter" element={<ImposterHome />} />
          <Route path="/games/imposter/settings" element={<Settings />} />
          <Route path="/games/imposter/reveal" element={<CardReveal />} />
          <Route path="/games/imposter/voting" element={<Voting />} />
          <Route path="/games/imposter/elimination" element={<EliminationReveal />} />
          <Route path="/games/imposter/results" element={<Results />} />

          <Route path="/games/draft" element={<Draft />} />
          <Route path="/games/campaign" element={<Campaign />} />
          <Route path="/games/who-am-i" element={<WhoAmI />} />
          <Route path="/games/trivia" element={<Trivia />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}