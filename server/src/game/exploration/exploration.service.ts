import { BadRequestException, Injectable } from '@nestjs/common';

import { randomInt } from 'crypto';

import { CharacterService } from '../../character/character.service';

import { getExplorationZoneDefinitionById } from './exploration.definitions';

import type { ItemId } from '../character/character.types';
import type { EncounterId } from '../encounter/encounter.types';
import type {
  ExplorationEncounterPoolEntry,
  ExplorationItemPoolEntry,
  ExplorationOutcomeWeight,
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

const EXPLORATION_SEARCH_COOLDOWN_MS = 900;

function weightedPick<T extends { weight: number }>(entries: readonly T[]): T {
  const totalWeight = entries.reduce(
    (total, entry) => total + Math.max(0, Math.floor(entry.weight)),
    0,
  );

  if (totalWeight <= 0) {
    throw new BadRequestException(
      'Weighted pool must contain positive weight.',
    );
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
  private readonly nextSearchAvailableAtByScope = new Map<string, number>();

  constructor(private readonly characterService: CharacterService) {}

  completePersistence<T>(result: T): T | Promise<T> {
    return this.characterService.completePersistence(result);
  }

  searchZone(input: SearchZoneInput): ExplorationSearchResult {
    this.assertSearchCooldownAvailable(input);

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
      bronzeFound = randomInclusive(
        zone.bronzeReward.min,
        zone.bronzeReward.max,
      );
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
    );

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      outcomeType: outcome,
      message,
      log,
      staminaCost: zone.staminaCost,
      character,
      encounterId,
      bronzeFound,
      itemFound,
    };
  }

  private assertSearchCooldownAvailable(input: SearchZoneInput): void {
    const cooldownScope = [
      input.userId.trim(),
      input.characterId.trim(),
      input.zoneId,
    ].join(':');
    const now = Date.now();
    const nextAvailableAt =
      this.nextSearchAvailableAtByScope.get(cooldownScope) ?? 0;

    if (now < nextAvailableAt) {
      const retryAfterMs = nextAvailableAt - now;

      throw new BadRequestException(
        `Search is cooling down. Try again in ${Math.ceil(
          retryAfterMs / 1000,
        )}s.`,
      );
    }

    this.nextSearchAvailableAtByScope.set(
      cooldownScope,
      now + EXPLORATION_SEARCH_COOLDOWN_MS,
    );
  }
}
