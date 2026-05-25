import type { MonsterId } from '../monster/monster.types';

export type EncounterId =
  | 'slime_training'
  | 'goblin_scout'
  | 'forest_edge_mixed';

export type EncounterZoneId = 'training_ground' | 'forest_edge';

export type EncounterRank = 'normal' | 'elite' | 'boss';

export interface EncounterMonsterGroup {
  monsterId: MonsterId;
  count: number;
  instanceIdPrefix?: string;
}

export interface EncounterDefinition {
  id: EncounterId;
  name: string;
  description: string;

  zoneId: EncounterZoneId;

  rank: EncounterRank;
  recommendedLevel: number;

  monsterGroups: readonly EncounterMonsterGroup[];

  tags: readonly string[];
}
