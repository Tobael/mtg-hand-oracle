/**
 * Deck Parser — parses text-pasted MTG decklists
 */

import type { ParsedDeck, DeckEntry, DeckFormat, CardData } from '../types';

const SECTION_PATTERNS = [
  /^\/\/\s*(sideboard|companion|maybeboard)/i,
  /^(sideboard|companion|maybeboard)\s*[:]/i,
];

const COMMANDER_SECTION = [
  /^\/\/\s*commander/i,
  /^commander\s*[:]/i,
];

const CARD_LINE_REGEX = /^\s*(\d+)\s*[xX]?\s+(.+?)\s*$/;

export function parseDeck(text: string): ParsedDeck {
  const lines = text.split('\n');
  const mainboard: DeckEntry[] = [];
  const commander: DeckEntry[] = [];
  let currentSection = 'main';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (SECTION_PATTERNS.some(p => p.test(trimmed))) {
      currentSection = 'sideboard';
      continue;
    }
    if (COMMANDER_SECTION.some(p => p.test(trimmed))) {
      currentSection = 'commander';
      continue;
    }
    if (/^\/\//.test(trimmed)) {
      if (!/sideboard|companion|maybeboard/i.test(trimmed)) {
        currentSection = 'main';
      }
      continue;
    }

    const match = trimmed.match(CARD_LINE_REGEX);
    if (!match) continue;

    const quantity = parseInt(match[1], 10);
    const name = match[2].trim();

    if (currentSection === 'main') {
      mainboard.push({ quantity, name });
    } else if (currentSection === 'commander') {
      commander.push({ quantity, name });
    }
  }

  const totalCards = mainboard.reduce((sum, c) => sum + c.quantity, 0)
    + commander.reduce((sum, c) => sum + c.quantity, 0);

  const format: DeckFormat = totalCards >= 90 ? 'commander' : '60-card';

  return { mainboard, commander, format };
}

export function getUniqueCardNames(deck: ParsedDeck): string[] {
  const names = new Set<string>();
  for (const card of [...deck.mainboard, ...deck.commander]) {
    names.add(card.name);
  }
  return Array.from(names);
}

export function expandDeck(deck: ParsedDeck, cardDataMap: Record<string, CardData>): CardData[] {
  const cards: CardData[] = [];
  for (const entry of [...deck.mainboard, ...deck.commander]) {
    const data = cardDataMap[entry.name.toLowerCase()];
    if (!data) continue;
    for (let i = 0; i < entry.quantity; i++) {
      cards.push({ ...data });
    }
  }
  return cards;
}
