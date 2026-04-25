export const BATTLE_BALANCE = {
  autoMonsterTurnDelayMs: 700,

  minimumDamage: 1,

  criticalDamageMultiplier: 1.5,

  playerBasicAttackBaseDamage: 5,
  playerBasicAttackStrMultiplier: 1.1,

  monsterDefenseDamageReductionFactor: 0.5,

  monsterAttackVarianceMin: 0.9,
  monsterAttackVarianceMax: 1.1,

  playerAttackVarianceMin: 0.95,
  playerAttackVarianceMax: 1.05,

  utilitySkillEvasionChancePercent: 60,
  utilitySkillHideDamageReductionPercent: 0.5,

  defeatRecoveryHpPercent: 0.3,

  zoneFleeBaseChancePercent: 15,
  zoneFleeLuckScalingPercent: 2,
  zoneFleeLowHpBonusPercent: 15,
  zoneFleeMaxChancePercent: 80,
} as const;

export const PROGRESSION_BALANCE = {
  expToNextLevelMultiplier: 100,
} as const;