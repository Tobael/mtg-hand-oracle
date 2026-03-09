// =================== Card Types ===================

export interface CardData {
  name: string;
  mana_cost: string;
  cmc: number;
  type_line: string;
  oracle_text: string;
  colors: string[];
  color_identity: string[];
  keywords: string[];
  image: string | null;
  imageSmall: string | null;
  rarity: string;
  produced_mana: string[];
  set: string;
  collector_number: string;
}

export interface SavedDeck {
  id: string;
  name: string;
  date: string;
  text: string;
  format: DeckFormat;
  customTags?: Record<string, string[]>;
}

// =================== Deck Types ===================

export interface DeckEntry {
  quantity: number;
  name: string;
}

export interface ParsedDeck {
  mainboard: DeckEntry[];
  commander: DeckEntry[];
  format: DeckFormat;
}

export type DeckFormat = '60-card' | 'commander';

// =================== Mana Analysis Types ===================

export interface ManaCostBreakdown {
  generic: number;
  colored: Record<string, number>;
  total: number;
}

export interface ManaCurveEntry {
  cmc: string;
  count: number;
}

export interface ColorDistEntry {
  color: string;
  label: string;
  count: number;
}

export interface ColorRequirement {
  maxPips: number;
  cardCount: number;
  totalPips: number;
}

export interface DeckStats {
  totalCards: number;
  lands: number;
  creatures: number;
  spells: number;
  avgCmc: number;
}

// =================== Ramp Types ===================

export interface RampData {
  manaDorks: CardData[];
  manaRocks: CardData[];
  landRamp: CardData[];
  costReducers: CardData[];
  rituals: CardData[];
}

// =================== Hand Evaluation Types ===================

export type HandVerdict = 'Keep' | 'Risky' | 'Mulligan';

export interface TurnAnalysis {
  turn: number;
  landPlayed: boolean;
  manaAvailable: number;
  playableCards: string[];
  manaUsed: number;
}

export interface HandEvaluation {
  verdict: HandVerdict;
  score: number;
  reasons: string[];
  turnAnalysis: TurnAnalysis[];
}

export interface EvaluationOptions {
  rampCards?: Set<string>;
  format?: DeckFormat;
}

// =================== Simulator Types ===================

export interface SimulatorStats {
  handsDrawn: number;
  handsKept: number;
  totalMulligans: number;
}

export interface SimulatorState {
  originalDeck: CardData[];
  library: CardData[];
  hand: CardData[];
  mulliganCount: number;
  stats: SimulatorStats;
}

// =================== Monte Carlo Types ===================

export interface MonteCarloConfig {
  simulations: number;
  turnsToSimulate: number;
}

export interface TurnStats {
  turn: number;
  avgManaAvailable: number;
  avgManaUsed: number;
  avgCardsPlayable: number;
  avgCardsStuck: number;
  manaUtilization: number;
}

export interface ScoreBucket {
  range: string;
  count: number;
}

export interface MonteCarloResults {
  totalSimulations: number;
  keepRate: number;
  brickRate: number;
  playableRate: number;
  riskyRate: number;
  averageScore: number;
  averageMulligans: number;
  scoreDistribution: ScoreBucket[];
  turnByTurnStats: TurnStats[];
}

export interface SimulationProgress {
  completed: number;
  total: number;
}
