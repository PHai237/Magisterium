import type { MonsterId } from '../monster/monsterTypes';

export type ZoneId = 'forest_edge' | 'deep_forest' | 'ruined_path';

export type ZoneDifficulty = 'safe' | 'normal' | 'dangerous';

export type ZoneEncounterDensity = 'low' | 'normal' | 'high';

export interface ZoneDefinition {
  id: ZoneId;
  name: string;
  description: string;
  recommendedLevel: number;
  difficulty: ZoneDifficulty;
  encounterDensity: ZoneEncounterDensity;
  possibleMonsterIds: MonsterId[];
  tags: string[];
}