import type {
  BaseStats,
  DamageType,
  DerivedStats,
  ElementType,
  ResistanceProfile,
  ResourceType,
  SkillId,
} from '../character/character.types';

import type {
  EncounterId,
  EncounterZoneId,
} from '../encounter/encounter.types';

import type {
  EventType,
  ModifierSourceType,
  StatModifier,
} from '../passive/passive.types';

import type { StatusEffectType } from '../status/status.types';

import type { MonsterAiTargetingMode } from '../monster/monster.types';

export type BattleActorType = 'character' | 'monster';

export type BattleStatus =
  | 'created'
  | 'in_progress'
  | 'victory'
  | 'defeat'
  | 'escaped'
  | 'cancelled';

export type BattleActionPhase =
  | 'initiation'
  | 'resource_check'
  | 'accuracy_check'
  | 'damage_calculation'
  | 'mitigation'
  | 'apply_damage'
  | 'status_effects'
  | 'completed'
  | 'cancelled';

export type BattleEventType =
  | 'BATTLE_STARTED'
  | 'ROUND_STARTED'
  | 'TURN_STARTED'
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
  | 'SHIELD_DAMAGED'
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
  | 'CONTROL_FORCED'
  | 'ACTOR_DEFEATED'
  | 'TURN_ENDED'
  | 'ROUND_ENDED'
  | 'BATTLE_ENDED';

export interface BattleEvent {
  id: string;
  type: BattleEventType;

  phase: BattleActionPhase;

  actorId: string;
  targetId?: string;

  skillId?: SkillId;
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

  monsterId?: string;
  aiTargetingMode?: MonsterAiTargetingMode;

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

export interface BattleTurnOrderEntry {
  actorId: string;
  actionSpeed: number;
  initiative: number;
  turnGauge: number;
  hasActedThisRound: boolean;
}

export interface BattleState {
  battleId: string;
  status: BattleStatus;

  encounterId?: EncounterId;
  zoneId?: EncounterZoneId;

  roundNumber: number;
  turnNumber: number;
  activeActorId?: string;

  actors: Record<string, BattleActorState>;
  turnOrder: BattleTurnOrderEntry[];

  randomContext: BattleRandomContext;

  events: BattleEvent[];

  createdAt: string;
  updatedAt: string;
}

export type BattleActionType =
  | 'basic_attack'
  | 'use_skill'
  | 'guard'
  | 'use_item'
  | 'flee'
  | 'skip_turn';

export interface BattleActionCommand {
  battleId: string;

  actorId: string;
  targetIds: string[];

  actionType: BattleActionType;

  skillId?: SkillId;
  itemId?: string;
}

export interface BattleResourceCost {
  resourceType: ResourceType;
  amount: number;
}

export interface BattleResourceCheckResult {
  canPay: boolean;
  missingResources: BattleResourceCost[];
}

export interface DamageCalculationInput {
  attacker: BattleActorState;
  defender: BattleActorState;

  damageType: DamageType;
  elementType?: ElementType;

  basePower: number;
  scalingValue: number;

  isCritical: boolean;
}

export interface DamageCalculationResult {
  rawDamage: number;

  damageAfterDefense: number;
  damageAfterResistance: number;

  absorbedAmount: number;
  finalDamage: number;

  damageType: DamageType;
  elementType?: ElementType;

  isCritical: boolean;
  isTrueDamage: boolean;

  wasFullyBlocked: boolean;
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
  | 'flee'
  | 'damage_variance';

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

  luckValue?: number;
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
