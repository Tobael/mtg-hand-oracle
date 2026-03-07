/**
 * Mana Curve & Color Analysis utilities
 */

import type {
  CardData, ManaCostBreakdown, ManaCurveEntry,
  ColorDistEntry, ColorRequirement, DeckStats,
} from '../types';

const MANA_SYMBOL_REGEX = /\{([^}]+)\}/g;
const COLOR_SYMBOLS = ['W', 'U', 'B', 'R', 'G'];

export function parseManaCost(manaCost: string): ManaCostBreakdown {
  if (!manaCost) return { generic: 0, colored: {}, total: 0 };

  const colored: Record<string, number> = {};
  let generic = 0;
  let total = 0;

  const matches = manaCost.matchAll(MANA_SYMBOL_REGEX);
  for (const match of matches) {
    const symbol = match[1];
    if (COLOR_SYMBOLS.includes(symbol)) {
      colored[symbol] = (colored[symbol] || 0) + 1;
      total += 1;
    } else if (/^\d+$/.test(symbol)) {
      generic += parseInt(symbol, 10);
      total += parseInt(symbol, 10);
    } else if (symbol === 'X') {
      // X costs don't count
    } else if (symbol.includes('/')) {
      total += 1;
      const parts = symbol.split('/');
      for (const part of parts) {
        if (COLOR_SYMBOLS.includes(part)) {
          colored[part] = (colored[part] || 0) + 0.5;
        }
      }
    }
  }

  return { generic, colored, total };
}

export function buildManaCurve(cards: CardData[]): ManaCurveEntry[] {
  const curve: Record<string, number> = {};
  for (const card of cards) {
    if (card.type_line?.toLowerCase().includes('land')) continue;
    const cmc = Math.floor(card.cmc || 0);
    const key = cmc >= 7 ? '7+' : String(cmc);
    curve[key] = (curve[key] || 0) + 1;
  }

  const labels = ['0', '1', '2', '3', '4', '5', '6', '7+'];
  return labels.map(label => ({ cmc: label, count: curve[label] || 0 }));
}

export function analyzeColorDistribution(cards: CardData[]): ColorDistEntry[] {
  const colorMap: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  const colorLabels: Record<string, string> = {
    W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless',
  };

  for (const card of cards) {
    if (card.type_line?.toLowerCase().includes('land')) continue;
    const { colored } = parseManaCost(card.mana_cost);
    const hasColor = Object.keys(colored).length > 0;

    for (const [color, count] of Object.entries(colored)) {
      colorMap[color] = (colorMap[color] || 0) + Math.ceil(count);
    }

    if (!hasColor && card.mana_cost) {
      colorMap.C += 1;
    }
  }

  return Object.entries(colorMap)
    .filter(([, count]) => count > 0)
    .map(([color, count]) => ({
      color,
      label: colorLabels[color],
      count,
    }));
}

export function analyzeColorRequirements(cards: CardData[]): Record<string, ColorRequirement> {
  const requirements: Record<string, ColorRequirement> = {};

  for (const card of cards) {
    if (card.type_line?.toLowerCase().includes('land')) continue;
    const { colored } = parseManaCost(card.mana_cost);

    for (const [color, count] of Object.entries(colored)) {
      const pips = Math.ceil(count);
      if (!requirements[color]) {
        requirements[color] = { maxPips: 0, cardCount: 0, totalPips: 0 };
      }
      requirements[color].maxPips = Math.max(requirements[color].maxPips, pips);
      requirements[color].cardCount += 1;
      requirements[color].totalPips += pips;
    }
  }

  return requirements;
}

export function getDeckStats(cards: CardData[]): DeckStats {
  const lands = cards.filter(c => c.type_line?.toLowerCase().includes('land'));
  const creatures = cards.filter(c => c.type_line?.toLowerCase().includes('creature'));
  const nonLandNonCreature = cards.filter(c =>
    !c.type_line?.toLowerCase().includes('land') &&
    !c.type_line?.toLowerCase().includes('creature')
  );
  const nonLands = cards.filter(c => !c.type_line?.toLowerCase().includes('land'));

  const avgCmc = nonLands.length > 0
    ? nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0) / nonLands.length
    : 0;

  return {
    totalCards: cards.length,
    lands: lands.length,
    creatures: creatures.length,
    spells: nonLandNonCreature.length,
    avgCmc: Math.round(avgCmc * 100) / 100,
  };
}

export function analyzeLandColors(cards: CardData[]): Record<string, number> {
  const lands = cards.filter(c => c.type_line?.toLowerCase().includes('land'));
  const production: Record<string, number> = {};

  for (const land of lands) {
    const produced = land.produced_mana || [];
    for (const color of produced) {
      if (COLOR_SYMBOLS.includes(color)) {
        production[color] = (production[color] || 0) + 1;
      }
    }
  }

  return production;
}
