import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeck } from '../context/DeckContext';
import type { DeckFormat } from '../types';

const SAMPLE_DECK_60 = `4 Lightning Bolt
4 Monastery Swiftspear
4 Goblin Guide
4 Eidolon of the Great Revel
4 Lava Spike
4 Rift Bolt
4 Searing Blaze
4 Skullcrack
2 Light Up the Stage
2 Shard Volley
4 Inspiring Vantage
4 Sacred Foundry
2 Fiery Islet
10 Mountain`;

const SAMPLE_DECK_COMMANDER = `// Commander
1 Atraxa, Praetors' Voice

// Deck
1 Sol Ring
1 Arcane Signet
1 Chromatic Lantern
1 Commander's Sphere
1 Fellwar Stone
1 Talisman of Progress
1 Talisman of Dominance
1 Talisman of Unity
1 Talisman of Hierarchy
1 Kodama's Reach
1 Cultivate
1 Farseek
1 Nature's Lore
1 Three Visits
1 Rampant Growth
1 Swords to Plowshares
1 Path to Exile
1 Anguished Unmaking
1 Vindicate
1 Teferi's Protection
1 Counterspell
1 Swan Song
1 Beast Within
1 Generous Gift
1 Wrath of God
1 Supreme Verdict
1 Toxic Deluge
1 Cyclonic Rift
1 Demonic Tutor
1 Vampiric Tutor
1 Rhystic Study
1 Smothering Tithe
1 Sylvan Library
1 Mirari's Wake
1 Doubling Season
1 Deepglow Skate
1 Inexorable Tide
1 Atraxa, Grand Unifier
1 Vorinclex, Monstrous Raider
1 Evolution Sage
1 Flux Channeler
1 Pir, Imaginative Rascal
1 Toothy, Imaginary Friend
1 Vorel of the Hull Clade
1 Fathom Mage
1 Kalonian Hydra
1 Herald of Secret Streams
1 Tekuthal, Inquiry Dominus
1 Command Tower
1 Exotic Orchard
1 Reflecting Pool
1 City of Brass
1 Mana Confluence
1 Breeding Pool
1 Hallowed Fountain
1 Godless Shrine
1 Watery Grave
1 Temple Garden
1 Overgrown Tomb
1 Zagoth Triome
1 Indatha Triome
1 Raffine's Tower
1 Spara's Headquarters
1 Flooded Strand
1 Polluted Delta
1 Windswept Heath
1 Marsh Flats
1 Verdant Catacombs
1 Misty Rainforest
5 Forest
3 Plains
3 Island
3 Swamp`;

export default function DeckImport() {
  const { importDeck, loading, error, deckFormat, setDeckFormat } = useDeck();
  const [text, setText] = useState('');
  const navigate = useNavigate();

  const handleImport = async () => {
    if (!text.trim()) return;
    const success = await importDeck(text);
    if (success) {
      navigate('/analysis');
    }
  };

  const loadSample = (type: string) => {
    const sample = type === 'commander' ? SAMPLE_DECK_COMMANDER : SAMPLE_DECK_60;
    setText(sample);
  };

  return (
    <div className="page deck-import">
      <div className="import-container">
        <div className="import-header">
          <div className="import-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9,15 12,12 15,15" />
            </svg>
          </div>
          <h1>Import Your Deck</h1>
          <p className="subtitle">Paste your decklist below to analyze mana curves, detect ramp, and simulate starting hands</p>
        </div>

        <div className="format-selector">
          <button
            className={`format-btn ${deckFormat === '60-card' ? 'active' : ''}`}
            onClick={() => setDeckFormat('60-card' as DeckFormat)}
          >
            60-Card
          </button>
          <button
            className={`format-btn ${deckFormat === 'commander' ? 'active' : ''}`}
            onClick={() => setDeckFormat('commander' as DeckFormat)}
          >
            Commander
          </button>
        </div>

        <div className="textarea-wrapper">
          <textarea
            id="deck-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Paste your decklist here...\n\nFormat:\n4 Lightning Bolt\n4 Monastery Swiftspear\n20 Mountain\n\nSideboard cards (prefixed with "// Sideboard") will be ignored.`}
            rows={16}
          />
          <div className="textarea-footer">
            <span className="line-count">{text.split('\n').filter(l => l.trim()).length} lines</span>
          </div>
        </div>

        <div className="sample-buttons">
          <button className="sample-btn" onClick={() => loadSample('60')}>
            <span className="sample-icon">⚡</span> Load Burn Sample
          </button>
          <button className="sample-btn" onClick={() => loadSample('commander')}>
            <span className="sample-icon">👑</span> Load Commander Sample
          </button>
        </div>

        {error && (
          <div className="error-message">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          id="import-button"
          className="import-btn"
          onClick={handleImport}
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Fetching card data...
            </>
          ) : (
            <>Import &amp; Analyze</>
          )}
        </button>
      </div>
    </div>
  );
}
