export const BATTLE_BALANCE = {
  autoMonsterTurnDelayMs: 700,

  criticalDamageMultiplier: 1.5,

  playerBasicAttackBaseDamage: 5,
  playerBasicAttackStrMultiplier: 1.1,

  monsterDefenseDamageReductionFactor: 0.5,

  defeatRecoveryHpPercent: 0.3,
} as const;

export const PROGRESSION_BALANCE = {
  expToNextLevelMultiplier: 100,
} as const;