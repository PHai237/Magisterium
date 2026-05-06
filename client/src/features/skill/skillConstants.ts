import type { SkillRuneDefinition } from '../character-creation/types';

export const SKILL_RUNES: SkillRuneDefinition[] = [
  {
    id: 'ember_rune',
    name: 'Ember Rune',
    description:
      'Adds fire alignment to a skill and slightly increases its power.',
    slotType: 'element',
    effects: [
      {
        type: 'element_override',
        value: 'fire',
      },
      {
        type: 'power_multiplier_bonus',
        value: 0.1,
      },
    ],
    tags: ['fire', 'element', 'damage'],
  },
  {
    id: 'aqua_rune',
    name: 'Aqua Rune',
    description:
      'Adds water alignment to a skill and slightly reduces its resource cost.',
    slotType: 'element',
    effects: [
      {
        type: 'element_override',
        value: 'water',
      },
      {
        type: 'resource_cost_delta',
        value: -2,
      },
    ],
    tags: ['water', 'element', 'efficiency'],
  },
  {
    id: 'keen_rune',
    name: 'Keen Rune',
    description:
      'Increases critical chance, but makes the skill slightly more expensive.',
    slotType: 'utility',
    effects: [
      {
        type: 'crit_rate_bonus',
        value: 5,
      },
      {
        type: 'resource_cost_delta',
        value: 2,
      },
    ],
    tags: ['crit', 'utility'],
  },
  {
    id: 'draining_rune',
    name: 'Draining Rune',
    description:
      'Converts part of damage dealt into self-healing.',
    slotType: 'utility',
    effects: [
      {
        type: 'lifesteal_percent',
        value: 0.1,
      },
      {
        type: 'resource_cost_delta',
        value: 3,
      },
    ],
    tags: ['lifesteal', 'sustain'],
  },
  {
    id: 'warding_rune',
    name: 'Warding Rune',
    description:
      'Converts part of damage dealt into temporary shield.',
    slotType: 'utility',
    effects: [
      {
        type: 'shield_on_damage_percent',
        value: 0.15,
      },
      {
        type: 'resource_cost_delta',
        value: 2,
      },
    ],
    tags: ['shield', 'utility'],
  },
  {
    id: 'force_rune',
    name: 'Force Rune',
    description:
      'Adds flat power to a skill without changing its element.',
    slotType: 'power',
    effects: [
      {
        type: 'flat_power_bonus',
        value: 5,
      },
    ],
    tags: ['power', 'damage'],
  },
];

export function getSkillRuneById(
  runeId: string,
): SkillRuneDefinition | null {
  return SKILL_RUNES.find((rune) => rune.id === runeId) ?? null;
}