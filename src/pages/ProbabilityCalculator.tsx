import { useState, useMemo } from 'react';
import { useDeck } from '../context/DeckContext';
import { detectTutorCards } from '../utils/tutorDetector';
import type { CardData, ParsedDeck } from '../types';

// Hypergeometric distribution functions
function factorial(n: number): number {
    if (n <= 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

// Log factorial for large numbers to prevent infinity
function logFactorial(n: number): number {
    if (n <= 1) return 0;
    let res = 0;
    for (let i = 2; i <= n; i++) res += Math.log(i);
    return res;
}

function combinations(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    // For smaller numbers
    if (n < 20) return factorial(n) / (factorial(k) * factorial(n - k));

    // For larger numbers use log math
    return Math.exp(logFactorial(n) - logFactorial(k) - logFactorial(n - k));
}

function hypergeometric(populationSize: number, successPopulation: number, sampleSize: number, successes: number): number {
    if (successes > successPopulation || successes > sampleSize) return 0;
    if (sampleSize - successes > populationSize - successPopulation) return 0;

    const waysToDrawSuccesses = combinations(successPopulation, successes);
    const waysToDrawFailures = combinations(populationSize - successPopulation, sampleSize - successes);
    const totalWays = combinations(populationSize, sampleSize);

    return (waysToDrawSuccesses * waysToDrawFailures) / totalWays;
}

export default function ProbabilityCalculator() {
    const { expandedDeck, parsedDeck } = useDeck();

    const totalCards = expandedDeck.length;

    // Calculate defaults based on deck
    const defaultDeckSize = totalCards > 0 ? totalCards : 60;

    const [deckSize, setDeckSize] = useState<number>(defaultDeckSize);
    const [sampleSize, setSampleSize] = useState<number>(7);
    const [successCount, setSuccessCount] = useState<number>(1);
    const [includeTutors, setIncludeTutors] = useState<boolean>(false);

    const [selectedCard, setSelectedCard] = useState<string>('');

    const uniqueCards = useMemo(() => {
        if (!parsedDeck) return [];
        const combined = [...parsedDeck.mainboard, ...parsedDeck.commander];
        const unique = new Map<string, number>();
        for (const entry of combined) {
            unique.set(entry.name, (unique.get(entry.name) || 0) + entry.quantity);
        }
        return Array.from(unique.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [parsedDeck]);

    const tutorCards = useMemo(() => {
        return detectTutorCards(expandedDeck);
    }, [expandedDeck]);

    const effectiveSuccessCount = useMemo(() => {
        if (!includeTutors) return successCount;
        return successCount + tutorCards.length;
    }, [successCount, includeTutors, tutorCards.length]);

    const handleSelectCard = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCard(val);

        if (val === '') {
            setSuccessCount(1);
            return;
        }

        const cardReq = uniqueCards.find(c => c[0] === val);
        if (cardReq) {
            setSuccessCount(cardReq[1]);
        }
    };

    // Calculate probabilities
    const pZero = hypergeometric(deckSize, effectiveSuccessCount, sampleSize, 0);
    const pExactlyOne = hypergeometric(deckSize, effectiveSuccessCount, sampleSize, 1);
    const pExactlyTwo = hypergeometric(deckSize, effectiveSuccessCount, sampleSize, 2);
    const pOneOrMore = 1 - pZero;

    const formatPercent = (n: number) => {
        if (isNaN(n) || n < 0) return '0.00%';
        if (n > 1) return '100.00%';
        return (n * 100).toFixed(2) + '%';
    };

    return (
        <div className="page probability-calculator">
            <div className="analysis-header">
                <h1>Probability Calculator</h1>
            </div>

            <p className="subtitle" style={{ marginBottom: '2rem' }}>
                Calculate the exact hypergeometric probability of drawing specific cards,
                like finding a combo piece in your opening hand or drawing a land off the top.
            </p>

            <div className="calculator-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1.5fr)', gap: '2rem' }}>
                <div className="calculator-inputs import-container">
                    <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', marginBottom: '1.5rem' }}>Parameters</h2>

                    <div className="control-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Quick Select Card</label>
                        <select
                            value={selectedCard}
                            onChange={handleSelectCard}
                            style={{
                                width: '100%', padding: '0.75rem', background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        >
                            <option value="">-- Custom Input --</option>
                            {uniqueCards.map(([name, qty]) => (
                                <option key={name} value={name}>{name} ({qty} copies)</option>
                            ))}
                        </select>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1.5rem 0' }} />

                    <div className="control-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Total Deck Size
                            <span style={{ color: 'var(--text-primary)' }}>{deckSize}</span>
                        </label>
                        <input
                            type="range"
                            min={1}
                            max={100}
                            value={deckSize}
                            onChange={(e) => setDeckSize(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="control-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Cards to Draw (Sample Size)
                            <span style={{ color: 'var(--text-primary)' }}>{sampleSize}</span>
                        </label>
                        <input
                            type="range"
                            min={1}
                            max={deckSize}
                            value={sampleSize}
                            onChange={(e) => setSampleSize(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button className="format-btn" onClick={() => setSampleSize(1)}>Draw 1</button>
                            <button className="format-btn" onClick={() => setSampleSize(7)}>Opening Hand (7)</button>
                            <button className="format-btn" onClick={() => setSampleSize(10)}>Turn 3/4 (10)</button>
                        </div>
                    </div>

                    <div className="control-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Copies in Deck (Successes)
                            <span style={{ color: 'var(--text-primary)' }}>{successCount}</span>
                        </label>
                        <input
                            type="range"
                            min={1}
                            max={deckSize}
                            value={successCount}
                            onChange={(e) => {
                                setSuccessCount(Number(e.target.value));
                                setSelectedCard('');
                            }}
                            style={{ width: '100%' }}
                        />
                        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="includeTutors"
                                checked={includeTutors}
                                onChange={(e) => setIncludeTutors(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                            />
                            <label htmlFor="includeTutors" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Include {tutorCards.length} Tutor cards as successes
                            </label>
                        </div>
                    </div>
                </div>

                <div className="calculator-results">
                    <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', marginBottom: '1.5rem' }}>Probabilities</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="result-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '1.5rem' }}>
                            <div>
                                <span className="result-label" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>1 or more copies</span>
                                <span className="result-sub">At least one success in sample</span>
                            </div>
                            <span className="result-value" style={{ color: 'var(--color-keep)' }}>{formatPercent(pOneOrMore)}</span>
                        </div>

                        <div className="result-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '1.5rem' }}>
                            <div>
                                <span className="result-label" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>0 copies (Whiff)</span>
                                <span className="result-sub">No successes in sample</span>
                            </div>
                            <span className="result-value" style={{ color: 'var(--color-mulligan)' }}>{formatPercent(pZero)}</span>
                        </div>

                        <div className="result-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '1.5rem' }}>
                            <div>
                                <span className="result-label" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Exactly 1 copy</span>
                                <span className="result-sub">Precisely one success drawn</span>
                            </div>
                            <span className="result-value" style={{ color: 'var(--color-risky)' }}>{formatPercent(pExactlyOne)}</span>
                        </div>

                        <div className="result-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '1.5rem' }}>
                            <div>
                                <span className="result-label" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Exactly 2 copies</span>
                                <span className="result-sub">Precision double success</span>
                            </div>
                            <span className="result-value" style={{ color: 'var(--accent-primary)' }}>{formatPercent(pExactlyTwo)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {includeTutors && tutorCards.length > 0 && (
                <div className="analysis-section" style={{ marginTop: '2rem' }}>
                    <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', marginBottom: '1rem' }}>Detected Tutors ({tutorCards.length})</h2>
                    <div className="deck-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                        {tutorCards.map((card, idx) => (
                            <div key={idx} className="deck-card-item">
                                {card.imageSmall ? (
                                    <img src={card.imageSmall} alt={card.name} className="card-image" loading="lazy" />
                                ) : (
                                    <div className="card-placeholder">{card.name}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
