import type { RoadEventDefinition } from './roadEventTypes';

export const ROAD_EVENT_TRIGGER_SETTINGS = {
  eventChancePercent: 100,
  checkpoints: [32, 64, 88],
} as const;

export const ROAD_EVENTS: RoadEventDefinition[] = [
  {
    id: 'broken_wagon_merchant',
    title: 'Broken Wagon',
    category: 'merchant',
    rarity: 'common',
    description:
      'A worried merchant is stuck beside the road with a broken wagon wheel.',
    triggerText:
      'You notice a merchant waving for help beside a damaged wagon.',
    choices: [
      {
        id: 'help_merchant',
        label: 'Help repair the wagon',
        description:
          'Spend some energy to help the merchant. You may receive a small reward.',
        outcome: {
          energyChange: -8,
          bronzeChange: 12,
          message:
            'You help repair the wagon. The merchant thanks you and gives you 12 Bronze.',
          futureHook: 'merchant',
        },
      },
      {
        id: 'move_on',
        label: 'Move on',
        description:
          'Ignore the wagon and continue toward your destination.',
        outcome: {
          message:
            'You decide not to get involved and continue along the road.',
        },
      },
    ],
    tags: ['merchant', 'road', 'future-shop'],
  },
  {
    id: 'dropped_coin_pouch',
    title: 'Dropped Coin Pouch',
    category: 'reward',
    rarity: 'common',
    description:
      'A small pouch lies near the roadside, half-hidden beneath dry leaves.',
    triggerText:
      'Something catches your eye near the road. It looks like a small coin pouch.',
    choices: [
      {
        id: 'take_pouch',
        label: 'Pick it up',
        description:
          'Take the pouch. For now, this gives a small bronze reward.',
        outcome: {
          bronzeChange: 6,
          message:
            'You pick up the pouch and find 6 Bronze inside.',
          futureHook: 'inventory',
        },
      },
      {
        id: 'leave_pouch',
        label: 'Leave it alone',
        description:
          'Avoid touching unknown belongings and continue traveling.',
        outcome: {
          message:
            'You leave the pouch where it is and continue your journey.',
        },
      },
    ],
    tags: ['reward', 'dropped-item', 'future-inventory'],
  },
  {
    id: 'roadside_shrine',
    title: 'Roadside Shrine',
    category: 'recovery',
    rarity: 'uncommon',
    description:
      'An old shrine stands quietly beside the path. Its surface is covered in faded symbols.',
    triggerText:
      'You find an old roadside shrine radiating a faint peaceful aura.',
    choices: [
      {
        id: 'pray',
        label: 'Offer a short prayer',
        description:
          'Spend a moment at the shrine and recover a small amount of HP and MP.',
        outcome: {
          hpChange: 12,
          mpChange: 6,
          message:
            'You offer a short prayer. A calm warmth restores 12 HP and 6 MP.',
        },
      },
      {
        id: 'ignore_shrine',
        label: 'Ignore the shrine',
        description:
          'Do not stop. Continue moving toward the zone.',
        outcome: {
          message:
            'You ignore the shrine and continue down the road.',
        },
      },
    ],
    tags: ['recovery', 'shrine', 'road'],
  },
  {
    id: 'bandit_scouts',
    title: 'Bandit Scouts',
    category: 'danger',
    rarity: 'uncommon',
    description:
      'Suspicious figures watch the road from a distance. They do not attack yet.',
    triggerText:
      'You spot suspicious figures watching travelers from behind the trees.',
    choices: [
      {
        id: 'take_detour',
        label: 'Take a quiet detour',
        description:
          'Spend energy to avoid possible trouble.',
        outcome: {
          energyChange: -10,
          message:
            'You take a quiet detour and avoid the suspicious figures. It costs you 10 Energy.',
          futureHook: 'ambush',
        },
      },
      {
        id: 'walk_carefully',
        label: 'Walk carefully',
        description:
          'Keep moving while staying alert. No combat happens yet in this foundation version.',
        outcome: {
          message:
            'You walk carefully past the area. The figures do not follow you this time.',
          futureHook: 'combat',
        },
      },
    ],
    tags: ['danger', 'bandit', 'future-ambush'],
  },
  {
    id: 'lost_traveler',
    title: 'Lost Traveler',
    category: 'npc',
    rarity: 'uncommon',
    description:
      'A tired traveler seems to have lost the way back to town.',
    triggerText:
      'A lost traveler approaches you and asks for help finding the main road.',
    choices: [
      {
        id: 'guide_traveler',
        label: 'Guide the traveler',
        description:
          'Spend a little energy to help. This can later become a quest system hook.',
        outcome: {
          energyChange: -5,
          bronzeChange: 10,
          message:
            'You guide the traveler back to the main road. They reward you with 10 Bronze.',
          futureHook: 'quest',
        },
      },
      {
        id: 'give_directions',
        label: 'Give quick directions',
        description:
          'Help without spending much time.',
        outcome: {
          message:
            'You give quick directions and continue your own journey.',
          futureHook: 'quest',
        },
      },
    ],
    tags: ['npc', 'quest', 'road'],
  },
  {
    id: 'strange_tracks',
    title: 'Strange Tracks',
    category: 'future_combat',
    rarity: 'rare',
    description:
      'Unusual tracks cross the road. They may belong to a rare or mutated creature.',
    triggerText:
      'You notice strange tracks cutting across the road. Something unusual passed through here.',
    choices: [
      {
        id: 'inspect_tracks',
        label: 'Inspect the tracks',
        description:
          'For now this only logs a future combat hook. Later it can trigger rare enemies or mini-bosses.',
        outcome: {
          message:
            'You inspect the tracks carefully. This will later become a rare enemy or mini-boss event hook.',
          futureHook: 'rare_enemy',
        },
      },
      {
        id: 'avoid_tracks',
        label: 'Avoid the area',
        description:
          'Do not risk following unknown tracks.',
        outcome: {
          message:
            'You avoid the strange tracks and continue toward your destination.',
        },
      },
    ],
    zoneIds: ['deep_forest', 'ruined_path'],
    tags: ['rare', 'future-combat', 'mutated-enemy'],
  },
];