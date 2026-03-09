import { useState, useEffect } from 'react';
import { useDeck } from '../context/DeckContext';
import type { CardData } from '../types';
import { fetchCardData } from '../services/scryfallApi'; // Need a dedicated fetch or use search

// We will fetch staples by color identity, excluding cards already in deck
export default function Recommendations() {
    const { expandedDeck, deckFormat, parsedDeck } = useDeck();

    const [recommendations, setRecommendations] = useState<CardData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!parsedDeck || expandedDeck.length === 0) return;

        let mounted = true;
        const fetchRecs = async () => {
            setLoading(true);
            setError(null);

            try {
                // Determine color identity
                // If commander, use commander's CI
                // If 60-card, union of all CI
                const ciSet = new Set<string>();

                if (deckFormat === 'commander' && parsedDeck.commander.length > 0) {
                    const cmdName = parsedDeck.commander[0].name.toLowerCase();
                    const cmdData = expandedDeck.find(c => c.name.toLowerCase() === cmdName);
                    if (cmdData && cmdData.color_identity) {
                        cmdData.color_identity.forEach(c => ciSet.add(c));
                    }
                } else {
                    expandedDeck.forEach(card => {
                        if (card.color_identity) {
                            card.color_identity.forEach(c => ciSet.add(c));
                        }
                    });
                }

                const ciString = ciSet.size > 0 ? Array.from(ciSet).join('') : 'c'; // 'c' for colorless if empty

                // Build exclude string (so we don't recommend cards already in deck)
                // Scryfall search max length is 1000 chars, so we can't exclude EVERYTHING by name if deck is huge
                // But we can exclude the top commonly played cards if they are in the deck
                // Better approach: just fetch top staples, then filter locally

                // Query: format staples
                const formatStr = deckFormat === 'commander' ? 'f:commander' : 'f:modern'; // or pioneer etc

                // Scryfall has an 'is:staple' or we can sort by edhrec rank
                const query = encodeURIComponent(`${formatStr} id<=${ciString} -t:basic`);

                const res = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=edhrec&dir=asc`);
                if (!res.ok) throw new Error('Failed to fetch recommendations');

                const data = await res.json();
                const cards = data.data || [];

                // Filter out cards already in deck
                const deckNames = new Set(expandedDeck.map(c => c.name.toLowerCase()));

                const recs: CardData[] = [];
                for (const c of cards) {
                    if (recs.length >= 12) break; // Get top 12

                    if (!deckNames.has(c.name.toLowerCase())) {
                        const imageUri = c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.normal || null;
                        const imageSmall = c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small || null;

                        recs.push({
                            name: c.name,
                            mana_cost: c.mana_cost || c.card_faces?.[0]?.mana_cost || '',
                            cmc: c.cmc ?? 0,
                            type_line: c.type_line || c.card_faces?.[0]?.type_line || '',
                            oracle_text: c.oracle_text || c.card_faces?.[0]?.oracle_text || '',
                            colors: c.colors || c.card_faces?.[0]?.colors || [],
                            color_identity: c.color_identity || [],
                            keywords: c.keywords || [],
                            image: imageUri,
                            imageSmall: imageSmall,
                            rarity: c.rarity || 'common',
                            produced_mana: c.produced_mana || [],
                            set: c.set || '',
                            collector_number: c.collector_number || ''
                        });
                    }
                }

                if (mounted) {
                    setRecommendations(recs);
                    setLoading(false);
                }

            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed');
                    setLoading(false);
                }
            }
        };

        fetchRecs();
        return () => { mounted = false; };
    }, [expandedDeck, parsedDeck, deckFormat]);

    if (loading) {
        return (
            <div className="analysis-section">
                <h2>EDHREC / Staple Recommendations</h2>
                <div className="loading-state" style={{ minHeight: '200px' }}>
                    <span className="spinner" />
                    <p>Finding synergies and staples...</p>
                </div>
            </div>
        );
    }

    if (error || recommendations.length === 0) {
        return null;
    }

    return (
        <div className="analysis-section">
            <h2>Recommendations & Staples</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Top played cards in this format that match your color identity, which are not currently in your deck.
            </p>

            <div className="deck-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {recommendations.map(card => (
                    <div key={card.name} className="deck-card-item">
                        {card.image ? (
                            <img src={card.image} alt={card.name} className="card-image" loading="lazy" />
                        ) : (
                            <div className="card-placeholder">{card.name}</div>
                        )}
                        <div className="card-name-overlay">{card.name}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
