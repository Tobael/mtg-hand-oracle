/**
 * Scryfall API Integration
 */

import type { CardData } from '../types';

const SCRYFALL_BASE = 'https://api.scryfall.com';
const BATCH_SIZE = 75;
const RATE_LIMIT_MS = 100;

const cardCache = new Map<string, CardData>();

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ScryfallCard {
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  keywords?: string[];
  image_uris?: { normal?: string; small?: string };
  card_faces?: Array<{
    mana_cost?: string;
    oracle_text?: string;
    type_line?: string;
    colors?: string[];
    image_uris?: { normal?: string; small?: string };
  }>;
  rarity?: string;
  produced_mana?: string[];
  set?: string;
  collector_number?: string;
}

interface ScryfallCollectionResponse {
  data?: ScryfallCard[];
  not_found?: Array<{ name: string }>;
}

export async function fetchCardData(cardNames: string[]): Promise<Map<string, CardData>> {
  const result = new Map<string, CardData>();
  const uncachedNames: string[] = [];

  for (const name of cardNames) {
    const cached = cardCache.get(name.toLowerCase());
    if (cached) {
      result.set(name.toLowerCase(), cached);
    } else {
      uncachedNames.push(name);
    }
  }

  if (uncachedNames.length === 0) return result;

  const batches: string[][] = [];
  for (let i = 0; i < uncachedNames.length; i += BATCH_SIZE) {
    batches.push(uncachedNames.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await delay(RATE_LIMIT_MS);

    const identifiers = batches[i].map(name => ({ name }));

    try {
      const response = await fetch(`${SCRYFALL_BASE}/cards/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers }),
      });

      if (!response.ok) {
        console.error(`Scryfall API error: ${response.status}`);
        continue;
      }

      const data: ScryfallCollectionResponse = await response.json();

      for (const card of data.data || []) {
        const processed = processCard(card);
        const key = processed.name.toLowerCase();
        cardCache.set(key, processed);
        result.set(key, processed);

        if (key.includes(' // ')) {
          const frontName = key.split(' // ')[0];
          cardCache.set(frontName, processed);
          result.set(frontName, processed);
        }
      }

      if (data.not_found?.length) {
        console.warn('Cards not found on Scryfall:', data.not_found.map(c => c.name));
      }
    } catch (err) {
      console.error('Failed to fetch from Scryfall:', err);
    }
  }

  return result;
}

function processCard(card: ScryfallCard): CardData {
  const face = card.card_faces?.[0] || card;
  const imageUri = card.image_uris?.normal
    || card.card_faces?.[0]?.image_uris?.normal
    || null;
  const imageSmall = card.image_uris?.small
    || card.card_faces?.[0]?.image_uris?.small
    || null;

  return {
    name: card.name,
    mana_cost: face.mana_cost || '',
    cmc: card.cmc ?? 0,
    type_line: card.type_line || face.type_line || '',
    oracle_text: face.oracle_text || '',
    colors: card.colors || face.colors || [],
    color_identity: card.color_identity || [],
    keywords: card.keywords || [],
    image: imageUri,
    imageSmall: imageSmall,
    rarity: card.rarity || 'common',
    produced_mana: card.produced_mana || [],
    set: card.set || '',
    collector_number: card.collector_number || '',
  };
}

export function clearCache(): void {
  cardCache.clear();
}

export async function fetchCardPrintings(cardName: string): Promise<CardData[]> {
  try {
    const encodedName = encodeURIComponent(`!"${cardName}"`);
    const response = await fetch(`${SCRYFALL_BASE}/cards/search?q=${encodedName}&unique=prints`);

    if (!response.ok) {
      console.error(`Scryfall API error fetching printings for ${cardName}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.data) return [];

    return data.data.map((c: ScryfallCard) => processCard(c));
  } catch (err) {
    console.error('Failed to fetch printings from Scryfall:', err);
    return [];
  }
}
