import React, { useState, useMemo } from 'react';
import { useDeck } from '../context/DeckContext';
import type { CardData } from '../types';

export default function CardTags() {
    const { activeDeckId, savedDecks, parsedDeck, cardDataMap, manageCardTags } = useDeck();

    const [searchTerm, setSearchTerm] = useState('');
    const [newTagInput, setNewTagInput] = useState('');
    const [selectedCardNames, setSelectedCardNames] = useState<Set<string>>(new Set());

    const activeDeck = savedDecks.find(d => d.id === activeDeckId);
    const customTags = activeDeck?.customTags || {};

    const uniqueCards = useMemo(() => {
        if (!parsedDeck || !cardDataMap) return [];
        const combined = [...parsedDeck.mainboard, ...parsedDeck.commander];
        const unique = new Map<string, CardData>();

        for (const entry of combined) {
            const data = cardDataMap.get(entry.name.toLowerCase());
            if (data && !unique.has(data.name)) {
                unique.set(data.name, data);
            }
        }
        return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [parsedDeck, cardDataMap]);

    // Compute all unique tags across the deck
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        Object.values(customTags).forEach(cardTags => {
            cardTags.forEach(t => tags.add(t));
        });
        return Array.from(tags).sort();
    }, [customTags]);

    const tagDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        Object.values(customTags).forEach(cardTags => {
            cardTags.forEach(t => {
                dist[t] = (dist[t] || 0) + 1;
            });
        });
        return Object.entries(dist).sort((a, b) => b[1] - a[1]);
    }, [customTags]);

    const handleAddTagToSelected = (e: React.FormEvent) => {
        e.preventDefault();
        const tag = newTagInput.trim();
        if (!tag || selectedCardNames.size === 0) return;

        selectedCardNames.forEach(name => {
            manageCardTags(name, 'add', tag);
        });

        setNewTagInput('');
        setSelectedCardNames(new Set());
    };

    const toggleCardSelection = (name: string) => {
        setSelectedCardNames(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const selectAllCards = () => {
        setSelectedCardNames(new Set(uniqueCards.map(c => c.name)));
    };

    const clearSelection = () => {
        setSelectedCardNames(new Set());
    };

    const filteredCards = uniqueCards.filter(card => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const matchesName = card.name.toLowerCase().includes(term);
        const tags = customTags[card.name] || [];
        const matchesTag = tags.some(t => t.toLowerCase().includes(term));
        return matchesName || matchesTag;
    });

    if (!activeDeckId || !parsedDeck) {
        return (
            <div className="page custom-tags">
                <div className="empty-state">
                    <h2>No deck imported</h2>
                    <p>Go back and import a deck first.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page custom-tags">
            <div className="analysis-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                <h1>Custom Tags Dashboard</h1>
                <p className="subtitle">Organize your cards into custom categories like "Ramp", "Removal", or "Win-Condition".</p>
            </div>

            <div className="tags-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(350px, 2.5fr)', gap: '2rem' }}>
                {/* Left Sidebar: Tag Stats & Bulk Actions */}
                <div className="tags-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div className="import-container" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontFamily: 'Cinzel, serif', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Bulk Tagging</h3>

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Select cards on the right to apply tags in bulk.
                        </p>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                            <button className="format-btn" onClick={selectAllCards}>Select All</button>
                            <button className="format-btn" onClick={clearSelection}>Clear ({selectedCardNames.size})</button>
                        </div>

                        <form onSubmit={handleAddTagToSelected} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={newTagInput}
                                onChange={e => setNewTagInput(e.target.value)}
                                placeholder="New Tag..."
                                className="deck-name-input"
                                style={{ padding: '0.6rem 1rem' }}
                                list="existing-tags"
                            />
                            <datalist id="existing-tags">
                                {allTags.map(tag => <option key={tag} value={tag} />)}
                            </datalist>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={!newTagInput.trim() || selectedCardNames.size === 0}
                                style={{ padding: '0.6rem 1rem' }}
                            >
                                Apply
                            </button>
                        </form>
                    </div>

                    <div className="import-container" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontFamily: 'Cinzel, serif', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Tag Distribution</h3>

                        {tagDistribution.length === 0 ? (
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No tags applied yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {tagDistribution.map(([tag, count]) => (
                                    <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                                        <span style={{ fontWeight: 500 }}>{tag}</span>
                                        <span className="util-badge good">{count} cards</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Area: Card Grid */}
                <div className="tags-main">
                    <div style={{ marginBottom: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Filter cards by name or applied tag..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="deck-name-input"
                        />
                    </div>

                    <div className="deck-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                        {filteredCards.map(card => {
                            const isSelected = selectedCardNames.has(card.name);
                            const tags = customTags[card.name] || [];

                            return (
                                <div key={card.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div
                                        className={`deck-card-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleCardSelection(card.name)}
                                        style={{
                                            borderWidth: isSelected ? '3px' : '1px',
                                            borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'
                                        }}
                                    >
                                        {card.imageSmall ? (
                                            <img src={card.imageSmall} alt={card.name} className="card-image" loading="lazy" />
                                        ) : (
                                            <div className="card-placeholder">{card.name}</div>
                                        )}
                                        {isSelected && (
                                            <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--accent-primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                ✓
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', minHeight: '24px' }}>
                                        {tags.map(tag => (
                                            <span
                                                key={tag}
                                                style={{
                                                    fontSize: '0.7rem',
                                                    background: 'rgba(155, 109, 255, 0.15)',
                                                    color: 'var(--accent-primary)',
                                                    border: '1px solid var(--border-accent)',
                                                    padding: '0.15rem 0.4rem',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem'
                                                }}
                                            >
                                                {tag}
                                                <button
                                                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.7 }}
                                                    onClick={(e) => { e.stopPropagation(); manageCardTags(card.name, 'remove', tag); }}
                                                >×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
