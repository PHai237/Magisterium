import type {
  DamageType,
  ElementType,
  ResistanceProfile,
} from '../character-creation/types';
import type { MonsterAffixId } from '../monster-affix/monsterAffixTypes';
import type { MonsterId } from '../monster/monsterTypes';

export type PendingEncounterModifierSourceType =
  | 'road_event'
  | 'system'
  | 'debug';

export type PendingEncounterModifierDuration = 'next_encounter';

export type PendingEncounterModifierId =
  | 'ambush_pressure'
  | 'ominous_tracks'
  | 'blessed_path'
  | 'hunter_trail'
  | 'unstable_magic'
  | 'wealthy_target';

export interface PendingEncounterStatModifiers {
  maxHpFlat?: number;
  maxHpPercent?: number;
  attackFlat?: number;
  attackPercent?: number;
  defenseFlat?: number;
  defensePercent?: number;
  actionSpeedFlat?: number;
  critRateFlat?: number;
}

export interface PendingEncounterRewardModifiers {
  expMultiplier?: number;
  bronzeMultiplier?: number;
}

export interface PendingEncounterModifierDefinition {
  id: PendingEncounterModifierId;
  name: string;
  description: string;
  sourceType: PendingEncounterModifierSourceType;
  duration: PendingEncounterModifierDuration;

  monsterIdOverride?: MonsterId;
  damageTypeOverride?: DamageType;
  elementTypeOverride?: ElementType;

  forcedAffixIds?: MonsterAffixId[];
  bonusAffixIds?: MonsterAffixId[];

  statModifiers?: PendingEncounterStatModifiers;
  resistanceModifiers?: ResistanceProfile;
  rewardModifiers?: PendingEncounterRewardModifiers;

  tags: string[];
}

export interface ActivePendingEncounterModifier
  extends PendingEncounterModifierDefinition {
  instanceId: string;
  createdAt: string;
}