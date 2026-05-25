import type {
  DamageType,
  ElementType,
  ResistanceProfile,
} from '../character-creation/types';

export type MonsterAffixId =
  | 'tough'
  | 'fierce'
  | 'armored'
  | 'swift'
  | 'flame_touched'
  | 'aqua_touched'
  | 'shadow_touched'
  | 'holy_touched'
  | 'volatile'
  | 'giant';

export type MonsterAffixTier = 'minor' | 'major';

export interface MonsterAffixStatModifiers {
  maxHpFlat?: number;
  maxHpPercent?: number;
  attackFlat?: number;
  attackPercent?: number;
  defenseFlat?: number;
  defensePercent?: number;
  actionSpeedFlat?: number;
  critRateFlat?: number;
}

export interface MonsterAffixRewardModifiers {
  expMultiplier?: number;
  bronzeMultiplier?: number;
}

export interface MonsterAffixDefinition {
  id: MonsterAffixId;
  name: string;
  description: string;
  tier: MonsterAffixTier;
  statModifiers?: MonsterAffixStatModifiers;
  resistanceModifiers?: ResistanceProfile;
  damageTypeOverride?: DamageType;
  elementTypeOverride?: ElementType;
  rewardModifiers?: MonsterAffixRewardModifiers;
  tags: string[];
}