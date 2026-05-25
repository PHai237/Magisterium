import type {
  PendingEncounterModifierDefinition,
  PendingEncounterModifierId,
} from './encounterModifierTypes';

export const PENDING_ENCOUNTER_MODIFIERS: PendingEncounterModifierDefinition[] = [
  {
    id: 'ambush_pressure',
    name: 'Ambush Pressure',
    description:
      'The next encounter is more dangerous because enemies are prepared to strike first.',
    sourceType: 'road_event',
    duration: 'next_encounter',
    statModifiers: {
      attackPercent: 0.15,
      actionSpeedFlat: 8,
    },
    rewardModifiers: {
      expMultiplier: 1.1,
      bronzeMultiplier: 1.08,
    },
    tags: ['danger', 'ambush', 'attack', 'speed'],
  },
  {
    id: 'ominous_tracks',
    name: 'Ominous Tracks',
    description:
      'The next encounter may involve a strange empowered enemy influenced by unknown energy.',
    sourceType: 'road_event',
    duration: 'next_encounter',
    bonusAffixIds: ['shadow_touched'],
    rewardModifiers: {
      expMultiplier: 1.15,
      bronzeMultiplier: 1.1,
    },
    tags: ['rare-enemy', 'dark', 'affix'],
  },
  {
    id: 'blessed_path',
    name: 'Blessed Path',
    description:
      'The next monster is weakened by a calm blessing from the road.',
    sourceType: 'road_event',
    duration: 'next_encounter',
    statModifiers: {
      attackPercent: -0.1,
      defensePercent: -0.1,
    },
    resistanceModifiers: {
      light: -0.2,
    },
    rewardModifiers: {
      expMultiplier: 1.05,
      bronzeMultiplier: 1.05,
    },
    tags: ['blessing', 'weaken', 'light'],
  },
  {
    id: 'hunter_trail',
    name: 'Hunter Trail',
    description:
      'You have tracked the next enemy carefully. It becomes easier to exploit physically.',
    sourceType: 'road_event',
    duration: 'next_encounter',
    resistanceModifiers: {
      physical: -0.15,
    },
    rewardModifiers: {
      expMultiplier: 1.08,
      bronzeMultiplier: 1.05,
    },
    tags: ['tracking', 'physical-weakness'],
  },
  {
    id: 'unstable_magic',
    name: 'Unstable Magic',
    description:
      'The next encounter is affected by unstable magic. The monster hits harder but becomes weaker to magic.',
    sourceType: 'road_event',
    duration: 'next_encounter',
    damageTypeOverride: 'magical',
    elementTypeOverride: 'dark',
    statModifiers: {
      attackPercent: 0.15,
      critRateFlat: 3,
    },
    resistanceModifiers: {
      magical: -0.2,
      dark: 0.2,
      light: -0.2,
    },
    rewardModifiers: {
      expMultiplier: 1.18,
      bronzeMultiplier: 1.12,
    },
    tags: ['magic', 'unstable', 'dark'],
  },
  {
    id: 'wealthy_target',
    name: 'Wealthy Target',
    description:
      'The next encounter is likely to carry better coin rewards.',
    sourceType: 'road_event',
    duration: 'next_encounter',
    rewardModifiers: {
      expMultiplier: 1,
      bronzeMultiplier: 1.5,
    },
    tags: ['reward', 'bronze'],
  },
];

export function getPendingEncounterModifierById(
  modifierId: PendingEncounterModifierId | string,
): PendingEncounterModifierDefinition | null {
  return (
    PENDING_ENCOUNTER_MODIFIERS.find(
      (modifier) => modifier.id === modifierId,
    ) ?? null
  );
}