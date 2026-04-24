import { buildCurrentState } from '../character-creation/calculations';
import type { Character } from '../character-creation/types';

import { TAVERN_REST_COST } from './placeConstants';

export function canAffordTavernRest(character: Character): boolean {
  return character.gold >= TAVERN_REST_COST;
}

export function recoverAtTavern(character: Character): Character {
  return {
    ...character,
    gold: character.gold - TAVERN_REST_COST,
    currentState: buildCurrentState(character.derivedStats),
  };
}