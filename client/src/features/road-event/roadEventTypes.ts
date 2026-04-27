import type { MonsterId } from '../monster/monsterTypes';
import type { ZoneId } from '../zone/zoneTypes';

export type RoadEventFrequency = 'low' | 'normal' | 'high';

export type RoadEventId =
  | 'broken_wagon_merchant'
  | 'dropped_coin_pouch'
  | 'roadside_shrine'
  | 'bandit_scouts'
  | 'lost_traveler'
  | 'strange_tracks';

export type RoadEventCategory =
  | 'merchant'
  | 'reward'
  | 'recovery'
  | 'danger'
  | 'npc'
  | 'future_combat';

export type RoadEventRarity = 'common' | 'uncommon' | 'rare';

export type RoadEventFutureHook =
  | 'inventory'
  | 'merchant'
  | 'quest'
  | 'combat'
  | 'multi_enemy'
  | 'ambush'
  | 'rare_enemy';

export type RoadEventNextAction = 'continue_travel' | 'start_battle';

export interface RoadEventBattleDefinition {
  id: string;
  name: string;
  description: string;
  monsterId: MonsterId;
  returnMode: 'continue_travel';
}

export interface RoadEventChoiceOutcome {
  message: string;
  bronzeChange?: number;
  hpChange?: number;
  mpChange?: number;
  energyChange?: number;
  futureHook?: RoadEventFutureHook;
  nextAction?: RoadEventNextAction;
  battle?: RoadEventBattleDefinition;
}

export interface RoadEventChoiceDefinition {
  id: string;
  label: string;
  description: string;
  outcome: RoadEventChoiceOutcome;
}

export interface RoadEventDefinition {
  id: RoadEventId;
  title: string;
  category: RoadEventCategory;
  rarity: RoadEventRarity;
  description: string;
  triggerText: string;
  choices: RoadEventChoiceDefinition[];
  zoneIds?: ZoneId[];
  tags: string[];
}