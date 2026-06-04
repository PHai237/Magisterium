import { getEncounterDefinitionById } from '../encounter/encounter.factory';

import { EXPLORATION_ZONE_DEFINITIONS } from './exploration.definitions';

function getZoneEncounterWeights(zoneId: string): Record<string, number> {
  const zone = EXPLORATION_ZONE_DEFINITIONS.find((item) => item.id === zoneId);

  if (!zone) {
    throw new Error(`Missing test zone: ${zoneId}`);
  }

  return Object.fromEntries(
    zone.encounterPool.map((entry) => [entry.encounterId, entry.weight]),
  );
}

describe('exploration zone definitions', () => {
  it('should keep town outskirts to slime, rabbit, and hawk at 40/30/30', () => {
    expect(getZoneEncounterWeights('town_outskirts')).toEqual({
      town_outskirts_slime: 40,
      town_outskirts_rabbit: 30,
      town_outskirts_hawk: 30,
    });
  });

  it('should keep forest edge to boar, wolf, and bear', () => {
    expect(getZoneEncounterWeights('forest_edge')).toEqual({
      forest_edge_boar: 40,
      forest_edge_wolf: 35,
      forest_edge_bear: 25,
    });
  });

  it('should keep abandoned mine to goblin, spider, and ore mite', () => {
    expect(getZoneEncounterWeights('abandoned_mine')).toEqual({
      abandoned_mine_goblin: 35,
      abandoned_mine_spider: 35,
      abandoned_mine_ore_mite: 30,
    });
  });

  it('should only include encounters that belong to their exploration zone', () => {
    for (const zone of EXPLORATION_ZONE_DEFINITIONS) {
      for (const entry of zone.encounterPool) {
        expect(getEncounterDefinitionById(entry.encounterId).zoneId).toBe(
          zone.id,
        );
      }
    }
  });
});
