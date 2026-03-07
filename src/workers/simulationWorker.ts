/**
 * Web Worker for Monte Carlo simulation
 * Runs off the main thread to keep UI responsive
 */

import { runMonteCarloSimulation } from '../utils/monteCarloSimulator';
import type { CardData, MonteCarloConfig, DeckFormat } from '../types';

interface WorkerMessage {
  deck: CardData[];
  rampCardNames: string[];
  config: MonteCarloConfig;
  format: DeckFormat;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { deck, rampCardNames, config, format } = e.data;
  const rampSet = new Set(rampCardNames);

  const results = runMonteCarloSimulation(
    deck,
    rampSet,
    config,
    format,
    (completed, total) => {
      self.postMessage({ type: 'progress', completed, total });
    }
  );

  self.postMessage({ type: 'result', results });
};
