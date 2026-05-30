import { STAT_KEYS } from '../character/character.constants';

import {
  calculateBaseStats,
  clamp,
  roundToTwoDecimals,
  toSafeInteger,
} from '../character/character.calculations';

import type { Character } from '../character/character.types';

import { RANK_DEFINITIONS } from './sanctuary.constants';

import type {
  RankDefinition,
  RankId,
  RankProgressionStatus,
} from './sanctuary.types';

type RankProgressionFields = {
  rankIndex?: number;
  rankId?: RankId;
};

export function getRankDefinitionByIndex(rankIndex: number): RankDefinition {
  const normalizedIndex = clamp(
    toSafeInteger(rankIndex),
    0,
    RANK_DEFINITIONS.length - 1,
  );

  return RANK_DEFINITIONS[normalizedIndex];
}

export function getRankProgressionFields(
  character: Character,
): RankProgressionFields {
  return character.progression as Character['progression'] &
    RankProgressionFields;
}

export function getCharacterRankIndex(character: Character): number {
  const rankFields = getRankProgressionFields(character);

  if (typeof rankFields.rankIndex === 'number') {
    return rankFields.rankIndex;
  }

  return 0;
}

export function getRankDefinitionById(rankId: RankId): RankDefinition {
  const found = RANK_DEFINITIONS.find((rank) => rank.id === rankId);

  if (!found) {
    throw new Error(`Rank definition not found: ${rankId}`);
  }

  return found;
}

export function calculateAverageEffectiveStatValue(
  character: Character,
): number {
  const baseStats = calculateBaseStats(character.stats);
  const total = STAT_KEYS.reduce((sum, statKey) => sum + baseStats[statKey], 0);

  return roundToTwoDecimals(total / STAT_KEYS.length);
}

export function calculateRankStatus(character: Character): RankProgressionStatus {
  const currentRank = getRankDefinitionByIndex(getCharacterRankIndex(character));
  const nextRank = RANK_DEFINITIONS[currentRank.index + 1];
  const averageStatValue = calculateAverageEffectiveStatValue(character);

  if (!nextRank) {
    return {
      currentRank,
      averageStatValue,
      progressPercentToNextRank: 100,
      isEligibleForRankUp: false,
    };
  }

  const previousThreshold = currentRank.averageStatRequired;
  const nextThreshold = nextRank.averageStatRequired;
  const thresholdSpan = Math.max(1, nextThreshold - previousThreshold);
  const progressPercentToNextRank = roundToTwoDecimals(
    clamp(((averageStatValue - previousThreshold) / thresholdSpan) * 100, 0, 100),
  );

  return {
    currentRank,
    nextRank,
    averageStatValue,
    averageStatRequiredForNextRank: nextThreshold,
    progressPercentToNextRank,
    isEligibleForRankUp: averageStatValue >= nextThreshold,
  };
}
