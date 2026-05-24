import { randomUUID } from 'crypto';

import { INITIAL_TURN_GAUGE_VALUE } from '../battle.constants';

import {
  createInitialTurnOrder,
  updateExhaustionState,
} from '../calculations/battle.calculations';

import type {
  ActiveStatusEffect,
  BattleActorState,
  BattleActorType,
  BattleState,
} from '../battle.types';

import type {
  BaseStats,
  CharacterSnapshot,
  CurrentState,
  DerivedStats,
  ItemId,
  ResistanceProfile,
  SkillId,
} from '../../character/character.types';

import type {
  EncounterId,
  EncounterZoneId,
} from '../../encounter/encounter.types';

import type {
  MonsterAiTargetingMode,
  MonsterId,
} from '../../monster/monster.types';

import type { StatModifier } from '../../passive/passive.types';

export type CharacterBattleSnapshot = CharacterSnapshot & {
  resistances?: ResistanceProfile;
};

export interface CreateBattleActorStateInput {
  actorId: string;
  actorType: BattleActorType;

  monsterId?: MonsterId;
  aiTargetingMode?: MonsterAiTargetingMode;

  skillIds?: SkillId[];
  inventoryItemIds?: ItemId[];
  battleStartInventoryItemIds?: ItemId[];

  baseStats: BaseStats;
  derivedStats: DerivedStats;
  resistances?: ResistanceProfile;

  currentState?: Partial<CurrentState>;

  hp?: number;
  mp?: number;
  stamina?: number;

  shield?: number;
  isExhausted?: boolean;

  activeStatusEffects?: ActiveStatusEffect[];
  activeModifiers?: StatModifier[];

  procCountThisTurn?: number;
}

export interface CreateBattleActorFromMonsterInput {
  actorId: string;
  monsterId: MonsterId;
  aiTargetingMode?: MonsterAiTargetingMode;

  skillIds?: SkillId[];

  baseStats: BaseStats;
  derivedStats: DerivedStats;
  resistances?: ResistanceProfile;

  currentState?: Partial<CurrentState>;

  hp?: number;
  mp?: number;
  stamina?: number;

  shield?: number;
  isExhausted?: boolean;

  activeStatusEffects?: ActiveStatusEffect[];
  activeModifiers?: StatModifier[];

  procCountThisTurn?: number;
}

export interface CreateBattleStateInput {
  battleId?: string;
  seed?: string;

  encounterId?: EncounterId;
  zoneId?: EncounterZoneId;

  ownerUserId?: string;

  actors: BattleActorState[];
}

function createDefaultResistances(): ResistanceProfile {
  return {};
}

function normalizeCurrentResource(
  inputValue: number | undefined,
  fallbackValue: number,
  maxValue: number,
): number {
  const value = inputValue ?? fallbackValue;

  if (!Number.isFinite(value)) {
    return Math.max(0, Math.floor(maxValue));
  }

  return Math.min(
    Math.max(0, Math.floor(value)),
    Math.max(0, Math.floor(maxValue)),
  );
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  if (!Number.isFinite(value ?? 0)) {
    return 0;
  }

  return Math.max(0, Math.floor(value ?? 0));
}

function assertBattleActors(actors: BattleActorState[]): void {
  if (actors.length === 0) {
    throw new Error('Cannot create a battle without actors.');
  }
}

function assertUniqueActorIds(actors: BattleActorState[]): void {
  const actorIds = new Set<string>();

  for (const actor of actors) {
    if (actorIds.has(actor.actorId)) {
      throw new Error(`Duplicate battle actor id: ${actor.actorId}`);
    }

    actorIds.add(actor.actorId);
  }
}

function cloneActiveStatusEffects(
  effects?: ActiveStatusEffect[],
): ActiveStatusEffect[] {
  return effects
    ? effects.map((effect) => ({
        ...effect,
        modifiers: effect.modifiers.map((modifier) => ({
          ...modifier,
        })),
      }))
    : [];
}

function cloneStatModifiers(modifiers?: StatModifier[]): StatModifier[] {
  return modifiers
    ? modifiers.map((modifier) => ({
        ...modifier,
      }))
    : [];
}

function cloneSkillIds(skillIds?: readonly SkillId[]): SkillId[] {
  return skillIds ? [...skillIds] : [];
}

function cloneInventoryItemIds(inventoryItemIds?: readonly ItemId[]): ItemId[] {
  return inventoryItemIds ? [...inventoryItemIds] : [];
}

function assertSupportedActiveCombatState(input: {
  activeStatusEffects?: ActiveStatusEffect[];
  activeModifiers?: StatModifier[];
}): void {
  if ((input.activeStatusEffects?.length ?? 0) > 0) {
    throw new Error(
      'Active status effects are not supported by battle calculations yet.',
    );
  }

  if ((input.activeModifiers?.length ?? 0) > 0) {
    throw new Error(
      'Active modifiers are not supported by battle calculations yet.',
    );
  }
}

export function createBattleActorState(
  input: CreateBattleActorStateInput,
): BattleActorState {
  assertSupportedActiveCombatState(input);

  const hp = normalizeCurrentResource(
    input.hp ?? input.currentState?.hp,
    input.derivedStats.maxHp,
    input.derivedStats.maxHp,
  );

  const mp = normalizeCurrentResource(
    input.mp ?? input.currentState?.mp,
    input.derivedStats.maxMp,
    input.derivedStats.maxMp,
  );

  const stamina = normalizeCurrentResource(
    input.stamina ?? input.currentState?.stamina,
    input.derivedStats.maxStamina,
    input.derivedStats.maxStamina,
  );

  const actor: BattleActorState = {
    actorId: input.actorId,
    actorType: input.actorType,

    monsterId: input.monsterId,
    aiTargetingMode: input.aiTargetingMode,

    skillIds: cloneSkillIds(input.skillIds),
    inventoryItemIds: cloneInventoryItemIds(input.inventoryItemIds),
    battleStartInventoryItemIds: input.battleStartInventoryItemIds
      ? cloneInventoryItemIds(input.battleStartInventoryItemIds)
      : undefined,

    baseStats: input.baseStats,
    derivedStats: input.derivedStats,
    resistances: input.resistances ?? createDefaultResistances(),

    hp,
    mp,
    stamina,

    shield: normalizeNonNegativeInteger(input.shield),
    isExhausted: input.isExhausted ?? stamina <= 0,

    activeStatusEffects: cloneActiveStatusEffects(input.activeStatusEffects),
    activeModifiers: cloneStatModifiers(input.activeModifiers),

    procCountThisTurn: normalizeNonNegativeInteger(input.procCountThisTurn),
  };

  return updateExhaustionState(actor);
}

export function createBattleActorFromCharacterSnapshot(
  character: CharacterBattleSnapshot,
): BattleActorState {
  return createBattleActorState({
    actorId: character.id,
    actorType: 'character',

    skillIds: character.equippedSkillIds,
    inventoryItemIds: character.inventoryItemIds,
    battleStartInventoryItemIds: character.inventoryItemIds,

    baseStats: character.baseStats,
    derivedStats: character.derivedStats,
    resistances: character.resistances ?? {},

    currentState: character.currentState,

    shield: 0,

    activeStatusEffects: [],
    activeModifiers: [],

    procCountThisTurn: 0,
  });
}

export function createBattleActorFromMonsterInput(
  input: CreateBattleActorFromMonsterInput,
): BattleActorState {
  return createBattleActorState({
    actorId: input.actorId,
    actorType: 'monster',

    monsterId: input.monsterId,
    aiTargetingMode: input.aiTargetingMode,

    skillIds: input.skillIds ?? [],
    inventoryItemIds: [],

    baseStats: input.baseStats,
    derivedStats: input.derivedStats,
    resistances: input.resistances ?? {},

    currentState: input.currentState,

    hp: input.hp,
    mp: input.mp,
    stamina: input.stamina,

    shield: input.shield,
    isExhausted: input.isExhausted,

    activeStatusEffects: input.activeStatusEffects ?? [],
    activeModifiers: input.activeModifiers ?? [],

    procCountThisTurn: input.procCountThisTurn ?? 0,
  });
}

export function createBattleState(input: CreateBattleStateInput): BattleState {
  assertBattleActors(input.actors);
  assertUniqueActorIds(input.actors);

  const battleId = input.battleId ?? randomUUID();
  const now = new Date().toISOString();

  const actors = Object.fromEntries(
    input.actors.map((actor) => [actor.actorId, actor]),
  );

  const turnOrder = createInitialTurnOrder(input.actors).map((entry) => ({
    ...entry,
    turnGauge: INITIAL_TURN_GAUGE_VALUE,
  }));

  return {
    battleId,
    status: 'created',

    encounterId: input.encounterId,
    zoneId: input.zoneId,

    ownerUserId: input.ownerUserId,

    roundNumber: 1,
    turnNumber: 0,
    activeActorId: undefined,

    actors,
    turnOrder,

    randomContext: {
      battleId,
      seed: input.seed ?? randomUUID(),
      rollIndex: 0,
    },

    events: [],

    createdAt: now,
    updatedAt: now,
  };
}
