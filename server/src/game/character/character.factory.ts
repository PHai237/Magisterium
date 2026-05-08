import { randomUUID } from 'crypto';

import {
  buildBaseStatsForClass,
  buildCurrentState,
  buildDerivedStats,
  getClassById,
  getGiftById,
} from './character.calculations';

import type { Character, ClassId, GiftId } from './character.types';

export interface CreateCharacterFactoryInput {
  name: string;
  classId: ClassId;
  giftId: GiftId;
}

export function createCharacter(
  input: CreateCharacterFactoryInput,
): Character {
  const classDef = getClassById(input.classId);
  const giftDef = getGiftById(input.giftId);

  const baseStats = buildBaseStatsForClass(classDef);
  const derivedStats = buildDerivedStats(baseStats);
  const currentState = buildCurrentState(derivedStats);

  const startingMoneyBronze =
    giftDef.effectType === 'starting_money' ||
    giftDef.effectType === 'starting_gold'
      ? giftDef.effectValue
      : 0;

  return {
    id: randomUUID(),
    version: 1,
    name: input.name.trim(),
    classId: classDef.id,
    className: classDef.name,
    level: 1,
    exp: 0,
    moneyBronze: startingMoneyBronze,
    baseStats,
    derivedStats,
    currentState,
    passive: classDef.passive,
    skills: classDef.starterSkills,
    starterGift: giftDef,
    createdAt: new Date().toISOString(),
  };
}