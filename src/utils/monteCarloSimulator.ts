/**
 * Monte Carlo Simulation Engine
 * Runs N automated game simulations to produce statistical playability scores.
 * Simulates opening hands, auto-mulligans, and subsequent turns.
 */

import type {
  CardData, MonteCarloConfig, MonteCarloResults,
  TurnStats, ScoreBucket, HandEvaluation, DeckFormat,
} from '../types';
import { evaluateHand } from './handEvaluator';
import { parseManaCost } from './manaAnalysis';

function shuffle(arr: CardData[]): CardData[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SingleSimResult {
  openingScore: number;
  verdict: string;
  mulligansTaken: number;
  turnData: Array<{
    turn: number;
    manaAvailable: number;
    manaSpent: number;
    cardsPlayed: number;
    cardsStuck: number;
  }>;
}

function simulateOnce(
  deck: CardData[],
  rampCardNames: Set<string>,
  turnsToSimulate: number,
  format: DeckFormat,
): SingleSimResult {
  const MAX_MULLIGANS = 2;
  let mulligansTaken = 0;
  let hand: CardData[] = [];
  let library: CardData[] = [];
  let bestEval: HandEvaluation | null = null;

  // Opening hand + mulligan decisions
  for (let attempt = 0; attempt <= MAX_MULLIGANS; attempt++) {
    library = shuffle(deck);
    hand = library.splice(0, 7);

    const evaluation = evaluateHand(hand, { rampCards: rampCardNames, format });
    bestEval = evaluation;

    if (evaluation.verdict !== 'Mulligan' || attempt === MAX_MULLIGANS) {
      // Keep this hand (auto-bottom worst cards for mulligans)
      if (attempt > 0) {
        // Put back the worst cards (highest CMC non-lands, or excess lands)
        const toBottom = attempt;
        const sorted = [...hand].sort((a, b) => {
          const aIsLand = a.type_line?.toLowerCase().includes('land') ? 1 : 0;
          const bIsLand = b.type_line?.toLowerCase().includes('land') ? 1 : 0;
          // Put non-ramp expensive cards on bottom first
          if (aIsLand !== bIsLand) return (b.cmc || 0) - (a.cmc || 0);
          return (b.cmc || 0) - (a.cmc || 0);
        });
        const bottomCards = sorted.splice(0, toBottom);
        hand = sorted;
        library = [...library, ...bottomCards];
      }
      mulligansTaken = attempt;
      break;
    }
    mulligansTaken = attempt + 1;
  }

  // Simulate turns
  const turnData: SingleSimResult['turnData'] = [];
  const landsInPlay: CardData[] = [];
  const nonLandsInHand: CardData[] = hand.filter(c => !c.type_line?.toLowerCase().includes('land'));
  const landsInHand: CardData[] = hand.filter(c => c.type_line?.toLowerCase().includes('land'));
  let extraMana = 0;

  for (let turn = 1; turn <= turnsToSimulate; turn++) {
    // Draw a card (except turn 1 on the play — but we simplify and always draw)
    if (turn > 1 && library.length > 0) {
      const drawn = library.shift()!;
      if (drawn.type_line?.toLowerCase().includes('land')) {
        landsInHand.push(drawn);
      } else {
        nonLandsInHand.push(drawn);
      }
    }

    // Play a land if available
    if (landsInHand.length > 0) {
      const landToPlay = landsInHand.shift()!;
      landsInPlay.push(landToPlay);
    }

    // Calculate available mana
    const manaAvailable = landsInPlay.length + extraMana;

    // Try to play cards greedily (cheapest first to maximize plays)
    const playable = nonLandsInHand
      .filter(c => (c.cmc || 0) <= manaAvailable)
      .sort((a, b) => (a.cmc || 0) - (b.cmc || 0));

    let manaSpent = 0;
    let cardsPlayed = 0;
    const playedIndices: number[] = [];

    for (const card of playable) {
      const cost = card.cmc || 0;
      if (manaSpent + cost <= manaAvailable) {
        manaSpent += cost;
        cardsPlayed++;
        const idx = nonLandsInHand.indexOf(card);
        if (idx !== -1) playedIndices.push(idx);

        // If it's a ramp card, add extra mana for future turns
        if (rampCardNames.has(card.name)) {
          extraMana += 1;
        }
      }
    }

    // Remove played cards from hand (reverse order to preserve indices)
    playedIndices.sort((a, b) => b - a);
    for (const idx of playedIndices) {
      nonLandsInHand.splice(idx, 1);
    }

    const cardsStuck = nonLandsInHand.length;

    turnData.push({ turn, manaAvailable, manaSpent, cardsPlayed, cardsStuck });
  }

  return {
    openingScore: bestEval?.score ?? 0,
    verdict: bestEval?.verdict ?? 'Unknown',
    mulligansTaken,
    turnData,
  };
}

export function runMonteCarloSimulation(
  deck: CardData[],
  rampCardNames: Set<string>,
  config: MonteCarloConfig,
  format: DeckFormat,
  onProgress?: (completed: number, total: number) => void,
): MonteCarloResults {
  const { simulations, turnsToSimulate } = config;
  const results: SingleSimResult[] = [];

  for (let i = 0; i < simulations; i++) {
    results.push(simulateOnce(deck, rampCardNames, turnsToSimulate, format));
    if (onProgress && (i % 50 === 0 || i === simulations - 1)) {
      onProgress(i + 1, simulations);
    }
  }

  // Aggregate statistics
  const scores = results.map(r => r.openingScore);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const keepCount = results.filter(r => r.verdict === 'Keep').length;
  const brickCount = results.filter(r => r.verdict === 'Mulligan').length;
  const riskyCount = results.filter(r => r.verdict === 'Risky').length;
  // Playable = anything that isn't a brick (kept or risky but workable)
  const playableCount = results.filter(r => r.openingScore >= 65).length;

  const keepRate = keepCount / simulations;
  const brickRate = brickCount / simulations;
  const playableRate = playableCount / simulations;
  const riskyRate = riskyCount / simulations;

  const averageMulligans = results.reduce((s, r) => s + r.mulligansTaken, 0) / simulations;

  // Score distribution histogram (buckets of 10)
  const scoreDistribution: ScoreBucket[] = [];
  for (let bucket = 0; bucket < 100; bucket += 10) {
    const range = `${bucket}-${bucket + 9}`;
    const count = scores.filter(s => s >= bucket && s < bucket + 10).length;
    scoreDistribution.push({ range, count });
  }
  // Handle perfect 100 scores
  const perfect = scores.filter(s => s === 100).length;
  if (perfect > 0 && scoreDistribution.length > 0) {
    scoreDistribution[scoreDistribution.length - 1].count += perfect;
  }

  // Turn-by-turn averages
  const turnByTurnStats: TurnStats[] = [];
  for (let t = 0; t < turnsToSimulate; t++) {
    const turnResults = results.map(r => r.turnData[t]).filter(Boolean);
    if (turnResults.length === 0) continue;

    const avgManaAvailable = turnResults.reduce((s, td) => s + td.manaAvailable, 0) / turnResults.length;
    const avgManaUsed = turnResults.reduce((s, td) => s + td.manaSpent, 0) / turnResults.length;
    const avgCardsPlayable = turnResults.reduce((s, td) => s + td.cardsPlayed, 0) / turnResults.length;
    const avgCardsStuck = turnResults.reduce((s, td) => s + td.cardsStuck, 0) / turnResults.length;

    turnByTurnStats.push({
      turn: t + 1,
      avgManaAvailable: Math.round(avgManaAvailable * 100) / 100,
      avgManaUsed: Math.round(avgManaUsed * 100) / 100,
      avgCardsPlayable: Math.round(avgCardsPlayable * 100) / 100,
      avgCardsStuck: Math.round(avgCardsStuck * 100) / 100,
      manaUtilization: avgManaAvailable > 0
        ? Math.round((avgManaUsed / avgManaAvailable) * 100) / 100
        : 0,
    });
  }

  return {
    totalSimulations: simulations,
    keepRate: Math.round(keepRate * 1000) / 10,
    brickRate: Math.round(brickRate * 1000) / 10,
    playableRate: Math.round(playableRate * 1000) / 10,
    riskyRate: Math.round(riskyRate * 1000) / 10,
    averageScore: Math.round(averageScore * 10) / 10,
    averageMulligans: Math.round(averageMulligans * 100) / 100,
    scoreDistribution,
    turnByTurnStats,
  };
}
