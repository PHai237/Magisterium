import { Injectable } from '@nestjs/common';

import { CharacterService } from '../../character/character.service';
import { getItemDefinitionById } from '../item/item.registry';
import { ENCOUNTER_DEFINITIONS } from '../encounter/encounter.definitions';
import { getExplorationZoneDefinitionById } from '../exploration/exploration.definitions';
import { MONSTER_DEFINITIONS } from '../monster/monster.definitions';
import type { MonsterId } from '../monster/monster.types';

import type { LibraryBestiaryResult, LibraryDropRecord } from './library.types';

@Injectable()
export class LibraryService {
  constructor(private readonly characterService: CharacterService) {}

  getBestiary(characterId: string, userId: string): LibraryBestiaryResult {
    const character = this.characterService.findByIdForUserScope(
      characterId,
      userId,
    );
    const knowledgeByMonsterId = new Map(
      (character.monsterKnowledge ?? []).map((record) => [
        record.monsterId,
        record,
      ]),
    );
    const monsters = MONSTER_DEFINITIONS.map((monster) => {
      const knowledge = knowledgeByMonsterId.get(monster.id);
      const unlocked = Boolean(knowledge && knowledge.defeatCount > 0);
      const allDropItemIds = this.getMonsterDropItemIds(monster.id);
      const discoveredDropItemIds = new Set(
        knowledge?.discoveredDropItemIds ?? [],
      );

      return {
        monsterId: monster.id,
        unlocked,
        name: unlocked ? monster.name : '???',
        description: unlocked ? monster.description : undefined,
        rank: unlocked ? monster.rank : undefined,
        defeatCount: knowledge?.defeatCount ?? 0,
        zoneNames: unlocked ? this.getMonsterZoneNames(monster.id) : [],
        drops: allDropItemIds.map(
          (itemId): LibraryDropRecord =>
            discoveredDropItemIds.has(itemId)
              ? {
                  itemId,
                  name: getItemDefinitionById(itemId).name,
                  discovered: true,
                }
              : {
                  name: '???',
                  discovered: false,
                },
        ),
      };
    });

    return {
      totalRecords: monsters.length,
      unlockedRecords: monsters.filter((monster) => monster.unlocked).length,
      monsters,
    };
  }

  private getMonsterDropItemIds(monsterId: MonsterId) {
    const monster = MONSTER_DEFINITIONS.find(
      (definition) => definition.id === monsterId,
    );
    if (!monster) return [];

    return Array.from(
      new Set([
        ...monster.reward.lootTable.map((entry) => entry.itemId),
        ...(monster.reward.randomLootPools ?? []).flatMap((pool) =>
          pool.entries.map((entry) => entry.itemId),
        ),
      ]),
    );
  }

  private getMonsterZoneNames(monsterId: MonsterId): string[] {
    const zoneIds = new Set(
      ENCOUNTER_DEFINITIONS.filter((encounter) =>
        encounter.monsterGroups.some((group) => group.monsterId === monsterId),
      ).map((encounter) => encounter.zoneId),
    );

    return Array.from(zoneIds).map(
      (zoneId) => getExplorationZoneDefinitionById(zoneId).name,
    );
  }
}
