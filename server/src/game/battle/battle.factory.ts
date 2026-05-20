import { randomUUID } from 'crypto';

import { INITIAL_TURN_GAUGE_VALUE } from './battle.constants';

import { createInitialTurnOrder } from './battle.calculations';

import type {
  ActiveStatusEffect,
  BattleActorState,
  BattleActorType,
  BattleState,
} from './battle.types';

import type {
  BaseStats,
  CharacterSnapshot,
  CurrentState,
  DerivedStats,
  ResistanceProfile,
} from '../character/character.types';

import type {
  EncounterId,
  EncounterZoneId,
} from '../encounter/encounter.types';

import type { MonsterAiTargetingMode } from '../monster/monster.types';

import type { StatModifier } from '../passive/passive.types';

export type CharacterBattleSnapshot = CharacterSnapshot & {
  resistances?: ResistanceProfile;
};

export interface CreateBattleActorStateInput {
  actorId: string;
  actorType: BattleActorType;

  monsterId?: string;
  aiTargetingMode?: MonsterAiTargetingMode;

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
  actorId?: string;
  monsterId: string;
  aiTargetingMode?: MonsterAiTargetingMode;

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

export function createBattleActorState(
  input: CreateBattleActorStateInput,
): BattleActorState {
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

  return {
    actorId: input.actorId,
    actorType: input.actorType,

    monsterId: input.monsterId,
    aiTargetingMode: input.aiTargetingMode,

    baseStats: input.baseStats,
    derivedStats: input.derivedStats,
    resistances: input.resistances ?? createDefaultResistances(),

    hp,
    mp,
    stamina,

    shield: normalizeNonNegativeInteger(input.shield),
    isExhausted: input.isExhausted ?? stamina <= 0,

    activeStatusEffects: input.activeStatusEffects ?? [],
    activeModifiers: input.activeModifiers ?? [],

    procCountThisTurn: normalizeNonNegativeInteger(input.procCountThisTurn),
  };
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

    activeStatusEffects: [],
    activeModifiers: [],

    procCountThisTurn: 0,
  });
}

export function createBattleActorFromMonsterInput(
  input: CreateBattleActorFromMonsterInput,
): BattleActorState {
  return createBattleActorState({
    actorId: input.actorId ?? input.monsterId,
    actorType: 'monster',

    monsterId: input.monsterId,
    aiTargetingMode: input.aiTargetingMode,

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

    roundNumber: 1,
    turnNumber: 0,
    activeActorId: undefined,

    actors,
    turnOrder,

    randomContext: {
      battleId,
      seed: input.seed ?? battleId,
      rollIndex: 0,
    },

    events: [],

    createdAt: now,
    updatedAt: now,
  };
}
