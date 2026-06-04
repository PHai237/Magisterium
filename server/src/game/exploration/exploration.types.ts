import type { CharacterSnapshot, ItemId } from '../character/character.types';
import type { EncounterId } from '../encounter/encounter.types';

export type ExplorationZoneId =
  | 'town_outskirts'
  | 'forest_edge'
  | 'abandoned_mine';

export type ExplorationSearchOutcomeType =
  | 'encounter'
  | 'bronze'
  | 'item'
  | 'nothing';

export interface ExplorationEncounterPoolEntry {
  encounterId: EncounterId;
  weight: number;
}

export interface ExplorationItemPoolEntry {
  itemId: ItemId;
  minQuantity: number;
  maxQuantity: number;
  weight: number;
}

export interface ExplorationOutcomeWeight {
  outcomeType: ExplorationSearchOutcomeType;
  weight: number;
}

export interface ExplorationZoneDefinition {
  id: ExplorationZoneId;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  dangerLevel: number;
  staminaCost: number;
  encounterPool: readonly ExplorationEncounterPoolEntry[];
  itemPool: readonly ExplorationItemPoolEntry[];
  outcomeWeights: readonly ExplorationOutcomeWeight[];
  bronzeReward: {
    min: number;
    max: number;
  };
  entryLog: readonly string[];
}

export interface ExplorationSearchResult {
  zoneId: ExplorationZoneId;
  zoneName: string;
  outcomeType: ExplorationSearchOutcomeType;
  message: string;
  log: string[];
  staminaCost: number;
  character: CharacterSnapshot;
  encounterId?: EncounterId;
  bronzeFound?: number;
  itemFound?: {
    itemId: ItemId;
    quantity: number;
  };
}
