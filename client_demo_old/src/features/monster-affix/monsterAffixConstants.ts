import type {
  MonsterAffixDefinition,
  MonsterAffixId,
} from './monsterAffixTypes';

export const MONSTER_AFFIXES: MonsterAffixDefinition[] = [
  {
    id: 'tough',
    name: 'Tough',
    description: 'This monster has increased maximum HP.',
    tier: 'minor',
    statModifiers: {
      maxHpPercent: 0.25,
    },
    rewardModifiers: {
      expMultiplier: 1.1,
      bronzeMultiplier: 1.1,
    },
    tags: ['durable', 'hp'],
  },
  {
    id: 'fierce',
    name: 'Fierce',
    description: 'This monster has increased attack power.',
    tier: 'minor',
    statModifiers: {
      attackPercent: 0.2,
    },
    rewardModifiers: {
      expMultiplier: 1.1,
      bronzeMultiplier: 1.1,
    },
    tags: ['attack', 'danger'],
  },
  {
    id: 'armored',
    name: 'Armored',
    description: 'This monster has increased defense and physical resistance.',
    tier: 'minor',
    statModifiers: {
      defensePercent: 0.25,
    },
    resistanceModifiers: {
      physical: 0.1,
    },
    rewardModifiers: {
      expMultiplier: 1.12,
      bronzeMultiplier: 1.08,
    },
    tags: ['defense', 'physical-resistant'],
  },
  {
    id: 'swift',
    name: 'Swift',
    description: 'This monster acts faster and has slightly higher crit rate.',
    tier: 'minor',
    statModifiers: {
      actionSpeedFlat: 12,
      critRateFlat: 2,
    },
    rewardModifiers: {
      expMultiplier: 1.08,
      bronzeMultiplier: 1.08,
    },
    tags: ['speed', 'crit'],
  },
  {
    id: 'flame_touched',
    name: 'Flame-Touched',
    description:
      'This monster attacks with fire and has increased fire resistance, but becomes weaker to water.',
    tier: 'major',
    elementTypeOverride: 'fire',
    resistanceModifiers: {
      fire: 0.35,
      water: -0.25,
    },
    rewardModifiers: {
      expMultiplier: 1.18,
      bronzeMultiplier: 1.12,
    },
    tags: ['element', 'fire'],
  },
  {
    id: 'aqua_touched',
    name: 'Aqua-Touched',
    description:
      'This monster attacks with water and has increased water resistance, but becomes weaker to lightning-like wind pressure.',
    tier: 'major',
    elementTypeOverride: 'water',
    resistanceModifiers: {
      water: 0.35,
      wind: -0.2,
      fire: 0.1,
    },
    rewardModifiers: {
      expMultiplier: 1.18,
      bronzeMultiplier: 1.12,
    },
    tags: ['element', 'water'],
  },
  {
    id: 'shadow_touched',
    name: 'Shadow-Touched',
    description:
      'This monster attacks with dark energy and resists dark damage, but becomes weaker to light.',
    tier: 'major',
    elementTypeOverride: 'dark',
    damageTypeOverride: 'magical',
    resistanceModifiers: {
      dark: 0.4,
      light: -0.35,
      magical: 0.1,
    },
    rewardModifiers: {
      expMultiplier: 1.22,
      bronzeMultiplier: 1.15,
    },
    tags: ['element', 'dark', 'magic'],
  },
  {
    id: 'holy_touched',
    name: 'Holy-Touched',
    description:
      'This monster attacks with light energy and resists light damage, but becomes weaker to dark.',
    tier: 'major',
    elementTypeOverride: 'light',
    damageTypeOverride: 'magical',
    resistanceModifiers: {
      light: 0.35,
      dark: -0.3,
      magical: 0.1,
    },
    rewardModifiers: {
      expMultiplier: 1.2,
      bronzeMultiplier: 1.12,
    },
    tags: ['element', 'light', 'magic'],
  },
  {
    id: 'volatile',
    name: 'Volatile',
    description:
      'This monster is unstable: higher attack and crit rate, but lower defense.',
    tier: 'major',
    statModifiers: {
      attackPercent: 0.3,
      defensePercent: -0.2,
      critRateFlat: 4,
    },
    rewardModifiers: {
      expMultiplier: 1.2,
      bronzeMultiplier: 1.15,
    },
    tags: ['attack', 'crit', 'unstable'],
  },
  {
    id: 'giant',
    name: 'Giant',
    description:
      'This monster is larger than usual: much higher HP and attack, but slower.',
    tier: 'major',
    statModifiers: {
      maxHpPercent: 0.45,
      attackPercent: 0.15,
      actionSpeedFlat: -10,
    },
    rewardModifiers: {
      expMultiplier: 1.25,
      bronzeMultiplier: 1.2,
    },
    tags: ['hp', 'attack', 'slow'],
  },
];

export function getMonsterAffixById(
  affixId: MonsterAffixId | string,
): MonsterAffixDefinition | null {
  return MONSTER_AFFIXES.find((affix) => affix.id === affixId) ?? null;
}