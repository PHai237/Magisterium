import type { BaseStats, Character, ClassId } from '../character-creation/types';
import { PROGRESSION_BALANCE } from '../game-balance/balanceConstants';
import {
  addStats,
  buildCurrentState,
  buildDerivedStats,
} from '../character-creation/calculations';

export interface ExpRewardResult {
  updatedCharacter: Character;
  levelsGained: number;
  levelUpMessages: string[];
}

export function getExpToNextLevel(level: number): number {
  return level * PROGRESSION_BALANCE.expToNextLevelMultiplier;
}

export function getClassLevelUpBonus(classId: ClassId): BaseStats {
  if (classId === 'warrior') {
    return {
      STR: 2,
      INT: 0,
      VIT: 1,
      DEX: 0,
      LUK: 0,
    };
  }

  if (classId === 'mage') {
    return {
      STR: 0,
      INT: 2,
      VIT: 0,
      DEX: 1,
      LUK: 0,
    };
  }

  if (classId === 'archer') {
    return {
      STR: 1,
      INT: 0,
      VIT: 0,
      DEX: 1,
      LUK: 1,
    };
  }

  if (classId === 'rogue') {
    return {
      STR: 0,
      INT: 0,
      VIT: 0,
      DEX: 2,
      LUK: 1,
    };
  }

  return {
    STR: 0,
    INT: 2,
    VIT: 1,
    DEX: 0,
    LUK: 0,
  };
}

export function applyExpReward(
  character: Character,
  gainedExp: number,
): ExpRewardResult {
  let nextLevel = character.level;
  let remainingExp = character.exp + gainedExp;
  let nextBaseStats = character.baseStats;

  let levelsGained = 0;
  const levelUpMessages: string[] = [];

  while (remainingExp >= getExpToNextLevel(nextLevel)) {
    const requiredExp = getExpToNextLevel(nextLevel);

    remainingExp -= requiredExp;
    nextLevel += 1;
    levelsGained += 1;

    const bonusStats = getClassLevelUpBonus(character.classId);
    nextBaseStats = addStats(nextBaseStats, bonusStats);

    levelUpMessages.push(
      `${character.name} reached Level ${nextLevel}.`,
    );
  }

  const nextDerivedStats = buildDerivedStats(nextBaseStats);

  const updatedCharacter: Character = {
    ...character,
    level: nextLevel,
    exp: remainingExp,
    baseStats: nextBaseStats,
    derivedStats: nextDerivedStats,
    currentState:
      levelsGained > 0
        ? buildCurrentState(nextDerivedStats)
        : character.currentState,
  };

  return {
    updatedCharacter,
    levelsGained,
    levelUpMessages,
  };
}