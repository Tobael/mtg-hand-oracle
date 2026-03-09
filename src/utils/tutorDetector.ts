import type { CardData } from '../types';

/**
 * Very basic heuristics to detect tutors.
 * Tutors usually have text like "search your library for", "perused", etc.
 * Or are known by name. 
 */
export function countTutors(cards: CardData[]): number {
    let count = 0;
    for (const card of cards) {
        const text = card.oracle_text?.toLowerCase() || '';

        // Basic keywords for tutoring
        if (text.includes('search your library for') ||
            text.includes('search your library and/or graveyard for')) {
            count += 1;
        }
    }
    return count;
}

export function detectTutorCards(cards: CardData[]): CardData[] {
    const tutors: CardData[] = [];
    for (const card of cards) {
        const text = card.oracle_text?.toLowerCase() || '';

        if (text.includes('search your library for') ||
            text.includes('search your library and/or graveyard for')) {
            tutors.push(card);
        }
    }
    return tutors;
}
