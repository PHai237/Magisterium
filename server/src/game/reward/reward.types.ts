import type { ItemId } from '../character/character.types';

import type {
  MonsterId,
  MonsterRewardDefinition,
} from '../monster/monster.types';

export interface RewardItemStack {
  itemId: ItemId;
  quantity: number;
}

export interface DefeatedMonsterRewardSource {
  actorId: string;
  monsterId: MonsterId;
}

export interface DefeatedMonsterRewardInput extends DefeatedMonsterRewardSource {
  reward: MonsterRewardDefinition;
}

export interface LootRollResult {
  actorId: string;
  monsterId: MonsterId;

  itemId: ItemId;

  chancePercent: number;
  rollPercent: number;

  dropped: boolean;

  quantity: number;

  minQuantity: number;
  maxQuantity: number;

  quantityRollPercent?: number;
}

export interface BattleRewardCalculationInput {
  battleId: string;
  seed: string;

  defeatedMonsters: DefeatedMonsterRewardInput[];
}

export interface BattleRewardSummary {
  moneyBronze: number;

  items: RewardItemStack[];

  defeatedMonsters: DefeatedMonsterRewardSource[];

  lootRolls: LootRollResult[];
}

export interface AppliedBattleRewardResult {
  reward: BattleRewardSummary;
}
