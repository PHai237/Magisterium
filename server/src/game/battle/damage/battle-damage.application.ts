import type { BattleActorState } from '../battle.types';

export interface DamageApplicationResult {
  targetState: BattleActorState;
  shieldDamage: number;
  hpDamage: number;
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

export function applyDamageToActor(
  target: BattleActorState,
  finalDamage: number,
): DamageApplicationResult {
  const safeDamage = Math.max(0, Math.floor(finalDamage));

  const shieldDamage = Math.min(target.shield, safeDamage);
  const remainingDamage = safeDamage - shieldDamage;

  const nextShield = Math.max(0, target.shield - shieldDamage);
  const nextHp = Math.max(0, target.hp - remainingDamage);

  return {
    targetState: {
      ...target,
      shield: nextShield,
      hp: nextHp,
    },
    shieldDamage,
    hpDamage: remainingDamage,
    shieldBroken: target.shield > 0 && nextShield === 0,
  };
}

export function applyHealingToActor(
  target: BattleActorState,
  healingAmount: number,
): HealingApplicationResult {
  const safeHealing = Math.max(0, Math.floor(healingAmount));
  const nextHp = Math.min(target.derivedStats.maxHp, target.hp + safeHealing);

  return {
    targetState: {
      ...target,
      hp: nextHp,
    },
    healingDone: nextHp - target.hp,
  };
}

export function applyShieldToActor(
  target: BattleActorState,
  shieldAmount: number,
): ShieldApplicationResult {
  const safeShield = Math.max(0, Math.floor(shieldAmount));

  return {
    targetState: {
      ...target,
      shield: target.shield + safeShield,
    },
    shieldGained: safeShield,
  };
}
