import type {
  DamageType,
  ItemId,
  ResourceType,
} from '../character/character.types';

import type { StatModifier } from '../passive/passive.types';

export type ItemCategory =
  | 'equipment'
  | 'consumable'
  | 'material'
  | 'voucher'
  | 'quest';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type EquipmentSlot =
  | 'weapon'
  | 'off_hand'
  | 'helmet'
  | 'armor'
  | 'legging'
  | 'boots'
  | 'accessory';

export type ConsumableTargetType = 'self' | 'ally';

export interface RestoreResourceItemEffect {
  type: 'restore_resource';
  resourceType: ResourceType;
  amount: number;
}

export interface RestItemEffect {
  type: 'rest';
  hpPercent: number;
  mpPercent: number;
  staminaPercent: number;
  fatigueRecovery?: number;
}

export interface DamageItemEffect {
  type: 'damage';
  damageType: DamageType;
  amount: number;
}

export type ItemUseEffect =
  | RestoreResourceItemEffect
  | RestItemEffect
  | DamageItemEffect;

export interface ConsumableItemDefinition {
  targetType: ConsumableTargetType;
  effects: readonly ItemUseEffect[];
  consumesOnUse: boolean;
  usableInBattle: boolean;
  usableOutOfBattle: boolean;
}

export interface EquipmentItemDefinition {
  slot: EquipmentSlot;
  twoHanded?: boolean;
  modifiers: readonly StatModifier[];
}

export interface ItemDefinition {
  id: ItemId;

  name: string;
  description: string;

  category: ItemCategory;
  rarity: ItemRarity;

  stackable: boolean;
  maxStackSize: number;

  sellPriceBronze: number;

  equipment?: EquipmentItemDefinition;
  consumable?: ConsumableItemDefinition;

  tags: readonly string[];
}
