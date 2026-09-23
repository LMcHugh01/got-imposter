import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AppLayout from './components/AppLayout'
import { useScrollOnNavigate } from './lib/useScrollOnNavigate'
import { AuthProvider } from './lib/auth'

import Home from './pages/Home'
import Games from './pages/Games'
import About from './pages/about/About'
import Characters from './pages/characters/Characters'
import Houses from './pages/houses/Houses'
import Privacy from './pages/Privacy'

import SignUp from './pages/auth/SignUp'
import CheckEmail from './pages/auth/CheckEmail'
import AuthConfirm from './pages/auth/AuthConfirm'
import LogIn from './pages/auth/LogIn'
import Forgot from './pages/auth/Forgot'
import ResetPassword from './pages/auth/ResetPassword'
import Account from './pages/account/Account'

import ImposterHome from './pages/games/imposter/ImposterHome'
import Settings from './pages/games/imposter/Settings'
import CardReveal from './pages/games/imposter/CardReveal'
import Voting from './pages/games/imposter/Voting'
import EliminationReveal from './pages/games/imposter/EliminationReveal'
import Results from './pages/games/imposter/Results'

import WhispersHome from './pages/games/whispers/WhispersHome'
import WhispersGame from './pages/games/whispers/WhispersGame'

import AllegiancesHome from './pages/games/allegiances/AllegiancesHome'
import AllegiancesGame from './pages/games/allegiances/AllegiancesGame'

import RavensHome from './pages/games/ravens/RavensHome'
import RavensGame from './pages/games/ravens/RavensGame'

import Draft from './pages/games/draft/Draft'
import Campaign from './pages/games/campaign/Draft'
import WhoAmI from './pages/WhoAmI'
import Trivia from './pages/Trivia'

function AppRoutes() {
  const location = useLocation()
  const handleExitComplete = useScrollOnNavigate()

  return (
    <AppLayout>
      <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/about" element={<About />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/houses" element={<Houses />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup/sent" element={<CheckEmail />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/account" element={<Account />} />

          <Route path="/games/imposter" element={<ImposterHome />} />
          <Route path="/games/imposter/settings" element={<Settings />} />
          <Route path="/games/imposter/reveal" element={<CardReveal />} />
          <Route path="/games/imposter/voting" element={<Voting />} />
          <Route path="/games/imposter/elimination" element={<EliminationReveal />} />
          <Route path="/games/imposter/results" element={<Results />} />

          <Route path="/games/whispers" element={<WhispersHome />} />
          <Route path="/games/whispers/play" element={<WhispersGame />} />

          <Route path="/games/allegiances" element={<AllegiancesHome />} />
          <Route path="/games/allegiances/:assemblyId" element={<AllegiancesGame />} />

          <Route path="/games/ravens" element={<RavensHome />} />
          <Route path="/games/ravens/play" element={<RavensGame />} />

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
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}