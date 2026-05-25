import { buildCurrentState } from '../character-creation/calculations';
import type { Character } from '../character-creation/types';
import { canAffordBronze, subtractBronze } from '../economy/currencyUtils';

import { TAVERN_REST_COST_BRONZE } from './placeConstants';

export function canAffordTavernRest(character: Character): boolean {
  return canAffordBronze(character.moneyBronze, TAVERN_REST_COST_BRONZE);
}

export function recoverAtTavern(character: Character): Character {
  return {
    ...character,
    moneyBronze: subtractBronze(
        character.moneyBronze,
        TAVERN_REST_COST_BRONZE,
    ),
    currentState: buildCurrentState(character.derivedStats),
  };
}