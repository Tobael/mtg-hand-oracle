/**
 * Hand Evaluator — scores starting hands for quality
 */

import type { CardData, HandEvaluation, EvaluationOptions, TurnAnalysis } from '../types';
import { parseManaCost } from './manaAnalysis';

const COLOR_SYMBOLS = ['W', 'U', 'B', 'R', 'G'];

export function evaluateHand(hand: CardData[], options: EvaluationOptions = {}): HandEvaluation {
  const { rampCards = new Set<string>(), format = '60-card' } = options;

  const reasons: string[] = [];
  let score = 70;

  const lands = hand.filter(c => c.type_line?.toLowerCase().includes('land'));
  const nonLands = hand.filter(c => !c.type_line?.toLowerCase().includes('land'));
  const landCount = lands.length;

  // --- Land Count Check ---
  if (landCount === 0) {
    score -= 50;
    reasons.push('🚫 No lands — unplayable hand');
  } else if (landCount === 1) {
    score -= 30;
    reasons.push('⚠️ Only 1 land — very risky, need to draw lands immediately');
  } else if (landCount === 2) {
    score -= 5;
    reasons.push('📊 2 lands — playable but depends on curve');
  } else if (landCount === 3) {
    score += 10;
    reasons.push('✅ 3 lands — solid land count');
  } else if (landCount === 4) {
    score += 5;
    reasons.push('✅ 4 lands — good land count, slightly land-heavy');
  } else if (landCount === 5) {
    score -= 15;
    reasons.push('⚠️ 5 lands — too many lands, few spells to play');
  } else if (landCount >= 6) {
    score -= 40;
    reasons.push('🚫 6+ lands — flooded hand, almost no spells');
  }

  // --- Color Match Check ---
  const { colorMatch, unmatchedColors } = checkColorMatch(lands, nonLands);
  if (!colorMatch) {
    score -= 20;
    reasons.push(`⚠️ Color mismatch — missing ${unmatchedColors.join(', ')} mana for spells in hand`);
  } else if (nonLands.length > 0 && landCount > 0) {
    score += 5;
    reasons.push('✅ Lands match spell colors');
  }

  // --- Curve Check ---
  const turnAnalysis = analyzeTurns(hand, lands, rampCards);
  const earlyPlays = turnAnalysis.filter(t => t.turn <= 3 && t.playableCards.length > 0);

  if (earlyPlays.length === 0 && nonLands.length > 0) {
    score -= 20;
    reasons.push('⚠️ No plays before turn 4 — slow start');
  } else if (earlyPlays.length >= 2) {
    score += 10;
    reasons.push('✅ Good early curve — plays available in first 3 turns');
  }

  // --- Ramp Check ---
  const rampInHand = hand.filter(c => rampCards.has(c.name));
  if (rampInHand.length > 0) {
    score += 5;
    reasons.push(`🚀 Contains ${rampInHand.length} ramp card(s) — can accelerate`);
  }

  // --- Mana Utilization ---
  const utilization = calculateManaUtilization(turnAnalysis);
  if (utilization < 0.3 && nonLands.length > 0) {
    score -= 10;
    reasons.push('⚠️ Poor mana utilization — wasted mana in early turns');
  } else if (utilization > 0.7) {
    score += 5;
    reasons.push('✅ Good mana utilization — efficient curve');
  }

  score = Math.max(0, Math.min(100, score));

  let verdict: 'Keep' | 'Risky' | 'Mulligan';
  if (score >= 65) verdict = 'Keep';
  else if (score >= 40) verdict = 'Risky';
  else verdict = 'Mulligan';

  return { verdict, score, reasons, turnAnalysis };
}

function checkColorMatch(
  lands: CardData[],
  nonLands: CardData[]
): { colorMatch: boolean; unmatchedColors: string[] } {
  const availableColors = new Set<string>();
  for (const land of lands) {
    for (const color of (land.produced_mana || [])) {
      if (COLOR_SYMBOLS.includes(color)) availableColors.add(color);
    }
    if (!land.produced_mana || land.produced_mana.length === 0) {
      for (const color of (land.color_identity || [])) {
        availableColors.add(color);
      }
    }
  }

  const neededColors = new Set<string>();
  for (const card of nonLands) {
    const { colored } = parseManaCost(card.mana_cost);
    for (const color of Object.keys(colored)) {
      neededColors.add(color);
    }
  }

  const colorNames: Record<string, string> = {
    W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green',
  };
  const unmatchedColors: string[] = [];
  for (const color of neededColors) {
    if (!availableColors.has(color)) {
      unmatchedColors.push(colorNames[color] || color);
    }
  }

  return { colorMatch: unmatchedColors.length === 0, unmatchedColors };
}

function analyzeTurns(
  hand: CardData[],
  lands: CardData[],
  rampCards: Set<string>
): TurnAnalysis[] {
  const turns: TurnAnalysis[] = [];
  const availableLands = [...lands];
  let extraManaFromRamp = 0;
  const cardsInHand = hand.filter(c => !c.type_line?.toLowerCase().includes('land'));

  for (let turn = 1; turn <= 4; turn++) {
    const landPlayed = availableLands.length >= turn;
    const manaThisTurn = Math.min(turn, availableLands.length) + extraManaFromRamp;

    const playableCards = cardsInHand.filter(c => {
      const cmc = c.cmc || 0;
      return cmc <= manaThisTurn && cmc > 0;
    });

    const rampPlays = playableCards.filter(c => rampCards.has(c.name));
    if (rampPlays.length > 0 && turn <= 3) {
      extraManaFromRamp += 1;
    }

    turns.push({
      turn,
      landPlayed,
      manaAvailable: manaThisTurn,
      playableCards: playableCards.map(c => c.name),
      manaUsed: playableCards.length > 0 ? Math.min(...playableCards.map(c => c.cmc || 0)) : 0,
    });
  }

  return turns;
}

function calculateManaUtilization(turnAnalysis: TurnAnalysis[]): number {
  let totalMana = 0;
  let totalUsed = 0;

  for (const turn of turnAnalysis) {
    totalMana += turn.manaAvailable;
    totalUsed += Math.min(turn.manaUsed, turn.manaAvailable);
  }

  return totalMana > 0 ? totalUsed / totalMana : 0;
}
