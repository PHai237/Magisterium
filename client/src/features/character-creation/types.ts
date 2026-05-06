export type StatKey = 'STR' | 'INT' | 'VIT' | 'DEX' | 'LUK';

export type DamageType = 'physical' | 'magical' | 'pure';

export type ElementType =
  | 'neutral'
  | 'fire'
  | 'water'
  | 'wind'
  | 'earth'
  | 'light'
  | 'dark';

export type ResistanceKey = DamageType | ElementType;

export type ResistanceProfile = Partial<Record<ResistanceKey, number>>;

export type ResourceType = 'HP' | 'MP' | 'Energy';

export type SkillFamily = 'weapon' | 'spell' | 'support' | 'utility';

export type SkillTargetType =
  | 'enemy_single'
  | 'self';

export type SkillRuneSlotType = 'power' | 'element' | 'utility';

export type SkillRuneEffect =
  | {
      type: 'flat_power_bonus';
      value: number;
    }
  | {
      type: 'power_multiplier_bonus';
      value: number;
    }
  | {
      type: 'resource_cost_delta';
      value: number;
    }
  | {
      type: 'crit_rate_bonus';
      value: number;
    }
  | {
      type: 'element_override';
      value: ElementType;
    }
  | {
      type: 'damage_type_override';
      value: DamageType;
    }
  | {
      type: 'lifesteal_percent';
      value: number;
    }
  | {
      type: 'shield_on_damage_percent';
      value: number;
    };

export interface SkillRuneDefinition {
  id: string;
  name: string;
  description: string;
  slotType: SkillRuneSlotType;
  effects: SkillRuneEffect[];
  tags: string[];
}

export interface SkillModifierProfile {
  flatPowerBonus: number;
  powerMultiplierBonus: number;
  resourceCostDelta: number;
  critRateBonus: number;
  elementOverride: ElementType | null;
  damageTypeOverride: DamageType | null;
  lifestealPercent: number;
  shieldOnDamagePercent: number;
}

export type ActionType = 'basic_attack' | 'physical_skill' | 'magical_spell';

export type ActionCategory = 'offensive' | 'defensive' | 'utility';

export type EffectType =
  | 'damage'
  | 'heal'
  | 'shield'
  | 'buff'
  | 'debuff'
  | 'status_effect';

export type ClassId = 'warrior' | 'mage' | 'archer' | 'rogue' | 'healer';

export type GiftId = 'stale_bread' | 'guide_book' | 'small_pouch';

export type StarterGiftEffectType =
  | 'post_battle_heal_percent'
  | 'weapon_mastery_bonus'
  | 'starting_money'
  | 'starting_gold';

export interface BaseStats {
  STR: number;
  INT: number;
  VIT: number;
  DEX: number;
  LUK: number;
}

export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  maxEnergy: number;
  defense: number;
  damageReduction: number;
  actionSpeed: number;
  critRate: number;
  dropRateBonus: number;
}

export interface CurrentState {
  hp: number;
  mp: number;
  energy: number;
  shield: number;
}

export interface PassiveDefinition {
  id: string;
  name: string;
  description: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  actionType: ActionType;
  actionCategory: ActionCategory;
  effectType: EffectType;
  damageType: DamageType | null;
  elementType: ElementType | null;
  skillFamily?: SkillFamily;
  targetType?: SkillTargetType;
  runeSlots?: SkillRuneSlotType[];
  attachedRuneIds?: string[];
  scalingStat: StatKey | null;
  baseValue: number;
  multiplier: number;
  resourceType: ResourceType | null;
  resourceCost: number;
  tags: string[];
}

export interface StarterGiftDefinition {
  id: GiftId;
  name: string;
  description: string;
  effectType: StarterGiftEffectType;
  effectValue: number;
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  description: string;
  statBonus: BaseStats;
  passive: PassiveDefinition;
  starterSkills: SkillDefinition[];
}

export interface Character {
  id: string;
  version: number;
  name: string;
  classId: ClassId;
  className: string;
  level: number;
  exp: number;
  moneyBronze: number;
  baseStats: BaseStats;
  derivedStats: DerivedStats;
  currentState: CurrentState;
  passive: PassiveDefinition;
  skills: SkillDefinition[];
  starterGift: StarterGiftDefinition;
  createdAt: string;
}