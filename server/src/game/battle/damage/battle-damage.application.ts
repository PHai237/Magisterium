import { MAX_SHIELD_RATIO_OF_MAX_HP } from '../battle.constants';

import type { BattleActorState } from '../battle.types';

export interface DamageApplicationResult {
  targetState: BattleActorState;

  shieldDamage: number;
  hpDamage: number;
  overkillDamage: number;

  shieldBroken: boolean;
}

export interface HealingApplicationResult {
  targetState: BattleActorState;
  healingDone: number;
}

export interface ShieldApplicationResult {
  targetState: BattleActorState;
  shieldGained: number;
}

function normalizeNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function getMaxHpForActor(actor: BattleActorState): number {
  return normalizeNonNegativeInteger(actor.derivedStats.maxHp);
}

function getCurrentHpForActor(actor: BattleActorState): number {
  const maxHp = getMaxHpForActor(actor);

  if (maxHp <= 0) {
    return 0;
  }

  return Math.min(normalizeNonNegativeInteger(actor.hp), maxHp);
}

function getCurrentShieldForActor(actor: BattleActorState): number {
  return normalizeNonNegativeInteger(actor.shield);
}

function getMaxShieldForActor(actor: BattleActorState): number {
  return Math.floor(getMaxHpForActor(actor) * MAX_SHIELD_RATIO_OF_MAX_HP);
}

function clampShieldForActor(actor: BattleActorState, shield: number): number {
  return Math.min(
    normalizeNonNegativeInteger(shield),
    getMaxShieldForActor(actor),
  );
}

export function applyDamageToActor(
  target: BattleActorState,
  finalDamage: number,
): DamageApplicationResult {
  const safeDamage = normalizeNonNegativeInteger(finalDamage);

  const currentShield = getCurrentShieldForActor(target);
  const currentHp = getCurrentHpForActor(target);

  const shieldDamage = Math.min(currentShield, safeDamage);
  const remainingDamage = safeDamage - shieldDamage;

  const nextShield = Math.max(0, currentShield - shieldDamage);
  const nextHp = Math.max(0, currentHp - remainingDamage);

  const hpDamage = currentHp - nextHp;
  const overkillDamage = Math.max(0, remainingDamage - hpDamage);

  return {
    targetState: {
      ...target,
      shield: nextShield,
      hp: nextHp,
    },

    shieldDamage,
    hpDamage,
    overkillDamage,

    shieldBroken: currentShield > 0 && nextShield === 0,
  };
}

export function applyHealingToActor(
  target: BattleActorState,
  healingAmount: number,
): HealingApplicationResult {
  const currentHp = getCurrentHpForActor(target);

  if (currentHp <= 0) {
    return {
      targetState: {
        ...target,
        hp: 0,
      },
      healingDone: 0,
    };
  }

  const maxHp = getMaxHpForActor(target);
  const safeHealing = normalizeNonNegativeInteger(healingAmount);
  const nextHp = Math.min(maxHp, currentHp + safeHealing);

  return {
    targetState: {
      ...target,
      hp: nextHp,
    },
    healingDone: nextHp - currentHp,
  };
}

export function applyShieldToActor(
  target: BattleActorState,
  shieldAmount: number,
): ShieldApplicationResult {
  const currentShield = clampShieldForActor(target, target.shield);
  const safeShield = normalizeNonNegativeInteger(shieldAmount);
  const nextShield = clampShieldForActor(target, currentShield + safeShield);

  return {
    targetState: {
      ...target,
      shield: nextShield,
    },
    shieldGained: nextShield - currentShield,
  };
}
