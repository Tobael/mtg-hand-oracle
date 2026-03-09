import React, { useState, useEffect, useMemo } from 'react';
import { useDeck } from '../context/DeckContext';
import { fetchCardData, fetchCardPrintings } from '../services/scryfallApi';
import type { CardData } from '../types';

interface SelectedArt {
    name: string;
    set: string;
    collector_number: string;
    quantity: number;
    image: string | null;
}

export default function ArtSelection() {
    const { activeDeckId, parsedDeck } = useDeck();

    const cardFlow = useMemo(() => {
        if (!parsedDeck) return [];
        const combined = [...parsedDeck.mainboard, ...parsedDeck.commander];
        const map = new Map<string, number>();
        for (const entry of combined) {
            map.set(entry.name, (map.get(entry.name) || 0) + entry.quantity);
        }
        return Array.from(map.entries()).map(([name, quantity]) => ({ name, quantity }));
    }, [parsedDeck]);

    const [selections, setSelections] = useState<Record<string, SelectedArt>>({});
    const [loadingDeck, setLoadingDeck] = useState(false);

    // Modal state
    const [expandedCardName, setExpandedCardName] = useState<string | null>(null);
    const [printings, setPrintings] = useState<CardData[]>([]);
    const [loadingPrintings, setLoadingPrintings] = useState(false);
    const [copied, setCopied] = useState(false);

    // Initial load of default card data
    useEffect(() => {
        if (cardFlow.length === 0) return;

        let mounted = true;
        const loadInitialData = async () => {
            setLoadingDeck(true);
            const cardNames = cardFlow.map(c => c.name);
            const dataMap = await fetchCardData(cardNames);

            if (mounted) {
                const initialSelections: Record<string, SelectedArt> = {};
                for (const { name, quantity } of cardFlow) {
                    const data = dataMap.get(name.toLowerCase());
                    if (data) {
                        initialSelections[name] = {
                            name: name,
                            set: data.set,
                            collector_number: data.collector_number,
                            quantity: quantity,
                            image: data.image
                        };
                    } else {
                        // Fallback if not found
                        initialSelections[name] = {
                            name: name,
                            set: 'XXX',
                            collector_number: '0',
                            quantity: quantity,
                            image: null
                        };
                    }
                }
                setSelections(initialSelections);
                setLoadingDeck(false);
            }
        };
        loadInitialData();
        return () => { mounted = false; };
    }, [cardFlow]);

    // Load printings when a card is clicked
    useEffect(() => {
        if (!expandedCardName) return;

        let mounted = true;
        const loadPrintings = async () => {
            setLoadingPrintings(true);
            const data = await fetchCardPrintings(expandedCardName);
            if (mounted) {
                setPrintings(data);
                setLoadingPrintings(false);
            }
        };

        loadPrintings();
        return () => { mounted = false; };
    }, [expandedCardName]);

    const handleSelectArt = (card: CardData) => {
        if (!expandedCardName) return;

        const currentQty = cardFlow.find(c => c.name === expandedCardName)?.quantity || 1;

        setSelections(prev => ({
            ...prev,
            [expandedCardName]: {
                name: expandedCardName,
                set: card.set,
                collector_number: card.collector_number,
                quantity: currentQty,
                image: card.image
            }
        }));
        setExpandedCardName(null);
    };

    const generateExportText = () => {
        if (!parsedDeck) return '';
        let text = '';

        const cmdList = parsedDeck.commander.map(c => selections[c.name]).filter(Boolean);
        const mainList = parsedDeck.mainboard.map(c => selections[c.name]).filter(Boolean);

        if (cmdList.length > 0) {
            text += '// Commander\n';
            for (const sel of cmdList) {
                text += `${sel.quantity} ${sel.name} (${sel.set.toUpperCase()}) ${sel.collector_number}\n`;
            }
            text += '\n// Deck\n';
        }

        for (const sel of mainList) {
            text += `${sel.quantity} ${sel.name} (${sel.set.toUpperCase()}) ${sel.collector_number}\n`;
        }

        return text.trim();
    };

    const handleExport = () => {
        const text = generateExportText();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!activeDeckId || !parsedDeck) {
        return (
            <div className="page art-selection">
                <div className="empty-state">
                    <h2>No Active Deck</h2>
                    <p>Please load a deck from the Toolbox first.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page art-selection">
            <div className="art-selection-header">
                <h2>Art Selection</h2>
                <button className="btn-primary export-btn" onClick={handleExport} disabled={loadingDeck}>
                    {copied ? '✅ Copied to Clipboard!' : '📋 Copy Selection'}
                </button>
            </div>

            {loadingDeck ? (
                <div className="loading-state">
                    <span className="spinner" />
                    <p>Fetching deck cards...</p>
                </div>
            ) : (
                <div className="deck-grid">
                    {cardFlow.map(({ name }) => {
                        const sel = selections[name];
                        return (
                            <div
                                key={name}
                                className="deck-card-item"
                                onClick={() => setExpandedCardName(name)}
                            >
                                {sel?.image ? (
                                    <img src={sel.image} alt={name} loading="lazy" className="card-image" />
                                ) : (
                                    <div className="card-placeholder">{name}</div>
                                )}
                                <div className="card-name-overlay">{name}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {expandedCardName && (
                <div className="modal-overlay" onClick={() => setExpandedCardName(null)}>
                    <div className="modal-content art-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Select Art for: <span className="highlight-card">{expandedCardName}</span></h3>
                            <button className="close-btn" onClick={() => setExpandedCardName(null)}>✕</button>
                        </div>

                        <div className="modal-body">
                            {loadingPrintings ? (
                                <div className="loading-state">
                                    <span className="spinner" />
                                    <p>Fetching printings...</p>
                                </div>
                            ) : (
                                <div className="printings-grid">
                                    {printings.filter(p => p.image).map((printing, i) => (
                                        <div
                                            key={`${printing.set}-${printing.collector_number}-${i}`}
                                            className="printing-card"
                                            onClick={() => handleSelectArt(printing)}
                                        >
                                            <div className="printing-image-wrapper">
                                                <img src={printing.image || ''} alt={printing.name} loading="lazy" />
                                            </div>
                                            <div className="printing-info">
                                                <span className="set-code">{printing.set.toUpperCase()}</span>
                                                <span className="collector-number">#{printing.collector_number}</span>
                                            </div>
                                            <button className="select-printing-btn">Select This Art</button>
                                        </div>
                                    ))}
                                    {printings.filter(p => p.image).length === 0 && !loadingPrintings && (
                                        <div className="no-printings empty-state">
                                            <p>No valid print images found for this set. You can skip this card.</p>
                                            <button className="btn-secondary mt-2" onClick={() => {
                                                handleSelectArt({ set: 'XXX', collector_number: '0', image: null } as any);
                                            }}>
                                                Skip Card
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
