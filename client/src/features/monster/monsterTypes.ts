import type {
  DamageType,
  ElementType,
  ResistanceProfile,
} from '../character-creation/types';
import type { LootTableId } from '../loot/lootTypes';
import type {
  MonsterAffixDefinition,
  MonsterAffixId,
} from '../monster-affix/monsterAffixTypes';

export type MonsterId =
  | 'green_slime'
  | 'wild_rat'
  | 'lesser_goblin'
  | 'slime_king'
  | 'goblin_chief'
  | 'bandit_scout'
  | 'mutated_slime';

export type MonsterRank = 'normal' | 'elite' | 'boss';

export interface MonsterStats {
  maxHp: number;
  attack: number;
  defense: number;
  actionSpeed: number;
  critRate: number;
}

export interface MonsterReward {
  exp: number;
  bronze: number;
}

export interface MonsterDefinition {
  id: MonsterId;
  name: string;
  description: string;
  level: number;
  rank: MonsterRank;
  damageType: DamageType;
  elementType: ElementType;
  resistances: ResistanceProfile;
  possibleAffixIds?: MonsterAffixId[];
  lootTableId?: LootTableId;
  stats: MonsterStats;
  reward: MonsterReward;
  tags: string[];
}

export interface MonsterBattleState {
  monsterId: MonsterId;
  name: string;
  baseName: string;
  level: number;
  rank: MonsterRank;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  actionSpeed: number;
  critRate: number;
  damageType: DamageType;
  elementType: ElementType;
  resistances: ResistanceProfile;
  affixes: MonsterAffixDefinition[];
  reward: MonsterReward;
  tags: string[];
}