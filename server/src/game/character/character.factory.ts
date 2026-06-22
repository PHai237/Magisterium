import { randomUUID } from 'crypto';

import { STARTING_FATIGUE } from './character.constants';

import {
  buildCurrentState,
  buildStatsForOrigin,
  calculateBaseStats,
  calculateDerivedStats,
  getDefaultStarterKit,
  getOriginById,
} from './character.calculations';

import type {
  Character,
  CreateCharacterInput,
  ItemId,
  PassiveId,
  SkillId,
} from './character.types';

function uniqueIds<T extends string>(ids: T[]): T[] {
  return Array.from(new Set(ids));
}

function normalizeRequiredUserId(userId: string): string {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new Error('userId is required to create a character.');
  }

  return normalizedUserId;
}

export function createCharacter(input: CreateCharacterInput): Character {
  const originDef = getOriginById(input.originId);
  const starterKitDef = getDefaultStarterKit();

  const stats = buildStatsForOrigin(originDef);
  const baseStats = calculateBaseStats(stats);
  const derivedStats = calculateDerivedStats(baseStats);
  const currentState = buildCurrentState(derivedStats);

  const now = new Date().toISOString();

  const originItemIds: ItemId[] = originDef.startingItemIds;
  const starterKitItemIds: ItemId[] = starterKitDef.startingItemIds;

  const inventoryItemIds: ItemId[] = [...originItemIds, ...starterKitItemIds];

  const equippedItemIds = uniqueIds<ItemId>(originItemIds);

  const learnedSkillIds = uniqueIds<SkillId>(originDef.startingSkillIds);
  const equippedSkillIds = uniqueIds<SkillId>(originDef.startingSkillIds);

  const passiveIds = uniqueIds<PassiveId>(originDef.startingPassiveIds);

  return {
    id: randomUUID(),
    version: 1,

    userId: normalizeRequiredUserId(input.userId),

    name: input.name.trim(),
    originId: originDef.id,

    progression: {
      rankIndex: 0,
      rankId: 'novice',
      milestoneIds: [],
    },

    moneyBronze: starterKitDef.startingMoneyBronze,

    stats,
    currentState,

    passiveIds,

    learnedSkillIds,
    equippedSkillIds,

    starterKitId: starterKitDef.id,

    inventoryItemIds,
    equippedItemIds,
    monsterKnowledge: [],

    fatigue: STARTING_FATIGUE,
    lastRestAt: now,

    createdAt: now,
    updatedAt: now,
  };
}
