import {
  BASE_STARTING_STATS,
  CHARACTER_CLASSES,
  STARTER_GIFTS,
} from './character.constants';

import type {
  BaseStats,
  ClassDefinition,
  ClassId,
  CurrentState,
  DerivedStats,
  GiftId,
  StarterGiftDefinition,
} from './character.types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function addStats(base: BaseStats, bonus: BaseStats): BaseStats {
  return {
    STR: base.STR + bonus.STR,
    INT: base.INT + bonus.INT,
    VIT: base.VIT + bonus.VIT,
    DEX: base.DEX + bonus.DEX,
    LUK: base.LUK + bonus.LUK,
  };
}

export function getClassById(classId: ClassId): ClassDefinition {
  const found = CHARACTER_CLASSES.find((item) => item.id === classId);

  if (!found) {
    throw new Error(`Class not found: ${classId}`);
  }

  return found;
}

export function getGiftById(giftId: GiftId): StarterGiftDefinition {
  const found = STARTER_GIFTS.find((item) => item.id === giftId);

  if (!found) {
    throw new Error(`Gift not found: ${giftId}`);
  }

  return found;
}

export function buildBaseStatsForClass(classDef: ClassDefinition): BaseStats {
  return addStats(BASE_STARTING_STATS, classDef.statBonus);
}

export function buildDerivedStats(baseStats: BaseStats): DerivedStats {
  const maxHp = 50 + baseStats.VIT * 10;
  const maxMp = 20 + baseStats.INT * 5;
  const maxEnergy = 100;

  const defense = baseStats.VIT * 2;
  const damageReduction = defense / (100 + defense);

  const actionSpeed = 100 + baseStats.DEX * 2;

  const critRate = clamp(3 + baseStats.LUK * 0.35, 0, 25);
  const dropRateBonus = clamp(baseStats.LUK * 0.2, 0, 15);

  return {
    maxHp,
    maxMp,
    maxEnergy,
    defense,
    damageReduction,
    actionSpeed,
    critRate,
    dropRateBonus,
  };
}

export function buildCurrentState(derivedStats: DerivedStats): CurrentState {
  return {
    hp: derivedStats.maxHp,
    mp: derivedStats.maxMp,
    energy: derivedStats.maxEnergy,
    shield: 0,
  };
}