import type {
  ResistanceKey,
  ResistanceProfile,
} from '../character-creation/types';
import {
  applyMonsterAffixes,
  resolveMonsterAffixesByIds,
} from '../monster-affix/monsterAffixCalculations';
import type { MonsterBattleState } from '../monster/monsterTypes';

import { getPendingEncounterModifierById } from './encounterModifierConstants';
import type {
  ActivePendingEncounterModifier,
  PendingEncounterModifierDefinition,
  PendingEncounterModifierId,
  PendingEncounterRewardModifiers,
  PendingEncounterStatModifiers,
} from './encounterModifierTypes';

export function createEncounterModifierInstanceId(prefix: string): string {
  if (crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createActivePendingEncounterModifier(
  definition: PendingEncounterModifierDefinition,
): ActivePendingEncounterModifier {
  return {
    ...definition,
    instanceId: createEncounterModifierInstanceId('pending_encounter_modifier'),
    createdAt: new Date().toISOString(),
  };
}

export function createActivePendingEncounterModifierById(
  modifierId: PendingEncounterModifierId | string,
): ActivePendingEncounterModifier | null {
  const definition = getPendingEncounterModifierById(modifierId);

  if (!definition) {
    return null;
  }

  return createActivePendingEncounterModifier(definition);
}

export function createActivePendingEncounterModifiersByIds(
  modifierIds: string[] | undefined,
): ActivePendingEncounterModifier[] {
  if (!modifierIds || modifierIds.length === 0) {
    return [];
  }

  return modifierIds
    .map((modifierId) => createActivePendingEncounterModifierById(modifierId))
    .filter(
      (
        modifier,
      ): modifier is ActivePendingEncounterModifier => Boolean(modifier),
    );
}

function applyFlatAndPercentModifier(params: {
  baseValue: number;
  flat?: number;
  percent?: number;
  minimum?: number;
}): number {
  const valueAfterFlat = params.baseValue + (params.flat ?? 0);
  const valueAfterPercent = valueAfterFlat * (1 + (params.percent ?? 0));

  return Math.max(params.minimum ?? 0, Math.round(valueAfterPercent));
}

function applyPendingStatModifiers(
  monster: MonsterBattleState,
  modifiers: PendingEncounterStatModifiers | undefined,
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

function applyPendingRewardModifiers(
  monster: MonsterBattleState,
  modifiers: PendingEncounterRewardModifiers | undefined,
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

export function applyPendingEncounterModifier(
  monster: MonsterBattleState,
  modifier: ActivePendingEncounterModifier,
): MonsterBattleState {
  const forcedAffixIds = modifier.forcedAffixIds ?? [];
  const bonusAffixIds = modifier.bonusAffixIds ?? [];
  const modifierAffixes = resolveMonsterAffixesByIds([
    ...forcedAffixIds,
    ...bonusAffixIds,
  ]);

  const monsterWithModifierAffixes =
    modifierAffixes.length > 0
      ? applyMonsterAffixes(
          {
            ...monster,
            affixes: [...monster.affixes, ...modifierAffixes],
          },
          modifierAffixes,
        )
      : monster;

  const monsterAfterStats = applyPendingStatModifiers(
    monsterWithModifierAffixes,
    modifier.statModifiers,
  );

  const monsterAfterDamageProfile: MonsterBattleState = {
    ...monsterAfterStats,
    damageType: modifier.damageTypeOverride ?? monsterAfterStats.damageType,
    elementType: modifier.elementTypeOverride ?? monsterAfterStats.elementType,
    resistances: mergeResistanceProfiles(
      monsterAfterStats.resistances,
      modifier.resistanceModifiers,
    ),
    tags: [...new Set([...monsterAfterStats.tags, ...modifier.tags])],
  };

  return applyPendingRewardModifiers(
    monsterAfterDamageProfile,
    modifier.rewardModifiers,
  );
}

export function applyPendingEncounterModifiersToMonster(
  monster: MonsterBattleState,
  modifiers: ActivePendingEncounterModifier[],
): MonsterBattleState {
  if (modifiers.length === 0) {
    return monster;
  }

  return modifiers.reduce((currentMonster, modifier) => {
    return applyPendingEncounterModifier(currentMonster, modifier);
  }, monster);
}

export function getPendingEncounterModifierNameList(
  modifiers: ActivePendingEncounterModifier[],
): string {
  if (modifiers.length === 0) {
    return '';
  }

  return modifiers.map((modifier) => modifier.name).join(', ');
}

export function consumePendingEncounterModifiers(
  modifiers: ActivePendingEncounterModifier[],
): {
  consumedModifiers: ActivePendingEncounterModifier[];
  remainingModifiers: ActivePendingEncounterModifier[];
} {
  return {
    consumedModifiers: modifiers,
    remainingModifiers: [],
  };
}