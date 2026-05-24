import type { DamageType } from '../character/character.types';
import type { BattleEventType } from './battle.types';

export const MAX_PROC_PER_TURN = 5;

export const MODIFIER_PRIORITY = {
  FLAT: 10,
  PERCENT: 20,
  OVERRIDE: 30,
} as const;

export const MIN_HIT_CHANCE_PERCENT = 15;
export const MAX_HIT_CHANCE_PERCENT = 98;

export const MIN_FINAL_DAMAGE = 1;

export const NORMAL_DAMAGE_DEFENSE_MULTIPLIER = 1;
export const NORMAL_DAMAGE_RESISTANCE_MULTIPLIER = 1;

export const TRUE_DAMAGE_DEFENSE_MULTIPLIER = 0;
export const TRUE_DAMAGE_RESISTANCE_MULTIPLIER = 0;

export const DAMAGE_TYPE_DEFENSE_MULTIPLIER: Record<DamageType, number> = {
  physical: NORMAL_DAMAGE_DEFENSE_MULTIPLIER,
  magical: NORMAL_DAMAGE_DEFENSE_MULTIPLIER,
  true: TRUE_DAMAGE_DEFENSE_MULTIPLIER,
};

export const DAMAGE_TYPE_RESISTANCE_MULTIPLIER: Record<DamageType, number> = {
  physical: NORMAL_DAMAGE_RESISTANCE_MULTIPLIER,
  magical: NORMAL_DAMAGE_RESISTANCE_MULTIPLIER,
  true: TRUE_DAMAGE_RESISTANCE_MULTIPLIER,
};

export const MIN_RESISTANCE_VALUE = -1;
export const MAX_DAMAGE_REDUCTION_RESISTANCE_VALUE = 0.95;
export const MAX_ABSORPTION_RATIO = 1;
export const MAX_ABSORBED_HEAL_RATIO_OF_MAX_HP = 0.25;

export const MAX_SHIELD_RATIO_OF_MAX_HP = 0.5;

export const EXHAUSTION_STAMINA_THRESHOLD = 0;
export const RECOVERY_STAMINA_PERCENT = 0.2;

export const EXHAUSTED_DEFENSE_MULTIPLIER = 0.5;
export const EXHAUSTED_EVASION_RATE = 0;

export const DAMAGE_VARIANCE_RATIO = 0.05;

export const TURN_GAUGE_READY_VALUE = 100;
export const INITIAL_TURN_GAUGE_VALUE = 0;
export const MIN_ACTION_SPEED = 1;
export const MAX_TURN_GAUGE_ADVANCE_TICKS = 5000;

export const MAX_BATTLE_EVENTS_RETAINED = 200;
export const PINNED_BATTLE_EVENT_TYPES = new Set<BattleEventType>([
  'BATTLE_STARTED',
  'BATTLE_ENDED',
]);

export const MAX_MANUAL_MONSTERS_PER_BATTLE = 12;
export const MAX_AUTO_MONSTER_ACTIONS = 20;
