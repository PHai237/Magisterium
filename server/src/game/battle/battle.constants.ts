export const MAX_PROC_PER_TURN = 5;

export const MODIFIER_PRIORITY = {
  FLAT: 10,
  PERCENT: 20,
  OVERRIDE: 30,
} as const;

export const BASE_HIT_CHANCE = 0.85;
export const MIN_HIT_CHANCE = 0.15;
export const MAX_HIT_CHANCE = 0.98;

export const DEFENSE_DIMINISHING_BASE = 100;

export const EXHAUSTED_DEFENSE_MULTIPLIER = 0.5;
export const EXHAUSTED_EVASION_RATE = 0;
