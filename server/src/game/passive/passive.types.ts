import type {
  DamageType,
  DerivedStats,
  ElementType,
  ResistanceKey,
  StatKey,
} from '../character/character.types';

import type { StatusEffectType } from '../status/status.types';

export type EventType =
  | 'battle_start'
  | 'battle_end'
  | 'round_start'
  | 'round_end'
  | 'turn_start'
  | 'turn_end'
  | 'before_action'
  | 'after_action'
  | 'before_resource_check'
  | 'on_resource_check_failed'
  | 'after_resource_spent'
  | 'before_accuracy_check'
  | 'on_miss'
  | 'on_evade'
  | 'on_hit'
  | 'before_damage_calculation'
  | 'after_damage_calculation'
  | 'before_crit_check'
  | 'on_crit'
  | 'before_mitigation'
  | 'after_mitigation'
  | 'before_damage_applied'
  | 'on_take_damage'
  | 'on_fatal_damage'
  | 'before_status_check'
  | 'on_status_resisted'
  | 'on_status_applied'
  | 'on_exhausted'
  | 'on_recovered_from_exhaustion'
  | 'on_proc_check'
  | 'on_proc_triggered';

export type ModifierOperation = 'add' | 'multiply' | 'override';

export type ModifierValueType = 'flat' | 'percent';

export type ModifierSourceType =
  | 'passive'
  | 'skill'
  | 'rune'
  | 'status'
  | 'equipment';

export type ModifierTarget =
  | StatKey
  | keyof DerivedStats
  | ResistanceKey
  | 'damage_dealt'
  | 'damage_taken'
  | 'healing_done'
  | 'status_chance'
  | 'resource_cost';

export type ModifierValueSource =
  | {
      type: 'constant';
    }
  | {
      type: 'stat_ratio';
      sourceStat: StatKey;
      ratio: number;
      readFrom: 'raw_base_stats';
    }
  | {
      type: 'derived_stat_ratio';
      sourceDerivedStat: keyof DerivedStats;
      ratio: number;
      readFrom: 'raw_derived_stats';
    };

export interface TriggerCondition {
  eventType: EventType;

  chance?: number;

  hpBelowPercent?: number;
  hpAbovePercent?: number;

  staminaBelowPercent?: number;
  staminaAbovePercent?: number;

  requiresStatus?: StatusEffectType;
  requiresElement?: ElementType;
  requiresDamageType?: DamageType;

  cooldownTurns?: number;
}

export interface StatModifier {
  id: string;

  target: ModifierTarget;
  operation: ModifierOperation;
  valueType: ModifierValueType;

  value: number;
  valueSource?: ModifierValueSource;

  priority: number;

  durationTurns?: number;

  stackable?: boolean;
  maxStacks?: number;

  sourceId?: string;
  sourceType?: ModifierSourceType;
}

export interface PassiveDefinition {
  id: string;
  name: string;
  description: string;

  triggerCondition: TriggerCondition;
  modifiers: StatModifier[];

  tags: string[];
}
