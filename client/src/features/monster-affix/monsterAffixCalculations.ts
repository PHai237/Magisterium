import type {
  ResistanceKey,
  ResistanceProfile,
} from '../character-creation/types';
import type {
  MonsterBattleState,
  MonsterDefinition,
} from '../monster/monsterTypes';

import {
  getMonsterAffixById,
  MONSTER_AFFIXES,
} from './monsterAffixConstants';
import type {
  MonsterAffixDefinition,
  MonsterAffixId,
  MonsterAffixRewardModifiers,
  MonsterAffixStatModifiers,
} from './monsterAffixTypes';

function applyFlatAndPercentModifier(params: {
  baseValue: number;
  flat?: number;
  percent?: number;
  minimum?: number;
}): number {
  const valueAfterFlat = params.baseValue + (params.flat ?? 0);
  const valueAfterPercent = valueAfterFlat * (1 + (params.percent ?? 0));

  return Math.max(
    params.minimum ?? 0,
    Math.round(valueAfterPercent),
  );
}

function applyStatModifiers(
  monster: MonsterBattleState,
  modifiers: MonsterAffixStatModifiers | undefined,
): MonsterBattleState {
  if (!modifiers) {
    return monster;
  }

  const maxHp = applyFlatAndPercentModifier({
    baseValue: monster.maxHp,
    flat: modifiers.maxHpFlat,
    percent: modifiers.maxHpPercent,
    minimum: 1,
  });

  const currentHpDifference = maxHp - monster.maxHp;

  return {
    ...monster,
    maxHp,
    currentHp: Math.max(1, monster.currentHp + currentHpDifference),
    attack: applyFlatAndPercentModifier({
      baseValue: monster.attack,
      flat: modifiers.attackFlat,
      percent: modifiers.attackPercent,
      minimum: 1,
    }),
    defense: applyFlatAndPercentModifier({
      baseValue: monster.defense,
      flat: modifiers.defenseFlat,
      percent: modifiers.defensePercent,
      minimum: 0,
    }),
    actionSpeed: applyFlatAndPercentModifier({
      baseValue: monster.actionSpeed,
      flat: modifiers.actionSpeedFlat,
      minimum: 1,
    }),
    critRate: Math.max(
      0,
      Math.min(100, monster.critRate + (modifiers.critRateFlat ?? 0)),
    ),
  };
}

function mergeResistanceProfiles(
  baseResistances: ResistanceProfile,
  modifierResistances: ResistanceProfile | undefined,
): ResistanceProfile {
  if (!modifierResistances) {
    return baseResistances;
  }

  const mergedResistances: ResistanceProfile = {
    ...baseResistances,
  };

  for (const key of Object.keys(modifierResistances) as ResistanceKey[]) {
    mergedResistances[key] =
      (mergedResistances[key] ?? 0) + (modifierResistances[key] ?? 0);
  }

  return mergedResistances;
}

function applyRewardModifiers(
  monster: MonsterBattleState,
  modifiers: MonsterAffixRewardModifiers | undefined,
): MonsterBattleState {
  if (!modifiers) {
    return monster;
  }

  return {
    ...monster,
    reward: {
      exp: Math.max(
        0,
        Math.round(monster.reward.exp * (modifiers.expMultiplier ?? 1)),
      ),
      bronze: Math.max(
        0,
        Math.round(
          monster.reward.bronze * (modifiers.bronzeMultiplier ?? 1),
        ),
      ),
    },
  };
}

export function applyMonsterAffix(
  monster: MonsterBattleState,
  affix: MonsterAffixDefinition,
): MonsterBattleState {
  const monsterAfterStats = applyStatModifiers(
    monster,
    affix.statModifiers,
  );

  const monsterAfterResistance: MonsterBattleState = {
    ...monsterAfterStats,
    damageType: affix.damageTypeOverride ?? monsterAfterStats.damageType,
    elementType: affix.elementTypeOverride ?? monsterAfterStats.elementType,
    resistances: mergeResistanceProfiles(
      monsterAfterStats.resistances,
      affix.resistanceModifiers,
    ),
    tags: [...new Set([...monsterAfterStats.tags, ...affix.tags])],
  };

  return applyRewardModifiers(
    monsterAfterResistance,
    affix.rewardModifiers,
  );
}

export function applyMonsterAffixes(
  monster: MonsterBattleState,
  affixes: MonsterAffixDefinition[],
): MonsterBattleState {
  return affixes.reduce((currentMonster, affix) => {
    return applyMonsterAffix(currentMonster, affix);
  }, monster);
}

export function getMonsterAffixCount(
  monster: MonsterDefinition,
): number {
  if (monster.rank === 'boss') {
    return 1;
  }

  if (monster.rank === 'elite') {
    return 1;
  }

  if (monster.tags.includes('rare')) {
    return 1;
  }

  return 0;
}

function getEligibleAffixesForMonster(
  monster: MonsterDefinition,
): MonsterAffixDefinition[] {
  return MONSTER_AFFIXES.filter((affix) => {
    if (
      monster.tags.includes('slime') &&
      affix.id === 'armored'
    ) {
      return false;
    }

    if (
      monster.tags.includes('soft-body') &&
      affix.id === 'armored'
    ) {
      return false;
    }

    return true;
  });
}

function pickRandomAffix(
  affixes: MonsterAffixDefinition[],
  excludedAffixIds: Set<MonsterAffixId>,
): MonsterAffixDefinition | null {
  const availableAffixes = affixes.filter((affix) => {
    return !excludedAffixIds.has(affix.id);
  });

  if (availableAffixes.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * availableAffixes.length);

  return availableAffixes[randomIndex];
}

export function rollMonsterAffixes(
  monster: MonsterDefinition,
): MonsterAffixDefinition[] {
  const affixCount = getMonsterAffixCount(monster);

  if (affixCount <= 0) {
    return [];
  }

  const eligibleAffixes = getEligibleAffixesForMonster(monster);
  const selectedAffixes: MonsterAffixDefinition[] = [];
  const selectedAffixIds = new Set<MonsterAffixId>();

  for (let index = 0; index < affixCount; index += 1) {
    const affix = pickRandomAffix(eligibleAffixes, selectedAffixIds);

    if (!affix) {
      break;
    }

    selectedAffixes.push(affix);
    selectedAffixIds.add(affix.id);
  }

  return selectedAffixes;
}

export function resolveMonsterAffixesByIds(
  affixIds: string[] | undefined,
): MonsterAffixDefinition[] {
  if (!affixIds || affixIds.length === 0) {
    return [];
  }

  return affixIds
    .map((affixId) => getMonsterAffixById(affixId))
    .filter((affix): affix is MonsterAffixDefinition => Boolean(affix));
}

export function getMonsterAffixNameList(
  affixes: MonsterAffixDefinition[],
): string {
  if (affixes.length === 0) {
    return '';
  }

  return affixes.map((affix) => affix.name).join(', ');
}

export function getAffixedMonsterDisplayName(
  monsterName: string,
  affixes: MonsterAffixDefinition[],
): string {
  if (affixes.length === 0) {
    return monsterName;
  }

  return `${getMonsterAffixNameList(affixes)} ${monsterName}`;
}