/**
 * Hand Simulator — shuffle, draw, and London mulligan
 */

import type { CardData, SimulatorState } from '../types';

function shuffle(arr: CardData[]): CardData[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createSimulator(deckCards: CardData[]): SimulatorState {
  return {
    originalDeck: [...deckCards],
    library: [],
    hand: [],
    mulliganCount: 0,
    stats: { handsDrawn: 0, handsKept: 0, totalMulligans: 0 },
  };
}

export function drawNewHand(sim: SimulatorState): SimulatorState {
  const library = shuffle(sim.originalDeck);
  const hand = library.splice(0, 7);

  return {
    ...sim,
    library,
    hand,
    mulliganCount: 0,
    stats: { ...sim.stats, handsDrawn: sim.stats.handsDrawn + 1 },
  };
}

export function mulliganDraw(sim: SimulatorState): SimulatorState {
  const library = shuffle(sim.originalDeck);
  const hand = library.splice(0, 7);

  return {
    ...sim,
    library,
    hand,
    mulliganCount: sim.mulliganCount + 1,
    stats: {
      ...sim.stats,
      handsDrawn: sim.stats.handsDrawn + 1,
      totalMulligans: sim.stats.totalMulligans + 1,
    },
  };
}

export function putCardsOnBottom(sim: SimulatorState, indices: number[]): SimulatorState {
  const sortedIndices = [...indices].sort((a, b) => b - a);
  const newHand = [...sim.hand];
  const bottomCards: CardData[] = [];

  for (const idx of sortedIndices) {
    bottomCards.push(newHand.splice(idx, 1)[0]);
  }

  return {
    ...sim,
    hand: newHand,
    library: [...sim.library, ...bottomCards],
  };
}

export function keepHand(sim: SimulatorState): SimulatorState {
  return {
    ...sim,
    stats: { ...sim.stats, handsKept: sim.stats.handsKept + 1 },
  };
}

export function getCardsToBottom(sim: SimulatorState): number {
  return sim.mulliganCount;
}
