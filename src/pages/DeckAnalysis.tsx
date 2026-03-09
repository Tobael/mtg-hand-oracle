import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useDeck } from '../context/DeckContext';
import { buildManaCurve, analyzeColorDistribution, analyzeColorRequirements, getDeckStats, analyzeLandColors } from '../utils/manaAnalysis';
import { getRampCount } from '../utils/rampDetector';
import Recommendations from '../components/Recommendations';
import type { CardData } from '../types';

const COLOR_HEX: Record<string, string> = {
  W: '#F9FAF4', U: '#0E68AB', B: '#150B00', R: '#D3202A', G: '#00733E',
};

const COLOR_CHART: Record<string, string> = {
  White: '#F5E6B8', Blue: '#4A90D9', Black: '#6B5B73', Red: '#E74C3C', Green: '#27AE60', Colorless: '#95A5A6',
};

const RAMP_CATEGORIES = [
  { key: 'manaDorks' as const, label: 'Mana Dorks', icon: '🌿' },
  { key: 'manaRocks' as const, label: 'Mana Rocks', icon: '💎' },
  { key: 'landRamp' as const, label: 'Land Ramp', icon: '🌍' },
  { key: 'costReducers' as const, label: 'Cost Reducers', icon: '⬇️' },
  { key: 'rituals' as const, label: 'Rituals', icon: '🔥' },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p>CMC {label}</p>
        <p className="tooltip-value">{payload[0].value} cards</p>
      </div>
    );
  }
  return null;
};

export default function DeckAnalysis() {
  const { expandedDeck, rampData, parsedDeck, deckFormat } = useDeck();
  const navigate = useNavigate();

  const manaCurve = useMemo(() => buildManaCurve(expandedDeck), [expandedDeck]);
  const colorDist = useMemo(() => analyzeColorDistribution(expandedDeck), [expandedDeck]);
  const colorReqs = useMemo(() => analyzeColorRequirements(expandedDeck), [expandedDeck]);
  const deckStats = useMemo(() => getDeckStats(expandedDeck), [expandedDeck]);
  const landColors = useMemo(() => analyzeLandColors(expandedDeck), [expandedDeck]);
  const rampCount = useMemo(() => rampData ? getRampCount(rampData) : 0, [rampData]);

  if (!parsedDeck || expandedDeck.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No deck imported</h2>
          <p>Go back and import a deck first.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Import Deck</button>
        </div>
      </div>
    );
  }

  const colorLabels: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };

  return (
    <div className="page deck-analysis">
      <div className="analysis-header">
        <h1>Deck Analysis</h1>
        <span className="format-badge">{deckFormat === 'commander' ? 'Commander' : '60-Card'}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{deckStats.totalCards}</span>
          <span className="stat-label">Total Cards</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{deckStats.lands}</span>
          <span className="stat-label">Lands</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{deckStats.creatures}</span>
          <span className="stat-label">Creatures</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{deckStats.spells}</span>
          <span className="stat-label">Spells</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{deckStats.avgCmc}</span>
          <span className="stat-label">Avg CMC</span>
        </div>
        <div className="stat-card accent">
          <span className="stat-value">{rampCount}</span>
          <span className="stat-label">Ramp Cards</span>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h2>Mana Curve</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={manaCurve} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="cmc" stroke="rgba(255,255,255,0.5)" fontSize={13} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={13} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0] as any} maxBarSize={48}>
                {manaCurve.map((_, i) => (
                  <Cell key={i} fill={`hsl(${270 + i * 12}, 70%, ${55 + i * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Color Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={colorDist}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={3}
                strokeWidth={0}
              >
                {colorDist.map((entry) => (
                  <Cell key={entry.label} fill={COLOR_CHART[entry.label]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(20, 15, 35, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            {colorDist.map(c => (
              <span key={c.label} className="legend-item">
                <span className="legend-dot" style={{ background: COLOR_CHART[c.label] }} />
                {c.label} ({c.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="analysis-section">
        <h2>Color Requirements</h2>
        <div className="color-req-grid">
          {Object.entries(colorReqs).map(([color, data]) => (
            <div key={color} className="color-req-card" style={{ borderColor: (COLOR_HEX[color] || '#888') + '80' }}>
              <div className="color-req-header">
                <span className={`mana-pip pip-${color.toLowerCase()}`}>{color}</span>
                <span className="color-req-name">{colorLabels[color]}</span>
              </div>
              <div className="color-req-stats">
                <div><span className="req-num">{data.cardCount}</span> cards need this color</div>
                <div><span className="req-num">{data.totalPips}</span> total pips</div>
                <div><span className="req-num">{data.maxPips}</span> max pips on one card</div>
                <div><span className="req-num">{landColors[color] || 0}</span> lands produce it</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {rampData && rampCount > 0 && (
        <div className="analysis-section">
          <h2>Ramp Cards</h2>
          <div className="ramp-grid">
            {RAMP_CATEGORIES.map(({ key, label, icon }) => {
              const cards = rampData[key];
              if (!cards || cards.length === 0) return null;
              return (
                <div key={key} className="ramp-category">
                  <h3>{icon} {label} ({cards.length})</h3>
                  <div className="ramp-cards">
                    {cards.map((card: CardData) => (
                      <div key={card.name} className="ramp-card-item">
                        {card.imageSmall && (
                          <img src={card.imageSmall} alt={card.name} className="ramp-card-img" />
                        )}
                        <div className="ramp-card-info">
                          <span className="ramp-card-name">{card.name}</span>
                          <span className="ramp-card-cost">{card.mana_cost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Recommendations />

    </div>
  );
}
