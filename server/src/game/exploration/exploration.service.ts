import { BadRequestException, Injectable } from '@nestjs/common';

import { randomInt } from 'crypto';

import { CharacterService } from '../../character/character.service';

import { getExplorationZoneDefinitionById } from './exploration.definitions';

import type { CharacterSnapshot, ItemId } from '../character/character.types';
import type { EncounterId } from '../encounter/encounter.types';
import type {
  ExplorationEncounterPoolEntry,
  ExplorationItemPoolEntry,
  ExplorationOutcomeWeight,
  ExplorationSearchOutcomeType,
  ExplorationSearchResult,
  ExplorationZoneId,
} from './exploration.types';

interface SearchZoneInput {
  characterId: string;
  userId: string;
  zoneId: ExplorationZoneId;
}

interface ExplorationRewardInput {
  moneyBronze?: number;
  items?: Array<{
    itemId: ItemId;
    quantity: number;
  }>;
}

function weightedPick<T extends { weight: number }>(entries: readonly T[]): T {
  const totalWeight = entries.reduce(
    (total, entry) => total + Math.max(0, Math.floor(entry.weight)),
    0,
  );

  if (totalWeight <= 0) {
    throw new BadRequestException('Weighted pool must contain positive weight.');
  }

  const roll = randomInt(1, totalWeight + 1);
  let cursor = 0;

  for (const entry of entries) {
    cursor += Math.max(0, Math.floor(entry.weight));

    if (roll <= cursor) {
      return entry;
    }
  }

  return entries[entries.length - 1];
}

function randomInclusive(min: number, max: number): number {
  const normalizedMin = Math.floor(min);
  const normalizedMax = Math.floor(max);

  if (normalizedMax < normalizedMin) {
    return normalizedMin;
  }

  return randomInt(normalizedMin, normalizedMax + 1);
}

@Injectable()
export class ExplorationService {
  constructor(private readonly characterService: CharacterService) {}

  searchZone(input: SearchZoneInput): ExplorationSearchResult {
    const zone = getExplorationZoneDefinitionById(input.zoneId);
    const outcome = weightedPick<ExplorationOutcomeWeight>(
      zone.outcomeWeights,
    ).outcomeType;

    const reward: ExplorationRewardInput = {};
    const log: string[] = [];

    let message = 'The area is quiet. Nothing responds to your search.';
    let encounterId: EncounterId | undefined;
    let bronzeFound: number | undefined;
    let itemFound: { itemId: ItemId; quantity: number } | undefined;

    if (outcome === 'encounter') {
      const encounter = weightedPick<ExplorationEncounterPoolEntry>(
        zone.encounterPool,
      );

      encounterId = encounter.encounterId;
      message = 'A hostile presence emerges from the area.';
      log.push('Warning: hostile movement detected nearby.');
    }

    if (outcome === 'bronze') {
      bronzeFound = randomInclusive(zone.bronzeReward.min, zone.bronzeReward.max);
      reward.moneyBronze = bronzeFound;
      message = `You found ${bronzeFound} Bronze while searching.`;
      log.push(`Found a small abandoned pouch: +${bronzeFound} Bronze.`);
    }

    if (outcome === 'item') {
      const item = weightedPick<ExplorationItemPoolEntry>(zone.itemPool);
      const quantity = randomInclusive(item.minQuantity, item.maxQuantity);

      itemFound = {
        itemId: item.itemId,
        quantity,
      };
      reward.items = [itemFound];
      message = `You found ${quantity} ${item.itemId}.`;
      log.push(`Recovered material: ${item.itemId} x${quantity}.`);
    }

    if (outcome === 'nothing') {
      log.push('The search turns up no monsters, treasure, or useful traces.');
    }

    const character = this.characterService.applyExplorationSearchResult(
      input.characterId,
      input.userId,
      {
        staminaCost: zone.staminaCost,
        moneyBronze: reward.moneyBronze ?? 0,
        items: reward.items ?? [],
      },
    ) as CharacterSnapshot;

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      outcomeType: outcome as ExplorationSearchOutcomeType,
      message,
      log,
      staminaCost: zone.staminaCost,
      character,
      encounterId,
      bronzeFound,
      itemFound,
    };
  }
}
