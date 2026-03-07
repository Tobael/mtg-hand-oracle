import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useDeck } from '../context/DeckContext';
import { runMonteCarloSimulation } from '../utils/monteCarloSimulator';
import type { MonteCarloResults, MonteCarloConfig } from '../types';

export default function Simulation() {
  const { expandedDeck, rampData, deckFormat } = useDeck();
  const navigate = useNavigate();

  const [simCount, setSimCount] = useState(1000);
  const [turnsToSim, setTurnsToSim] = useState(5);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MonteCarloResults | null>(null);

  const rampCardNames = useMemo(() => {
    if (!rampData) return new Set<string>();
    const names = new Set<string>();
    for (const category of Object.values(rampData)) {
      for (const card of category) {
        names.add(card.name);
      }
    }
    return names;
  }, [rampData]);

  const workerRef = useRef<Worker | null>(null);

  const handleRunSimulation = useCallback(async () => {
    if (expandedDeck.length === 0) return;
    setRunning(true);
    setProgress(0);
    setResults(null);

    // Use Web Worker if available, otherwise run inline
    try {
      const worker = new Worker(
        new URL('../workers/simulationWorker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          setProgress(Math.round((e.data.completed / e.data.total) * 100));
        } else if (e.data.type === 'result') {
          setResults(e.data.results);
          setRunning(false);
          worker.terminate();
        }
      };

      worker.onerror = () => {
        // Fallback to main thread
        runOnMainThread();
        worker.terminate();
      };

      worker.postMessage({
        deck: expandedDeck,
        rampCardNames: Array.from(rampCardNames),
        config: { simulations: simCount, turnsToSimulate: turnsToSim } as MonteCarloConfig,
        format: deckFormat,
      });
    } catch {
      runOnMainThread();
    }
  }, [expandedDeck, rampCardNames, simCount, turnsToSim, deckFormat]);

  const runOnMainThread = useCallback(() => {
    // setTimeout to allow UI to update with "running" state
    setTimeout(() => {
      const result = runMonteCarloSimulation(
        expandedDeck,
        rampCardNames,
        { simulations: simCount, turnsToSimulate: turnsToSim },
        deckFormat,
        (completed, total) => {
          setProgress(Math.round((completed / total) * 100));
        }
      );
      setResults(result);
      setRunning(false);
    }, 50);
  }, [expandedDeck, rampCardNames, simCount, turnsToSim, deckFormat]);

  if (expandedDeck.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No deck imported</h2>
          <p>Go back and import a deck first.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Import Deck</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page simulation-page">
      <div className="sim-header">
        <h1>Statistical Simulation</h1>
        <span className="format-badge">{deckFormat === 'commander' ? 'Commander' : '60-Card'}</span>
      </div>

      <p className="sim-description">
        Run thousands of automated games to evaluate how consistently your deck produces playable hands
        and how well it curves out over the first few turns.
      </p>

      {/* Controls */}
      <div className="sim-controls">
        <div className="control-group">
          <label htmlFor="sim-count">Simulations</label>
          <div className="control-row">
            <input
              id="sim-count"
              type="range"
              min={100}
              max={10000}
              step={100}
              value={simCount}
              onChange={(e) => setSimCount(Number(e.target.value))}
              disabled={running}
            />
            <span className="control-value">{simCount.toLocaleString()}</span>
          </div>
        </div>
        <div className="control-group">
          <label htmlFor="turns-count">Turns to Simulate</label>
          <div className="control-row">
            <input
              id="turns-count"
              type="range"
              min={1}
              max={8}
              step={1}
              value={turnsToSim}
              onChange={(e) => setTurnsToSim(Number(e.target.value))}
              disabled={running}
            />
            <span className="control-value">{turnsToSim}</span>
          </div>
        </div>
        <button
          className="btn-primary btn-large btn-run-sim"
          onClick={handleRunSimulation}
          disabled={running}
        >
          {running ? '⏳ Running...' : '🚀 Run Simulation'}
        </button>
      </div>

      {/* Progress Bar */}
      {running && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="sim-results">
          {/* Summary Cards */}
          <div className="results-summary">
            <div className="result-card result-playable">
              <span className="result-value">{results.playableRate}%</span>
              <span className="result-label">Playable Hands</span>
              <span className="result-sub">Score ≥ 65</span>
            </div>
            <div className="result-card result-risky">
              <span className="result-value">{results.riskyRate}%</span>
              <span className="result-label">Risky Hands</span>
              <span className="result-sub">Score 40–64</span>
            </div>
            <div className="result-card result-brick">
              <span className="result-value">{results.brickRate}%</span>
              <span className="result-label">Bricked Hands</span>
              <span className="result-sub">Score &lt; 40</span>
            </div>
            <div className="result-card result-neutral">
              <span className="result-value">{results.averageScore}</span>
              <span className="result-label">Avg Score</span>
              <span className="result-sub">out of 100</span>
            </div>
            <div className="result-card result-neutral">
              <span className="result-value">{results.averageMulligans}</span>
              <span className="result-label">Avg Mulligans</span>
              <span className="result-sub">per game</span>
            </div>
          </div>

          {/* Interpretation */}
          <div className="interpretation-panel">
            <h3>📋 Interpretation</h3>
            <p>
              Across <strong>{results.totalSimulations.toLocaleString()}</strong> simulated games, your deck produces
              {' '}<strong className="text-keep">{results.playableRate}% playable</strong> opening hands.
              {results.brickRate > 20 && (
                <> A <strong className="text-brick">{results.brickRate}% brick rate</strong> is concerning — consider adjusting your mana base or curve.</>
              )}
              {results.brickRate <= 20 && results.brickRate > 10 && (
                <> The <strong className="text-risky">{results.brickRate}% brick rate</strong> is acceptable but could be improved.</>
              )}
              {results.brickRate <= 10 && (
                <> With only a <strong className="text-keep">{results.brickRate}% brick rate</strong>, your deck has excellent consistency.</>
              )}
              {results.averageMulligans > 0.5 && (
                <> Averaging {results.averageMulligans} mulligans per game suggests the deck may need tuning.</>
              )}
            </p>
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            {/* Score Distribution */}
            <div className="chart-card">
              <h2>Score Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={results.scoreDistribution} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="range" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20, 15, 35, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#9b6dff" radius={[4, 4, 0, 0] as any} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Mana Utilization over turns */}
            <div className="chart-card">
              <h2>Turn-by-Turn Performance</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={results.turnByTurnStats} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="turn" stroke="rgba(255,255,255,0.5)" fontSize={13} label={{ value: 'Turn', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)' }} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20, 15, 35, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }} />
                  <Line type="monotone" dataKey="avgManaAvailable" name="Mana Available" stroke="#9b6dff" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="avgManaUsed" name="Mana Spent" stroke="#2ecc71" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="avgCardsStuck" name="Cards Stuck" stroke="#e74c3c" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Turn Details Table */}
          <div className="analysis-section">
            <h2>Turn-by-Turn Breakdown</h2>
            <div className="turn-table-wrapper">
              <table className="turn-table">
                <thead>
                  <tr>
                    <th>Turn</th>
                    <th>Avg Mana</th>
                    <th>Avg Spent</th>
                    <th>Utilization</th>
                    <th>Cards Played</th>
                    <th>Cards Stuck</th>
                  </tr>
                </thead>
                <tbody>
                  {results.turnByTurnStats.map(t => (
                    <tr key={t.turn}>
                      <td className="turn-cell">{t.turn}</td>
                      <td>{t.avgManaAvailable}</td>
                      <td>{t.avgManaUsed}</td>
                      <td>
                        <span className={`util-badge ${t.manaUtilization >= 0.7 ? 'good' : t.manaUtilization >= 0.4 ? 'ok' : 'bad'}`}>
                          {Math.round(t.manaUtilization * 100)}%
                        </span>
                      </td>
                      <td>{t.avgCardsPlayable}</td>
                      <td>{t.avgCardsStuck}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="analysis-actions">
        <button className="btn-secondary" onClick={() => navigate('/analysis')}>← Back to Analysis</button>
        <button className="btn-secondary" onClick={() => navigate('/simulator')}>🎲 Manual Simulator</button>
        <button className="btn-secondary" onClick={() => navigate('/')}>Import New Deck</button>
      </div>
    </div>
  );
}
