import type {
  Character,
  MonsterKnowledgeRecord,
} from '../character/character.types';
import type { BattleRewardSummary } from '../reward/reward.types';

export function recordClaimedBattleKnowledge(
  character: Character,
  reward: BattleRewardSummary,
  claimedAt: string,
): MonsterKnowledgeRecord[] {
  const knowledgeByMonsterId = new Map(
    (character.monsterKnowledge ?? []).map((record) => [
      record.monsterId,
      {
        ...record,
        discoveredDropItemIds: [...record.discoveredDropItemIds],
      },
    ]),
  );

  const defeatedCountByMonsterId = new Map<string, number>();
  for (const defeatedMonster of reward.defeatedMonsters) {
    defeatedCountByMonsterId.set(
      defeatedMonster.monsterId,
      (defeatedCountByMonsterId.get(defeatedMonster.monsterId) ?? 0) + 1,
    );
  }

  for (const [monsterId, defeatedCount] of defeatedCountByMonsterId) {
    const existing = knowledgeByMonsterId.get(monsterId);
    const discoveredDropItemIds = new Set(
      existing?.discoveredDropItemIds ?? [],
    );

    for (const lootRoll of reward.lootRolls) {
      if (
        lootRoll.monsterId === monsterId &&
        lootRoll.dropped &&
        lootRoll.quantity > 0
      ) {
        discoveredDropItemIds.add(lootRoll.itemId);
      }
    }

    knowledgeByMonsterId.set(monsterId, {
      monsterId,
      defeatCount: (existing?.defeatCount ?? 0) + defeatedCount,
      discoveredDropItemIds: Array.from(discoveredDropItemIds),
      firstDefeatedAt: existing?.firstDefeatedAt ?? claimedAt,
      lastDefeatedAt: claimedAt,
    });
  }

  return Array.from(knowledgeByMonsterId.values());
}
