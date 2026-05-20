import { ENCOUNTER_DEFINITIONS } from './encounter.definitions';

import type {
  EncounterDefinition,
  EncounterId,
  EncounterMonsterGroup,
} from './encounter.types';

import { createMonsterBattleActors } from '../monster/monster.factory';

import type { BattleActorState } from '../battle/battle.types';
import type { CreateMonsterBattleActorInput } from '../monster/monster.types';

const MIN_MONSTERS_PER_GROUP = 1;
const MAX_MONSTERS_PER_GROUP = 10;
const MAX_MONSTERS_PER_ENCOUNTER = 12;

function normalizeMonsterCount(count: number): number {
  if (!Number.isFinite(count)) {
    return MIN_MONSTERS_PER_GROUP;
  }

  return Math.min(
    Math.max(Math.floor(count), MIN_MONSTERS_PER_GROUP),
    MAX_MONSTERS_PER_GROUP,
  );
}

function normalizeInstanceIdPrefix(
  prefix: string | undefined,
  fallback: string,
): string {
  const normalizedPrefix = prefix?.trim().replace(/\s+/g, '_');

  return normalizedPrefix && normalizedPrefix.length > 0
    ? normalizedPrefix
    : fallback;
}

function assertUniqueMonsterInstanceIds(
  monsterInputs: CreateMonsterBattleActorInput[],
): void {
  const seenInstanceIds = new Set<string>();

  for (const monsterInput of monsterInputs) {
    if (!monsterInput.instanceId) {
      continue;
    }

    if (seenInstanceIds.has(monsterInput.instanceId)) {
      throw new Error(
        `Duplicate encounter monster instance id: ${monsterInput.instanceId}`,
      );
    }

    seenInstanceIds.add(monsterInput.instanceId);
  }
}

function assertEncounterMonsterCountLimit(
  encounter: EncounterDefinition,
  monsterInputs: CreateMonsterBattleActorInput[],
): void {
  if (monsterInputs.length === 0) {
    throw new Error(
      `Encounter ${encounter.id} must contain at least one monster.`,
    );
  }

  if (monsterInputs.length > MAX_MONSTERS_PER_ENCOUNTER) {
    throw new Error(
      `Encounter ${encounter.id} creates ${monsterInputs.length} monsters, exceeding the limit of ${MAX_MONSTERS_PER_ENCOUNTER}.`,
    );
  }
}

export function getEncounterDefinitionById(
  encounterId: EncounterId,
): EncounterDefinition {
  const encounter = ENCOUNTER_DEFINITIONS.find(
    (definition) => definition.id === encounterId,
  );

  if (!encounter) {
    throw new Error(`Encounter definition not found: ${encounterId}`);
  }

  return encounter;
}

export function buildEncounterMonsterInputs(
  encounter: EncounterDefinition,
): CreateMonsterBattleActorInput[] {
  const monsterInputs = encounter.monsterGroups.flatMap(
    (group: EncounterMonsterGroup, groupIndex) => {
      const count = normalizeMonsterCount(group.count);

      const instanceIdPrefix = normalizeInstanceIdPrefix(
        group.instanceIdPrefix,
        `${encounter.id}_${group.monsterId}_${groupIndex + 1}`,
      );

      return Array.from({ length: count }, (_, index) => ({
        monsterId: group.monsterId,
        instanceId: `${instanceIdPrefix}_${index + 1}`,
      }));
    },
  );

  assertEncounterMonsterCountLimit(encounter, monsterInputs);
  assertUniqueMonsterInstanceIds(monsterInputs);

  return monsterInputs;
}

export function createEncounterMonsterActors(
  encounter: EncounterDefinition,
): BattleActorState[] {
  return createMonsterBattleActors(buildEncounterMonsterInputs(encounter));
}

export function createEncounterMonsterActorsById(
  encounterId: EncounterId,
): BattleActorState[] {
  return createEncounterMonsterActors(getEncounterDefinitionById(encounterId));
}
