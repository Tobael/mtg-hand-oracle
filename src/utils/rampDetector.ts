/**
 * Ramp Detection — identifies mana ramp cards using Scryfall card data
 */

import type { CardData, RampData } from '../types';

export function detectRampCards(cards: CardData[]): RampData {
  const manaDorks: CardData[] = [];
  const manaRocks: CardData[] = [];
  const landRamp: CardData[] = [];
  const costReducers: CardData[] = [];
  const rituals: CardData[] = [];

  for (const card of cards) {
    const type = (card.type_line || '').toLowerCase();
    const text = (card.oracle_text || '').toLowerCase();

    if (type.includes('land') && !type.includes('creature')) continue;

    if (type.includes('creature') && isManaProduce(text)) {
      manaDorks.push(card);
      continue;
    }

    if (type.includes('artifact') && isManaProduce(text)) {
      manaRocks.push(card);
      continue;
    }

    if (isLandRamp(text)) {
      landRamp.push(card);
      continue;
    }

    if (isCostReducer(text)) {
      costReducers.push(card);
      continue;
    }

    if (isRitual(text, type)) {
      rituals.push(card);
      continue;
    }
  }

  return { manaDorks, manaRocks, landRamp, costReducers, rituals };
}

function isManaProduce(text: string): boolean {
  return (
    /add\s+\{/.test(text) ||
    /adds?\s+(one|two|three)\s+mana/i.test(text) ||
    /add\s+one\s+mana/i.test(text) ||
    /\{t\}:\s*add\s/i.test(text)
  );
}

function isLandRamp(text: string): boolean {
  return (
    /search your library for .*(land|forest|island|mountain|plains|swamp)/i.test(text) ||
    /put .*(land|forest|island|mountain|plains|swamp).* onto the battlefield/i.test(text) ||
    /additional land/i.test(text)
  );
}

function isCostReducer(text: string): boolean {
  return (
    /spells? (you cast )?cost.* less/i.test(text) ||
    /reduce.*cost/i.test(text) ||
    /affinity/i.test(text)
  );
}

function isRitual(text: string, type: string): boolean {
  if (type.includes('creature') || type.includes('artifact') || type.includes('enchantment')) {
    return false;
  }
  return /add\s+\{/.test(text) || /adds?\s+(one|two|three)\s+mana/i.test(text);
}

export function getRampCount(rampData: RampData): number {
  return (
    rampData.manaDorks.length +
    rampData.manaRocks.length +
    rampData.landRamp.length +
    rampData.costReducers.length +
    rampData.rituals.length
  );
}
