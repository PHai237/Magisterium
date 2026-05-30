import { calculateBattleReward } from './reward.calculations';

import type { BattleRewardCalculationInput } from './reward.types';

function createRewardInput(
  overrides: Partial<BattleRewardCalculationInput> = {},
): BattleRewardCalculationInput {
  return {
    battleId: 'battle_reward_test',
    seed: 'reward_seed',

    defeatedMonsters: [
      {
        actorId: 'slime_1',
        monsterId: 'slime',
        reward: {
          exp: 5,
          moneyBronze: 2,
          lootTable: [
            {
              itemId: 'slime_gel',
              chancePercent: 100,
              minQuantity: 1,
              maxQuantity: 2,
            },
          ],
        },
      },
      {
        actorId: 'goblin_1',
        monsterId: 'goblin',
        reward: {
          exp: 12,
          moneyBronze: 6,
          lootTable: [
            {
              itemId: 'goblin_ear',
              chancePercent: 100,
              minQuantity: 1,
              maxQuantity: 1,
            },
          ],
        },
      },
    ],

    ...overrides,
  };
}

describe('reward calculations', () => {
  describe('calculateBattleReward', () => {
    it('should sum exp and bronze from defeated monsters', () => {
      const reward = calculateBattleReward(createRewardInput());

      expect(reward.exp).toBe(17);
      expect(reward.moneyBronze).toBe(8);

      expect(reward.defeatedMonsters).toEqual([
        {
          actorId: 'slime_1',
          monsterId: 'slime',
        },
        {
          actorId: 'goblin_1',
          monsterId: 'goblin',
        },
      ]);
    });

    it('should roll guaranteed loot and aggregate item stacks', () => {
      const reward = calculateBattleReward(createRewardInput());

      expect(reward.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            itemId: 'slime_gel',
          }),
          {
            itemId: 'goblin_ear',
            quantity: 1,
          },
        ]),
      );

      expect(
        reward.items.find((item) => item.itemId === 'slime_gel')?.quantity,
      ).toBeGreaterThanOrEqual(1);

      expect(
        reward.items.find((item) => item.itemId === 'slime_gel')?.quantity,
      ).toBeLessThanOrEqual(2);
    });

    it('should produce deterministic loot rolls for the same battle id and seed', () => {
      const input = createRewardInput();

      const firstReward = calculateBattleReward(input);
      const secondReward = calculateBattleReward(input);

      expect(firstReward).toEqual(secondReward);
    });

    it('should produce different loot rolls when seed changes', () => {
      const firstReward = calculateBattleReward(
        createRewardInput({
          seed: 'reward_seed_1',
        }),
      );

      const secondReward = calculateBattleReward(
        createRewardInput({
          seed: 'reward_seed_2',
        }),
      );

      expect(firstReward.lootRolls).not.toEqual(secondReward.lootRolls);
    });

    it('should not include failed loot drops in item stacks', () => {
      const reward = calculateBattleReward(
        createRewardInput({
          defeatedMonsters: [
            {
              actorId: 'slime_1',
              monsterId: 'slime',
              reward: {
                exp: 5,
                moneyBronze: 2,
                lootTable: [
                  {
                    itemId: 'slime_gel',
                    chancePercent: 0,
                    minQuantity: 1,
                    maxQuantity: 2,
                  },
                ],
              },
            },
          ],
        }),
      );

      expect(reward.items).toEqual([]);

      expect(reward.lootRolls).toEqual([
        expect.objectContaining({
          actorId: 'slime_1',
          monsterId: 'slime',
          itemId: 'slime_gel',
          chancePercent: 0,
          dropped: false,
          quantity: 0,
        }),
      ]);
    });

    it('should aggregate duplicate item drops from multiple monsters', () => {
      const reward = calculateBattleReward(
        createRewardInput({
          defeatedMonsters: [
            {
              actorId: 'slime_1',
              monsterId: 'slime',
              reward: {
                exp: 5,
                moneyBronze: 2,
                lootTable: [
                  {
                    itemId: 'slime_gel',
                    chancePercent: 100,
                    minQuantity: 1,
                    maxQuantity: 1,
                  },
                ],
              },
            },
            {
              actorId: 'slime_2',
              monsterId: 'slime',
              reward: {
                exp: 5,
                moneyBronze: 2,
                lootTable: [
                  {
                    itemId: 'slime_gel',
                    chancePercent: 100,
                    minQuantity: 2,
                    maxQuantity: 2,
                  },
                ],
              },
            },
          ],
        }),
      );

      expect(reward.exp).toBe(10);
      expect(reward.moneyBronze).toBe(4);

      expect(reward.items).toEqual([
        {
          itemId: 'slime_gel',
          quantity: 3,
        },
      ]);
    });

    it('should normalize unsafe negative reward numbers', () => {
      const reward = calculateBattleReward(
        createRewardInput({
          defeatedMonsters: [
            {
              actorId: 'slime_1',
              monsterId: 'slime',
              reward: {
                exp: -10,
                moneyBronze: Number.NaN,
                lootTable: [
                  {
                    itemId: 'slime_gel',
                    chancePercent: 150,
                    minQuantity: -5,
                    maxQuantity: -1,
                  },
                ],
              },
            },
          ],
        }),
      );

      expect(reward.exp).toBe(0);
      expect(reward.moneyBronze).toBe(0);

      expect(reward.lootRolls[0]).toMatchObject({
        chancePercent: 100,
        minQuantity: 0,
        maxQuantity: 0,
        dropped: true,
        quantity: 0,
      });

      expect(reward.items).toEqual([]);
    });

    it('should roll one item from a random loot pool', () => {
      const reward = calculateBattleReward(
        createRewardInput({
          defeatedMonsters: [
            {
              actorId: 'slime_1',
              monsterId: 'slime',
              reward: {
                exp: 5,
                moneyBronze: 2,
                lootTable: [],
                randomLootPools: [
                  {
                    id: 'stat_fragment',
                    chancePercent: 100,
                    entries: [
                      {
                        itemId: 'str_fragment',
                        weight: 1,
                        minQuantity: 1,
                        maxQuantity: 1,
                      },
                      {
                        itemId: 'dex_fragment',
                        weight: 1,
                        minQuantity: 1,
                        maxQuantity: 1,
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }),
      );

      expect(reward.lootRolls).toHaveLength(1);
      expect(reward.lootRolls[0]).toEqual(
        expect.objectContaining({
          chancePercent: 100,
          dropped: true,
          quantity: 1,
        }),
      );
      expect(['str_fragment', 'dex_fragment']).toContain(
        reward.lootRolls[0]?.itemId,
      );
      expect(reward.items).toHaveLength(1);
    });

    it('should not drop more than one item from a failed random loot pool', () => {
      const reward = calculateBattleReward(
        createRewardInput({
          defeatedMonsters: [
            {
              actorId: 'slime_1',
              monsterId: 'slime',
              reward: {
                exp: 5,
                moneyBronze: 2,
                lootTable: [],
                randomLootPools: [
                  {
                    id: 'stat_fragment',
                    chancePercent: 0,
                    entries: [
                      {
                        itemId: 'str_fragment',
                        weight: 1,
                        minQuantity: 1,
                        maxQuantity: 1,
                      },
                      {
                        itemId: 'dex_fragment',
                        weight: 1,
                        minQuantity: 1,
                        maxQuantity: 1,
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }),
      );

      expect(reward.lootRolls).toHaveLength(1);
      expect(reward.lootRolls[0]).toEqual(
        expect.objectContaining({
          chancePercent: 0,
          dropped: false,
          quantity: 0,
        }),
      );
      expect(reward.items).toEqual([]);
    });

    it('should support multiple independent rolls from a random loot pool', () => {
      const reward = calculateBattleReward(
        createRewardInput({
          defeatedMonsters: [
            {
              actorId: 'slime_1',
              monsterId: 'slime',
              reward: {
                exp: 5,
                moneyBronze: 2,
                lootTable: [],
                randomLootPools: [
                  {
                    id: 'stat_fragment_bonus_pair',
                    chancePercent: 100,
                    rollCount: 2,
                    entries: [
                      {
                        itemId: 'str_fragment',
                        weight: 1,
                        minQuantity: 1,
                        maxQuantity: 1,
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }),
      );

      expect(reward.lootRolls).toHaveLength(2);
      expect(reward.lootRolls).toEqual([
        expect.objectContaining({
          itemId: 'str_fragment',
          dropped: true,
          quantity: 1,
        }),
        expect.objectContaining({
          itemId: 'str_fragment',
          dropped: true,
          quantity: 1,
        }),
      ]);
      expect(reward.items).toEqual([
        {
          itemId: 'str_fragment',
          quantity: 2,
        },
      ]);
    });
  });
});
