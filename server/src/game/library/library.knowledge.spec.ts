import type { Character } from '../character/character.types';
import type { BattleRewardSummary } from '../reward/reward.types';
import { recordClaimedBattleKnowledge } from './library.knowledge';

describe('library knowledge', () => {
  it('unlocks defeated monsters and only records successfully claimed drops', () => {
    const character = {
      monsterKnowledge: [],
    } as unknown as Character;
    const reward: BattleRewardSummary = {
      moneyBronze: 2,
      items: [{ itemId: 'slime_gel', quantity: 1 }],
      defeatedMonsters: [{ actorId: 'slime_1', monsterId: 'slime' }],
      lootRolls: [
        {
          actorId: 'slime_1',
          monsterId: 'slime',
          itemId: 'slime_gel',
          chancePercent: 60,
          rollPercent: 10,
          dropped: true,
          quantity: 1,
          minQuantity: 1,
          maxQuantity: 2,
        },
        {
          actorId: 'slime_1',
          monsterId: 'slime',
          itemId: 'slime_core',
          chancePercent: 5,
          rollPercent: 90,
          dropped: false,
          quantity: 0,
          minQuantity: 1,
          maxQuantity: 1,
        },
      ],
    };

    expect(
      recordClaimedBattleKnowledge(
        character,
        reward,
        '2026-06-23T00:00:00.000Z',
      ),
    ).toEqual([
      {
        monsterId: 'slime',
        defeatCount: 1,
        discoveredDropItemIds: ['slime_gel'],
        firstDefeatedAt: '2026-06-23T00:00:00.000Z',
        lastDefeatedAt: '2026-06-23T00:00:00.000Z',
      },
    ]);
  });

  it('merges repeat claims without duplicating discovered drops', () => {
    const character = {
      monsterKnowledge: [
        {
          monsterId: 'slime',
          defeatCount: 1,
          discoveredDropItemIds: ['slime_gel'],
          firstDefeatedAt: '2026-06-22T00:00:00.000Z',
          lastDefeatedAt: '2026-06-22T00:00:00.000Z',
        },
      ],
    } as unknown as Character;
    const reward: BattleRewardSummary = {
      moneyBronze: 2,
      items: [{ itemId: 'slime_gel', quantity: 1 }],
      defeatedMonsters: [{ actorId: 'slime_2', monsterId: 'slime' }],
      lootRolls: [
        {
          actorId: 'slime_2',
          monsterId: 'slime',
          itemId: 'slime_gel',
          chancePercent: 60,
          rollPercent: 10,
          dropped: true,
          quantity: 1,
          minQuantity: 1,
          maxQuantity: 2,
        },
      ],
    };

    expect(
      recordClaimedBattleKnowledge(
        character,
        reward,
        '2026-06-23T00:00:00.000Z',
      )[0],
    ).toMatchObject({
      defeatCount: 2,
      discoveredDropItemIds: ['slime_gel'],
      firstDefeatedAt: '2026-06-22T00:00:00.000Z',
      lastDefeatedAt: '2026-06-23T00:00:00.000Z',
    });
  });
});
