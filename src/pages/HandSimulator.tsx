import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeck } from '../context/DeckContext';
import { createSimulator, drawNewHand, mulliganDraw, putCardsOnBottom, keepHand, getCardsToBottom } from '../utils/handSimulator';
import { evaluateHand } from '../utils/handEvaluator';
import type { SimulatorState, HandEvaluation } from '../types';

interface HandHistoryEntry {
  hand: string[];
  verdict: string;
  score: number;
  mulligans: number;
}

export default function HandSimulator() {
  const { expandedDeck, rampData, deckFormat } = useDeck();
  const navigate = useNavigate();

  const [sim, setSim] = useState<SimulatorState | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<'idle' | 'drawn' | 'mulliganSelect' | 'kept'>('idle');
  const [evaluation, setEvaluation] = useState<HandEvaluation | null>(null);
  const [handHistory, setHandHistory] = useState<HandHistoryEntry[]>([]);

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

  const doEvaluate = useCallback((hand: typeof expandedDeck) => {
    const result = evaluateHand(hand, { rampCards: rampCardNames, format: deckFormat });
    setEvaluation(result);
  }, [rampCardNames, deckFormat]);

  const handleDrawNewHand = useCallback(() => {
    const initial = sim || createSimulator(expandedDeck);
    const newSim = drawNewHand(initial);
    setSim(newSim);
    setPhase('drawn');
    setSelectedIndices(new Set());
    doEvaluate(newSim.hand);
  }, [sim, expandedDeck, doEvaluate]);

  const handleMulligan = useCallback(() => {
    if (!sim) return;
    const newSim = mulliganDraw(sim);
    setSim(newSim);
    setPhase('drawn');
    setSelectedIndices(new Set());
    doEvaluate(newSim.hand);
  }, [sim, doEvaluate]);

  const handleStartMulliganSelect = useCallback(() => {
    setPhase('mulliganSelect');
    setSelectedIndices(new Set());
  }, []);

  const toggleCardSelection = useCallback((index: number) => {
    if (phase !== 'mulliganSelect') return;
    const cardsToBottom = sim ? getCardsToBottom(sim) : 0;

    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < cardsToBottom) {
        next.add(index);
      }
      return next;
    });
  }, [phase, sim]);

  const handleConfirmBottom = useCallback(() => {
    if (!sim) return;
    const cardsToBottom = getCardsToBottom(sim);
    if (selectedIndices.size !== cardsToBottom) return;

    const newSim = putCardsOnBottom(sim, Array.from(selectedIndices));
    setSim(newSim);
    setPhase('drawn');
    setSelectedIndices(new Set());
    doEvaluate(newSim.hand);
  }, [sim, selectedIndices, doEvaluate]);

  const handleKeep = useCallback(() => {
    if (!sim) return;
    const newSim = keepHand(sim);
    setSim(newSim);
    setPhase('kept');
    setHandHistory(prev => [...prev, {
      hand: sim.hand.map(c => c.name),
      verdict: evaluation?.verdict || 'Unknown',
      score: evaluation?.score || 0,
      mulligans: sim.mulliganCount,
    }]);
  }, [sim, evaluation]);

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

  const cardsToBottom = sim ? getCardsToBottom(sim) : 0;

  return (
    <div className="page hand-simulator">
      <div className="sim-header">
        <h1>Hand Simulator</h1>
        <span className="format-badge">{deckFormat === 'commander' ? 'Commander' : '60-Card'}</span>
      </div>

      {sim && (
        <div className="sim-stats-bar">
          <div className="sim-stat">
            <span className="sim-stat-label">Hands Drawn</span>
            <span className="sim-stat-value">{sim.stats.handsDrawn}</span>
          </div>
          <div className="sim-stat">
            <span className="sim-stat-label">Hands Kept</span>
            <span className="sim-stat-value">{sim.stats.handsKept}</span>
          </div>
          <div className="sim-stat">
            <span className="sim-stat-label">Total Mulligans</span>
            <span className="sim-stat-value">{sim.stats.totalMulligans}</span>
          </div>
          {sim.mulliganCount > 0 && phase !== 'kept' && (
            <div className="sim-stat mulligan-indicator">
              <span className="sim-stat-label">Current Mulligans</span>
              <span className="sim-stat-value">{sim.mulliganCount}</span>
            </div>
          )}
        </div>
      )}

      <div className="sim-actions">
        {(phase === 'idle' || phase === 'kept') && (
          <button className="btn-primary btn-large" onClick={handleDrawNewHand}>
            🎲 Draw New Hand
          </button>
        )}
        {phase === 'drawn' && (
          <>
            <button className="btn-keep" onClick={handleKeep}>✅ Keep</button>
            <button className="btn-mulligan" onClick={sim?.mulliganCount! > 0 ? handleStartMulliganSelect : handleMulligan}>
              🔄 Mulligan {sim?.mulliganCount! > 0 ? `(put ${cardsToBottom} back)` : ''}
            </button>
          </>
        )}
        {phase === 'mulliganSelect' && (
          <>
            <div className="mulligan-instruction">
              Select {cardsToBottom} card{cardsToBottom > 1 ? 's' : ''} to put on bottom ({selectedIndices.size}/{cardsToBottom} selected)
            </div>
            <button className="btn-primary" onClick={handleConfirmBottom} disabled={selectedIndices.size !== cardsToBottom}>
              Confirm & Draw
            </button>
            <button className="btn-secondary" onClick={() => { setPhase('drawn'); setSelectedIndices(new Set()); }}>
              Cancel
            </button>
          </>
        )}
      </div>

      {sim && sim.hand.length > 0 && (
        <div className="hand-display">
          <div className={`cards-row ${phase === 'mulliganSelect' ? 'selecting' : ''}`}>
            {sim.hand.map((card, i) => (
              <div
                key={`${card.name}-${i}`}
                className={`card-slot ${selectedIndices.has(i) ? 'selected' : ''} ${phase === 'mulliganSelect' ? 'selectable' : ''}`}
                onClick={() => toggleCardSelection(i)}
              >
                {card.image ? (
                  <img src={card.image} alt={card.name} className="card-image" draggable={false} />
                ) : (
                  <div className="card-placeholder">
                    <span className="card-placeholder-name">{card.name}</span>
                    <span className="card-placeholder-cost">{card.mana_cost}</span>
                    <span className="card-placeholder-type">{card.type_line}</span>
                  </div>
                )}
                {selectedIndices.has(i) && (
                  <div className="card-selected-overlay"><span>↓ Bottom</span></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {evaluation && phase !== 'idle' && (
        <div className={`eval-panel eval-${evaluation.verdict.toLowerCase()}`}>
          <div className="eval-header">
            <span className={`eval-verdict verdict-${evaluation.verdict.toLowerCase()}`}>{evaluation.verdict}</span>
            <span className="eval-score">Score: {evaluation.score}/100</span>
          </div>
          <div className="eval-reasons">
            {evaluation.reasons.map((reason, i) => (
              <div key={i} className="eval-reason">{reason}</div>
            ))}
          </div>
          {evaluation.turnAnalysis && (
            <div className="turn-analysis">
              <h3>Turn-by-Turn Analysis</h3>
              <div className="turns-grid">
                {evaluation.turnAnalysis.map(turn => (
                  <div key={turn.turn} className="turn-card">
                    <div className="turn-number">Turn {turn.turn}</div>
                    <div className="turn-mana">{turn.manaAvailable} mana available</div>
                    <div className="turn-plays">
                      {turn.playableCards.length > 0 ? (
                        turn.playableCards.slice(0, 3).map((name, idx) => (
                          <span key={idx} className="turn-play-tag">{name}</span>
                        ))
                      ) : (
                        <span className="no-plays">No plays</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {handHistory.length > 0 && (
        <div className="analysis-section">
          <h2>Hand History</h2>
          <div className="history-list">
            {handHistory.map((entry, i) => (
              <div key={i} className={`history-item history-${entry.verdict.toLowerCase()}`}>
                <span className="history-num">#{i + 1}</span>
                <span className={`history-verdict verdict-${entry.verdict.toLowerCase()}`}>{entry.verdict}</span>
                <span className="history-score">{entry.score}/100</span>
                {entry.mulligans > 0 && <span className="history-mulligans">{entry.mulligans}× mull</span>}
                <span className="history-cards">{entry.hand.slice(0, 4).join(', ')}{entry.hand.length > 4 ? '...' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analysis-actions">
        <button className="btn-secondary" onClick={() => navigate('/analysis')}>← Back to Analysis</button>
        <button className="btn-secondary" onClick={() => navigate('/')}>Import New Deck</button>
      </div>
    </div>
  );
}
