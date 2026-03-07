import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { parseDeck, getUniqueCardNames, expandDeck } from '../services/deckParser';
import { fetchCardData } from '../services/scryfallApi';
import { detectRampCards } from '../utils/rampDetector';
import type { ParsedDeck, CardData, RampData, DeckFormat } from '../types';

interface DeckContextValue {
  deckText: string;
  parsedDeck: ParsedDeck | null;
  cardDataMap: Map<string, CardData> | null;
  expandedDeck: CardData[];
  rampData: RampData | null;
  deckFormat: DeckFormat;
  loading: boolean;
  error: string | null;
  importDeck: (text: string) => Promise<boolean>;
  resetDeck: () => void;
  setDeckFormat: (format: DeckFormat) => void;
}

const DeckContext = createContext<DeckContextValue | null>(null);

export function DeckProvider({ children }: { children: ReactNode }) {
  const [deckText, setDeckText] = useState('');
  const [parsedDeck, setParsedDeck] = useState<ParsedDeck | null>(null);
  const [cardDataMap, setCardDataMap] = useState<Map<string, CardData> | null>(null);
  const [expandedDeck, setExpandedDeck] = useState<CardData[]>([]);
  const [rampData, setRampData] = useState<RampData | null>(null);
  const [deckFormat, setDeckFormat] = useState<DeckFormat>('60-card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importDeck = useCallback(async (text: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const deck = parseDeck(text);
      setParsedDeck(deck);
      setDeckFormat(deck.format);

      const totalCards = deck.mainboard.reduce((s, c) => s + c.quantity, 0)
        + deck.commander.reduce((s, c) => s + c.quantity, 0);

      if (totalCards === 0) {
        throw new Error('No cards found in the decklist. Please check the format.');
      }

      const uniqueNames = getUniqueCardNames(deck);
      const dataMap = await fetchCardData(uniqueNames);
      setCardDataMap(dataMap);

      const expanded = expandDeck(deck, Object.fromEntries(dataMap));
      setExpandedDeck(expanded);

      const uniqueCards = Array.from(dataMap.values());
      const ramp = detectRampCards(uniqueCards);
      setRampData(ramp);

      setDeckText(text);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import deck');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetDeck = useCallback(() => {
    setDeckText('');
    setParsedDeck(null);
    setCardDataMap(null);
    setExpandedDeck([]);
    setRampData(null);
    setError(null);
  }, []);

  return (
    <DeckContext.Provider value={{
      deckText, parsedDeck, cardDataMap, expandedDeck,
      rampData, deckFormat, loading, error,
      importDeck, resetDeck, setDeckFormat,
    }}>
      {children}
    </DeckContext.Provider>
  );
}

export function useDeck(): DeckContextValue {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error('useDeck must be used within DeckProvider');
  return ctx;
}
