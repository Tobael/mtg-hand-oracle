import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { parseDeck, getUniqueCardNames, expandDeck } from '../services/deckParser';
import { fetchCardData } from '../services/scryfallApi';
import { detectRampCards } from '../utils/rampDetector';
import type { ParsedDeck, CardData, RampData, DeckFormat, SavedDeck } from '../types';

interface DeckContextValue {
  deckText: string;
  parsedDeck: ParsedDeck | null;
  cardDataMap: Map<string, CardData> | null;
  expandedDeck: CardData[];
  rampData: RampData | null;
  deckFormat: DeckFormat;
  loading: boolean;
  error: string | null;
  importDeck: (text: string, deckName: string) => Promise<boolean>;
  resetDeck: () => void;
  setDeckFormat: (format: DeckFormat) => void;
  // New Deck Toolbox features
  activeDeckId: string | null;
  savedDecks: SavedDeck[];
  loadDeck: (id: string) => Promise<boolean>;
  deleteDeck: (id: string) => void;
  updateActiveDeckText: (newText: string) => void;
  manageCardTags: (cardName: string, action: 'add' | 'remove', tag: string) => void;
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
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>(() => {
    try {
      const stored = localStorage.getItem('mtg_saved_decks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mtg_saved_decks', JSON.stringify(savedDecks));
  }, [savedDecks]);

  const importDeck = useCallback(async (text: string, deckName: string): Promise<boolean> => {
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

      const newId = crypto.randomUUID();
      const newDeck: SavedDeck = {
        id: newId,
        name: deckName || deck.commander[0]?.name || 'Unnamed Deck',
        date: new Date().toISOString(),
        text: text,
        format: deck.format,
      };
      setSavedDecks(prev => [newDeck, ...prev]);
      setActiveDeckId(newId);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import deck');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeck = useCallback(async (id: string): Promise<boolean> => {
    const deckToLoad = savedDecks.find(d => d.id === id);
    if (!deckToLoad) return false;

    setLoading(true);
    setError(null);

    try {
      const deck = parseDeck(deckToLoad.text);
      setParsedDeck(deck);
      setDeckFormat(deck.format);

      const uniqueNames = getUniqueCardNames(deck);
      const dataMap = await fetchCardData(uniqueNames);
      setCardDataMap(dataMap);

      const expanded = expandDeck(deck, Object.fromEntries(dataMap));
      setExpandedDeck(expanded);

      const uniqueCards = Array.from(dataMap.values());
      const ramp = detectRampCards(uniqueCards);
      setRampData(ramp);

      setDeckText(deckToLoad.text);
      setActiveDeckId(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deck');
      return false;
    } finally {
      setLoading(false);
    }
  }, [savedDecks]);

  const deleteDeck = useCallback((id: string) => {
    setSavedDecks(prev => prev.filter(d => d.id !== id));
    if (activeDeckId === id) {
      setActiveDeckId(null);
      resetDeck();
    }
  }, [activeDeckId]);

  const updateActiveDeckText = useCallback((newText: string) => {
    if (!activeDeckId) return;
    setDeckText(newText);
    setSavedDecks(prev => prev.map(d =>
      d.id === activeDeckId ? { ...d, text: newText } : d
    ));
  }, [activeDeckId]);

  const manageCardTags = useCallback((cardName: string, action: 'add' | 'remove', tag: string) => {
    if (!activeDeckId) return;
    setSavedDecks(prev => prev.map(deck => {
      if (deck.id !== activeDeckId) return deck;

      const newTags = { ...(deck.customTags || {}) };
      const cardTags = new Set(newTags[cardName] || []);

      if (action === 'add') {
        cardTags.add(tag);
      } else {
        cardTags.delete(tag);
      }

      if (cardTags.size === 0) {
        delete newTags[cardName];
      } else {
        newTags[cardName] = Array.from(cardTags);
      }

      return { ...deck, customTags: newTags };
    }));
  }, [activeDeckId]);

  const resetDeck = useCallback(() => {
    setDeckText('');
    setParsedDeck(null);
    setCardDataMap(null);
    setExpandedDeck([]);
    setRampData(null);
    setError(null);
    setActiveDeckId(null);
  }, []);

  return (
    <DeckContext.Provider value={{
      deckText, parsedDeck, cardDataMap, expandedDeck,
      rampData, deckFormat, loading, error,
      importDeck, resetDeck, setDeckFormat,
      activeDeckId, savedDecks, loadDeck, deleteDeck, updateActiveDeckText, manageCardTags
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
