import type {
  CharacterSnapshot,
  ItemId,
  StatKey,
} from '../character/character.types';

export type RankId =
  | 'novice'
  | 'initiate'
  | 'acolyte'
  | 'adept'
  | 'magus'
  | 'magister'
  | 'archmagister';

export interface RankDefinition {
  id: RankId;
  index: number;
  name: string;
  averageStatRequired: number;
}

export interface RankProgressionStatus {
  currentRank: RankDefinition;
  nextRank?: RankDefinition;
  averageStatValue: number;
  averageStatRequiredForNextRank?: number;
  progressPercentToNextRank: number;
  isEligibleForRankUp: boolean;
}

export interface SanctuaryInventoryQuantity {
  statKey: StatKey;
  itemId: ItemId;
  quantity: number;
}

export interface CharacterSanctuaryStatusResult {
  character: CharacterSnapshot;
  rankStatus: RankProgressionStatus;
  fragments: SanctuaryInventoryQuantity[];
  runes: SanctuaryInventoryQuantity[];
}

export interface CharacterRuneRefinementResult
  extends CharacterSanctuaryStatusResult {
  refinement: {
    statKey: StatKey;
    consumedItemId: ItemId;
    consumedQuantity: number;
    createdItemId: ItemId;
    createdQuantity: number;
  };
}

export interface CharacterRuneImbueResult
  extends CharacterSanctuaryStatusResult {
  imbue: {
    statKey: StatKey;
    consumedItemId: ItemId;
    consumedQuantity: number;
    previousAccumulatedBonus: number;
    nextAccumulatedBonus: number;
  };
}

export interface CharacterRankUpResult extends CharacterSanctuaryStatusResult {
  rankUp: {
    previousRank: RankDefinition;
    nextRank: RankDefinition;
    averageStatValue: number;
  };
}
