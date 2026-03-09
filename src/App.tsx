import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { DeckProvider, useDeck } from './context/DeckContext';
import DeckImport from './pages/DeckImport';
import DeckAnalysis from './pages/DeckAnalysis';
import HandSimulator from './pages/HandSimulator';
import Simulation from './pages/Simulation';
import ArtSelection from './pages/ArtSelection';
import ProbabilityCalculator from './pages/ProbabilityCalculator';
import CardTags from './pages/CardTags';
import './index.css';

function AppContent() {
  const { activeDeckId, savedDecks } = useDeck();
  const activeDeck = savedDecks.find(d => d.id === activeDeckId);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-logo">✦</span>
          <span className="nav-title">MTG Hand Oracle</span>
        </div>
        <div className="nav-active-deck">
          {activeDeck ? (
            <span className="active-pill">🟢 {activeDeck.name}</span>
          ) : (
            <span className="inactive-pill">⚪ No Deck Active</span>
          )}
        </div>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Toolbox
          </NavLink>
          {activeDeckId && (
            <>
              <NavLink to="/analysis" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Analysis
              </NavLink>
              <NavLink to="/simulator" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Simulator
              </NavLink>
              <NavLink to="/simulation" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Stats
              </NavLink>
              <NavLink to="/probabilities" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Probabilities
              </NavLink>
              <NavLink to="/tags" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Tags
              </NavLink>
              <NavLink to="/art-selection" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Art Selection
              </NavLink>
            </>
          )}
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DeckImport />} />
          <Route path="/analysis" element={<DeckAnalysis />} />
          <Route path="/simulator" element={<HandSimulator />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/probabilities" element={<ProbabilityCalculator />} />
          <Route path="/tags" element={<CardTags />} />
          <Route path="/art-selection" element={<ArtSelection />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <DeckProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </DeckProvider>
  );
}

export default App;
