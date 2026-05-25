import { randomBytes } from 'crypto';

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

const MONSTER_INSTANCE_ID_SUFFIX_BYTES = 3;
const MAX_INSTANCE_ID_PREFIX_LENGTH = 48;

const UNSAFE_INSTANCE_ID_PREFIX_PATTERN = /[^A-Za-z0-9_-]+/gu;
const INSTANCE_ID_SEPARATOR_PATTERN = /_+/gu;

function assertUniqueEncounterDefinitions(
  encounterDefinitions: readonly Readonly<EncounterDefinition>[],
): void {
  const seenEncounterIds = new Set<EncounterId>();

  for (const encounterDefinition of encounterDefinitions) {
    if (seenEncounterIds.has(encounterDefinition.id)) {
      throw new Error(
        `Duplicate encounter definition id: ${encounterDefinition.id}`,
      );
    }

    seenEncounterIds.add(encounterDefinition.id);
  }
}

assertUniqueEncounterDefinitions(ENCOUNTER_DEFINITIONS);

const ENCOUNTER_DEFINITION_BY_ID: ReadonlyMap<
  EncounterId,
  Readonly<EncounterDefinition>
> = new Map(
  ENCOUNTER_DEFINITIONS.map((encounterDefinition) => [
    encounterDefinition.id,
    encounterDefinition,
  ]),
);

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
  const rawPrefix = prefix && prefix.trim().length > 0 ? prefix : fallback;

  const normalizedPrefix = rawPrefix
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, '_')
    .replace(UNSAFE_INSTANCE_ID_PREFIX_PATTERN, '_')
    .replace(INSTANCE_ID_SEPARATOR_PATTERN, '_')
    .replace(/^_+|_+$/gu, '')
    .slice(0, MAX_INSTANCE_ID_PREFIX_LENGTH);

  return normalizedPrefix.length > 0 ? normalizedPrefix : fallback;
}

function createMonsterInstanceId(
  instanceIdPrefix: string,
  index: number,
): string {
  const suffix = randomBytes(MONSTER_INSTANCE_ID_SUFFIX_BYTES).toString('hex');

  return `${instanceIdPrefix}_${index + 1}_${suffix}`;
}

function cloneEncounterMonsterGroup(
  group: EncounterMonsterGroup,
): EncounterMonsterGroup {
  return {
    ...group,
  };
}

function cloneEncounterDefinition(
  encounter: Readonly<EncounterDefinition>,
): EncounterDefinition {
  return {
    ...encounter,
    monsterGroups: encounter.monsterGroups.map((group) =>
      cloneEncounterMonsterGroup(group),
    ),
    tags: [...encounter.tags],
  };
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

function calculateEncounterMonsterInputCount(
  encounter: EncounterDefinition,
): number {
  let totalMonsterCount = 0;

  for (const group of encounter.monsterGroups) {
    totalMonsterCount += normalizeMonsterCount(group.count);

    if (totalMonsterCount > MAX_MONSTERS_PER_ENCOUNTER) {
      throw new Error(
        `Encounter ${encounter.id} creates ${totalMonsterCount} monsters, exceeding the limit of ${MAX_MONSTERS_PER_ENCOUNTER}.`,
      );
    }
  }

  return totalMonsterCount;
}

function assertEncounterMonsterCountLimit(
  encounter: EncounterDefinition,
  monsterCount: number,
): void {
  if (monsterCount === 0) {
    throw new Error(
      `Encounter ${encounter.id} must contain at least one monster.`,
    );
  }

  if (monsterCount > MAX_MONSTERS_PER_ENCOUNTER) {
    throw new Error(
      `Encounter ${encounter.id} creates ${monsterCount} monsters, exceeding the limit of ${MAX_MONSTERS_PER_ENCOUNTER}.`,
    );
  }
}

export function getEncounterDefinitionById(
  encounterId: EncounterId,
): EncounterDefinition {
  const encounter = ENCOUNTER_DEFINITION_BY_ID.get(encounterId);

  if (!encounter) {
    throw new Error(`Encounter definition not found: ${encounterId}`);
  }

  return cloneEncounterDefinition(encounter);
}

export function buildEncounterMonsterInputs(
  encounter: EncounterDefinition,
): CreateMonsterBattleActorInput[] {
  const plannedMonsterCount = calculateEncounterMonsterInputCount(encounter);

  assertEncounterMonsterCountLimit(encounter, plannedMonsterCount);

  const monsterInputs: CreateMonsterBattleActorInput[] = [];

  for (const [groupIndex, group] of encounter.monsterGroups.entries()) {
    const count = normalizeMonsterCount(group.count);

    const instanceIdPrefix = normalizeInstanceIdPrefix(
      group.instanceIdPrefix,
      `${encounter.id}_${group.monsterId}_${groupIndex + 1}`,
    );

    for (let index = 0; index < count; index += 1) {
      monsterInputs.push({
        monsterId: group.monsterId,
        instanceId: createMonsterInstanceId(instanceIdPrefix, index),
      });
    }
  }

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
