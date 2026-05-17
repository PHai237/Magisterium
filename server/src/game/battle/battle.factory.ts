import { randomUUID } from 'crypto';

import {
  createInitialTurnOrder,
  updateExhaustionState,
} from './battle.calculations';

import type {
  ActiveStatusEffect,
  BattleActorState,
  BattleActorType,
  BattleState,
  BattleStatus,
} from './battle.types';

import type {
  BaseStats,
  CharacterSnapshot,
  CurrentState,
  DerivedStats,
  ResistanceProfile,
} from '../character/character.types';

import type { StatModifier } from '../passive/passive.types';

export type CharacterBattleSnapshot = CharacterSnapshot & {
  resistances?: ResistanceProfile;
};

export interface CreateBattleActorInput {
  actorId: string;
  actorType: BattleActorType;

  baseStats: BaseStats;
  derivedStats: DerivedStats;

  resistances?: ResistanceProfile;

  currentState?: Partial<CurrentState>;

  shield?: number;
  isExhausted?: boolean;

  activeStatusEffects?: ActiveStatusEffect[];
  activeModifiers?: StatModifier[];

  procCountThisTurn?: number;
}

export interface CreateMonsterBattleActorInput {
  monsterId: string;

  baseStats: BaseStats;
  derivedStats: DerivedStats;

  resistances?: ResistanceProfile;

  currentState?: Partial<CurrentState>;

  shield?: number;
  activeStatusEffects?: ActiveStatusEffect[];
  activeModifiers?: StatModifier[];
}

export interface CreateBattleStateInput {
  battleId?: string;
  seed?: string;

  status?: BattleStatus;

  actors: BattleActorState[];
}

function toSafeInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.floor(value);
}

function clampResource(
  value: number | undefined,
  fallback: number,
  maxValue: number,
): number {
  const safeValue = toSafeInteger(value, fallback);

  return Math.min(Math.max(safeValue, 0), maxValue);
}

function assertUniqueActorIds(actors: BattleActorState[]): void {
  const seenActorIds = new Set<string>();

  for (const actor of actors) {
    if (seenActorIds.has(actor.actorId)) {
      throw new Error(`Duplicate battle actor id: ${actor.actorId}`);
    }

    seenActorIds.add(actor.actorId);
  }
}

function buildActorRecord(
  actors: BattleActorState[],
): Record<string, BattleActorState> {
  return actors.reduce<Record<string, BattleActorState>>((record, actor) => {
    record[actor.actorId] = actor;

    return record;
  }, {});
}

export function createBattleActorState(
  input: CreateBattleActorInput,
): BattleActorState {
  const currentState = input.currentState ?? {};

  const actor: BattleActorState = {
    actorId: input.actorId,
    actorType: input.actorType,

    baseStats: input.baseStats,
    derivedStats: input.derivedStats,
    resistances: input.resistances ?? {},

    hp: clampResource(
      currentState.hp,
      input.derivedStats.maxHp,
      input.derivedStats.maxHp,
    ),
    mp: clampResource(
      currentState.mp,
      input.derivedStats.maxMp,
      input.derivedStats.maxMp,
    ),
    stamina: clampResource(
      currentState.stamina,
      input.derivedStats.maxStamina,
      input.derivedStats.maxStamina,
    ),

    shield: Math.max(0, toSafeInteger(input.shield, 0)),
    isExhausted: input.isExhausted ?? false,

    activeStatusEffects: input.activeStatusEffects ?? [],
    activeModifiers: input.activeModifiers ?? [],

    procCountThisTurn: Math.max(0, toSafeInteger(input.procCountThisTurn, 0)),
  };

  return updateExhaustionState(actor);
}

export function createBattleActorFromCharacterSnapshot(
  character: CharacterBattleSnapshot,
): BattleActorState {
  return createBattleActorState({
    actorId: character.id,
    actorType: 'character',

    baseStats: character.baseStats,
    derivedStats: character.derivedStats,

    resistances: character.resistances ?? {},

    currentState: character.currentState,

    shield: 0,
    isExhausted: false,

    activeStatusEffects: [],
    activeModifiers: [],

    procCountThisTurn: 0,
  });
}

export function createBattleActorFromMonsterInput(
  input: CreateMonsterBattleActorInput,
): BattleActorState {
  return createBattleActorState({
    actorId: input.monsterId,
    actorType: 'monster',

    baseStats: input.baseStats,
    derivedStats: input.derivedStats,

    resistances: input.resistances ?? {},

    currentState: input.currentState,

    shield: input.shield ?? 0,
    isExhausted: false,

    activeStatusEffects: input.activeStatusEffects ?? [],
    activeModifiers: input.activeModifiers ?? [],

    procCountThisTurn: 0,
  });
}

export function createBattleState(input: CreateBattleStateInput): BattleState {
  if (input.actors.length === 0) {
    throw new Error('Cannot create a battle without actors.');
  }

  assertUniqueActorIds(input.actors);

  const battleId = input.battleId ?? randomUUID();
  const now = new Date().toISOString();

  const actorRecord = buildActorRecord(input.actors);
  const turnOrder = createInitialTurnOrder(input.actors);

  return {
    battleId,
    status: input.status ?? 'created',

    roundNumber: 1,
    turnNumber: 0,
    activeActorId: undefined,

    actors: actorRecord,
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
