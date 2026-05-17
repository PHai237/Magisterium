import type {
  BaseStats,
  DamageType,
  DerivedStats,
  ElementType,
  ResistanceProfile,
} from '../character/character.types';

import type {
  EventType,
  ModifierSourceType,
  StatModifier,
} from '../passive/passive.types';

import type { StatusEffectType } from '../status/status.types';

export type BattleActorType = 'character' | 'monster';

export type BattleActionPhase =
  | 'initiation'
  | 'accuracy_check'
  | 'damage_calculation'
  | 'mitigation'
  | 'apply_damage'
  | 'status_effects'
  | 'completed'
  | 'cancelled';

export type BattleEventType =
  | 'ACTION_STARTED'
  | 'ACTION_CANCELLED'
  | 'RESOURCE_CHECK_FAILED'
  | 'RESOURCE_SPENT'
  | 'MISS'
  | 'EVADE'
  | 'HIT'
  | 'CRIT'
  | 'DAMAGE_CALCULATED'
  | 'DAMAGE_MITIGATED'
  | 'DAMAGE_APPLIED'
  | 'SHIELD_GAINED'
  | 'SHIELD_BROKEN'
  | 'STATUS_RESISTED'
  | 'STATUS_APPLIED'
  | 'STATUS_EXPIRED'
  | 'HEAL_APPLIED'
  | 'RESOURCE_RESTORED'
  | 'SECOND_CHANCE_TRIGGERED'
  | 'PROC_TRIGGERED'
  | 'PROC_LIMIT_REACHED'
  | 'EXHAUSTED'
  | 'RECOVERED_FROM_EXHAUSTION'
  | 'ACTOR_DEFEATED'
  | 'TURN_ENDED';

export interface BattleEvent {
  id: string;
  type: BattleEventType;

  phase: BattleActionPhase;

  actorId: string;
  targetId?: string;

  skillId?: string;
  effectId?: string;
  sourceId?: string;

  value?: number;

  damageType?: DamageType;
  elementType?: ElementType;

  statusEffectType?: StatusEffectType;

  message?: string;

  metadata?: Record<string, unknown>;
}

export interface ActiveStatusEffect {
  id: string;
  type: StatusEffectType;

  remainingTurns: number;
  stacks: number;

  sourceActorId?: string;

  modifiers: StatModifier[];
}

export interface BattleActorState {
  actorId: string;
  actorType: BattleActorType;

  baseStats: BaseStats;
  derivedStats: DerivedStats;
  resistances: ResistanceProfile;

  hp: number;
  mp: number;
  stamina: number;

  shield: number;
  isExhausted: boolean;

  activeStatusEffects: ActiveStatusEffect[];
  activeModifiers: StatModifier[];

  procCountThisTurn: number;
}

export interface DerivedStatCalculationInput {
  baseStats: BaseStats;
  modifiers: StatModifier[];
}

export type RandomRollType =
  | 'hit'
  | 'crit'
  | 'evade'
  | 'status'
  | 'second_chance'
  | 'proc'
  | 'drop'
  | 'flee';

export interface BattleRandomContext {
  battleId: string;
  seed: string;
  rollIndex: number;
}

export interface RandomRollLuckScaling {
  enabled: boolean;
  multiplierPerPoint: number;
}

export interface RandomRollRequest {
  type: RandomRollType;

  actorId: string;
  targetId?: string;

  baseChance: number;

  luckScaling?: RandomRollLuckScaling;

  sourceId?: string;
  sourceType?: ModifierSourceType | 'battle_engine';

  eventType?: EventType;

  randomContext: BattleRandomContext;
}

export interface RandomRollResult {
  type: RandomRollType;

  actorId: string;
  targetId?: string;

  baseChance: number;
  finalChance: number;

  roll: number;
  success: boolean;

  randomContext: BattleRandomContext;
}

export interface ProcContext {
  actorId: string;
  turnId: string;

  currentProcCount: number;
  maxProcCount: number;

  sourceProcIds: string[];
}

export interface BattleActionResult {
  phase: BattleActionPhase;

  actorState: BattleActorState;
  targetStates: BattleActorState[];

  events: BattleEvent[];

  randomRolls: RandomRollResult[];

  procContext: ProcContext;
}
