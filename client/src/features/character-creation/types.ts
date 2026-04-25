export type StatKey = 'STR' | 'INT' | 'VIT' | 'DEX' | 'LUK';

export type DamageType = 'physical' | 'magical' | 'pure';

export type ResourceType = 'HP' | 'MP' | 'Energy';

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