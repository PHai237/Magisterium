import { clamp } from '../character-creation/calculations';
import type { Character } from '../character-creation/types';
import {
  addBronze,
  subtractBronze,
} from '../economy/currencyUtils';
import type { ZoneDefinition } from '../zone/zoneTypes';

import { ROAD_EVENTS } from './roadEventConstants';
import type {
  RoadEventDefinition,
  RoadEventFrequency,
  RoadEventRarity,
  RoadEventChoiceOutcome,
} from './roadEventTypes';

const ROAD_EVENT_CHANCE_BY_FREQUENCY: Record<RoadEventFrequency, number> = {
  low: 14,
  normal: 28,
  high: 44,
};

function rollChance(percent: number): boolean {
  if (percent <= 0) {
    return false;
  }

  if (percent >= 100) {
    return true;
  }

  return Math.random() * 100 < percent;
}

function getRarityWeight(rarity: RoadEventRarity): number {
  if (rarity === 'common') {
    return 60;
  }

  if (rarity === 'uncommon') {
    return 30;
  }

  return 10;
}

function getZoneRoadEventModifier(zone: ZoneDefinition): number {
  let modifier = 0;

  if (zone.difficulty === 'normal') {
    modifier += 4;
  }

  if (zone.difficulty === 'dangerous') {
    modifier += 8;
  }

  if (zone.encounterDensity === 'low') {
    modifier -= 3;
  }

  if (zone.encounterDensity === 'high') {
    modifier += 5;
  }

  if (zone.tags.includes('road')) {
    modifier += 5;
  }

  return modifier;
}

export function getRoadEventChancePercent(
  zone: ZoneDefinition,
  frequency: RoadEventFrequency,
): number {
  const baseChance = ROAD_EVENT_CHANCE_BY_FREQUENCY[frequency];
  const zoneModifier = getZoneRoadEventModifier(zone);

  return clamp(baseChance + zoneModifier, 0, 80);
}

function getEligibleRoadEvents(zone: ZoneDefinition): RoadEventDefinition[] {
  return ROAD_EVENTS.filter((event) => {
    if (!event.zoneIds || event.zoneIds.length === 0) {
      return true;
    }

    return event.zoneIds.includes(zone.id);
  });
}

function pickWeightedRoadEvent(
  events: RoadEventDefinition[],
): RoadEventDefinition | null {
  if (events.length === 0) {
    return null;
  }

  const totalWeight = events.reduce((total, event) => {
    return total + getRarityWeight(event.rarity);
  }, 0);

  let roll = Math.random() * totalWeight;

  for (const event of events) {
    roll -= getRarityWeight(event.rarity);

    if (roll <= 0) {
      return event;
    }
  }

  return events[events.length - 1];
}

export function rollRoadEventForZone(
  zone: ZoneDefinition,
  frequency: RoadEventFrequency = 'normal',
): RoadEventDefinition | null {
  const eventChance = getRoadEventChancePercent(zone, frequency);

  if (!rollChance(eventChance)) {
    return null;
  }

  return pickWeightedRoadEvent(getEligibleRoadEvents(zone));
}

function applyMoneyChange(
  currentBronze: number,
  bronzeChange: number,
): number {
  if (bronzeChange > 0) {
    return addBronze(currentBronze, bronzeChange);
  }

  if (bronzeChange < 0) {
    return subtractBronze(currentBronze, Math.abs(bronzeChange));
  }

  return currentBronze;
}

export function applyRoadEventChoice(
  character: Character,
  outcome: RoadEventChoiceOutcome,
): Character {
  const bronzeChange = outcome.bronzeChange ?? 0;
  const hpChange = outcome.hpChange ?? 0;
  const mpChange = outcome.mpChange ?? 0;
  const energyChange = outcome.energyChange ?? 0;

  return {
    ...character,
    moneyBronze: applyMoneyChange(character.moneyBronze, bronzeChange),
    currentState: {
      ...character.currentState,
      hp: clamp(
        character.currentState.hp + hpChange,
        1,
        character.derivedStats.maxHp,
      ),
      mp: clamp(
        character.currentState.mp + mpChange,
        0,
        character.derivedStats.maxMp,
      ),
      energy: clamp(
        character.currentState.energy + energyChange,
        0,
        character.derivedStats.maxEnergy,
      ),
    },
  };
}