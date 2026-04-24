import type { PlaceDefinition } from './placeTypes';

export const TAVERN_REST_COST = 5;

export const PLACES: PlaceDefinition[] = [
  {
    id: 'town',
    name: 'Ravenhold Town',
    description:
      'A safe settlement where adventurers recover, prepare, and plan their next journey.',
    unlocked: true,
  },
  {
    id: 'tavern',
    name: 'Silver Cup Tavern',
    description:
      'A warm place to recover your strength before heading back into danger.',
    unlocked: true,
  },
  {
    id: 'clinic',
    name: 'Saint Vale Hospital',
    description:
      'A future recovery and respawn point for more advanced death and retrieval systems.',
    unlocked: false,
  },
  {
    id: 'lost_and_found',
    name: 'Lost & Found Office',
    description:
      'A future service point for reclaiming items recovered after death.',
    unlocked: false,
  }
];